const exppress = require("express");
const multer = require("multer");
const aws = require("aws-sdk");
const amqp = require("amqplib");
const dotenv = require("dotenv");

dotenv.config();

const app = exppress();
const port = 4000;

let uploadResults = [];
let channel = null;
let connection = null;

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10 GB
  storage: multer.memoryStorage(),
});

async function connectToRabbitMQ() {
  let retries = 5;
  while (retries) {
    try {
      connection = await amqp.connect("amqp://rabbitmq");
      channel = await connection.createChannel();
      await channel.assertQueue("fileUploadQueue", { durable: true });
      console.log("Connected to RabbitMQ and waiting for messages.");
      return channel;
    } catch (err) {
      console.log("Error connecting to RabbitMQ, retrying...");
      retries -= 1;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  throw new Error("Unable to connect to RabbitMQ after several attempts");
}

app.post("/upload", upload.array("files", 100), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send("No files uploaded.");
  }
  const fileDetails = {
    files: [],
    totalSize: 0,
    totalFiles: req.files.length,
  };
  const bucketName = process.env.AWS_BUCKET_NAME;
  if (!bucketName) {
    return res
      .status(500)
      .send("AWS_BUCKET_NAME is not set in the environment.");
  }
  try {
    const uploadPromises = req.files.map((file) => {
      const params = {
        Bucket: bucketName,
        Key: `${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      return s3.upload(params).promise();
    });

    console.log("Upload Promises:", uploadPromises);

    uploadResults = await Promise.all(uploadPromises);
    console.log("Upload Results:", uploadResults);
    fileDetails.files.push(...uploadResults);
    fileDetails.totalSize += req.files.reduce(
      (acc, file) => acc + file.size,
      0
    );
    if (!channel || !connection) {
      console.log("Reconnecting to RabbitMQ...");
      await connectToRabbitMQ();
    }
    channel.sendToQueue(
      "fileUploadQueue",
      Buffer.from(JSON.stringify(fileDetails)),
      { persistent: true }
    );

    console.log("File details sent to RabbitMQ");

    res.status(200).send({
      message: "Files uploaded successfully!",
      totalFiles: fileDetails.totalFiles,
      totalSize: fileDetails.totalSize,
      files: fileDetails.files,
    });

    setTimeout(() => {
      channel.close();
      connection.close();
    }, 5000);
  } catch (error) {
    console.error("Error uploading files to S3:", error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
