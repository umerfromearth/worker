import {S3Client} from "@aws-sdk/client-s3";

const s3Client = new S3Client(
    {
        region: "local",
        endpoint: "http://192.168.100.52:9000/",
        credentials: {
            accessKeyId: 'server',
            secretAccessKey: "SERVER_SECRET",
        },
        forcePathStyle: true,
    }
)
export default s3Client;