import express from "express";
import rootRouter from "./routes/root.routes.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import LogsParser from "./utils/blender.mjs";

import { BlobClient, BlockBlobClient } from "@azure/storage-blob";

import amqplib from "amqplib";
const amqpConnection = await amqplib.connect(
  "amqps://nlugenfy:Pj8zRXvoV234TPEQ9Lo0OhAhKhZ1a1PY@gerbil.rmq.cloudamqp.com/nlugenfy",
);
const amqpChannel = await amqpConnection.createChannel();
amqpChannel.prefetch(1);

const app = express();
app.use(rootRouter);


amqpChannel.assertQueue("jobs");
amqpChannel.consume("jobs", async (msg) => {
  console.log("working is listening for jobs");

  const message = JSON.parse(msg.content.toString());
  const quote = message.quote;
  const objectName = quote.job.id;

  console.log(message);

  await downloadBlendFileFromStorageBlob(
    objectName,
    message.blendFileDownloadUrl,
  );

  if (quote.type == "render") {
    const settings = {
      type: quote.job.type,
      width: quote.job.width,
      height: quote.job.height,
      startFrame: quote.job.startFrame,
      endFrame: quote.job.endFrame,
    };
    await renderToStorageBlob(
      objectName,
      settings,
      message.renderFileUploadUrl,
    );
  } else if (quote.type == "estimate-time") {
    console.log("estimating render time");
    let estimatedRenderTime;

    const settings = {
      type: quote.job.type,
      width: quote.job.width,
      height: quote.job.height,
      startFrame: quote.job.startFrame,
      endFrame: quote.job.endFrame,
    };

    estimatedRenderTime = Math.ceil(
      await estimateRenderTime(objectName, settings),
    );
    console.log("estimated render time is", estimatedRenderTime);

    await amqpChannel.assertQueue("quote-requests");
    amqpChannel.sendToQueue(
      "quote-requests",
      Buffer.from(
        JSON.stringify({
          job: {
            ...quote.job,
            estimatedRenderTime,
          },
        }),
      ),
    );
  }
  amqpChannel.ack(msg);
});

async function downloadBlendFileFromStorageBlob(
  objectName,
  blendFileDownloadUrl,
) {
  const blob = new BlobClient(blendFileDownloadUrl);
  const res = await blob.download();
  const ws = fs.createWriteStream("./downloads/" + objectName + ".blend");

  await new Promise((resolve, reject) => {
    res.readableStreamBody.pipe(ws).on("finish", resolve);
  });
}

async function renderToStorageBlob(objectName, settings, renderFileUploadUrl) {
  let start = Date.now();
  console.log("rendering has started");
  const name = await render(objectName, settings);
  console.log("rendering has finsihed");
  let end = Date.now();
  console.log("actual render time is", (end - start) / 1000, "seconds");

  console.log("uploading file to minio");
  const blockBlobClient = new BlockBlobClient(renderFileUploadUrl);
  blockBlobClient.uploadFile(name, {
    blobHTTPHeaders: {
      blobContentType: "image/png",
    },
  });
  console.log("uploaded to blob storage");
}

async function estimateRenderTime(objectName, settings) {
  return new Promise((res, rej) => {
    // calculate estimated time this way as spawing a blender session will also take some time
    // so cannot take time taken from blender logs
    const TOLERANCE = 10;
    let start = Date.now();

    let blender;
    if (settings.type == "frame") {
      blender = spawn("blender", [
        "-b",
        "./downloads/" + objectName + ".blend",
        "-P",
        "./src/utils/res.py",
        "-f",
        "1",
        "--",
        "--width",
        settings.width,
        "--height",
        settings.height,
      ]);
    } else if (settings.type == "animation") {
      console.log("estimate animatino time");
      blender = spawn("blender", [
        "-b",
        "./downloads/" + objectName + ".blend",
        "-P",
        "./src/utils/res.py",
        "-s",
        settings.startFrame,
        "-e",
        settings.endFrame,
        "-a",
        "--",
        "--width",
        settings.width,
        "--height",
        settings.height,
      ]);
    }

    let logs = "";
    blender.stdout.on("data", (data) => {
      logs += data.toString();
      console.log(data.toString());
    });

    blender.on("close", () => {
      let actualEstimate = (Date.now() - start) / 1000;
      let toleratedEstimate =
        actualEstimate + (actualEstimate * TOLERANCE) / 100;
      res(toleratedEstimate);
    });
  });
}

async function render(key, settings) {
  return new Promise((res, rej) => {
    let logs = "";

    let blender;
    if (settings.type == "frame") {
      blender = spawn("blender", [
        "-b",
        "./downloads/" + key + ".blend",
        "-P",
        "./src/utils/res.py",
        "-o",
        "./renders/" + key + "-",
        "-f",
        "0",
        "--",
        "--width",
        settings.width,
        "--height",
        settings.height,
      ]);
    } else if (settings.type == "animation") {
      blender = spawn("blender", [
        "-b",
        "./downloads/" + key,
        "-P",
        "./src/utils/res.py",
        "-o",
        "./renders/" + key + "-",
        "-s",
        settings.startFrame,
        "-e",
        settings.endFrame,
        "-a",
        "--",
        "--width",
        settings.width,
        "--height",
        settings.height,
      ]);
    }

    blender.on("close", () => {
      const parser = new LogsParser(logs);
      const render = parser.parse();

      if (settings.type == "frame") {
        res(render.savedTo);
      } else if (settings.type == "animation") {
        const ffmpeg = spawn("ffmpeg", [
          "-framerate",
          "30",
          "-i",
          "./renders/" + key + "-%04d.png",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "./renders/" + key + ".mp4",
        ]);

        console.log(ffmpeg);

        ffmpeg.stderr.on("data", (data) => {
          console.log(data.toString());
        });

        ffmpeg.on("close", () => {
          res("./renders/" + key + ".mp4");
        });
      }
    });

    blender.stdout.on("data", (data) => {
      logs += data.toString();
      console.log(data.toString());
    });
  });
}
