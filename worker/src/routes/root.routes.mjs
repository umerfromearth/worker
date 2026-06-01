import express from "express";
import { exec } from "node:child_process";

const router = express.Router();

router.get("/", (req, res) => {
  exec("echo 'hello, world'", (err, stdout, stderr) => {
    console.log(stdout);
  });

  res.send({
    status: "up and working",
  });
});

export default router;
