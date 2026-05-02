import express from "express";
import { createServer } from "node:http";

import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";

import cors from "cors";
import userRoutes from "./routes/users.routes.js";

/*Express server → handles REST API requests
Socket.IO server → handles realtime connections */

const app = express();
const server =
  createServer(
    app,
  ); /*It wraps your Express app into a real server that can listen on a port and handle incoming requests*/
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
/*These last two lines are middleware configuration lines in a backend built with Express.js. They control how your server reads incoming request data from clients (like your React frontend).Apply middleware to every incoming request before it reaches your routes.*/

/*express.json() parses incoming JSON request bodies, and express.urlencoded() parses URL-encoded form data. The limit option restricts payload size for security, and extended: true allows nested object parsing.*/

app.use("/api/v1/users", userRoutes);
/*Mounts (attaches) your userRoutes to a base URL path*/

const start = async () => {
  app.set("mongo_user");
  const connectionDb = await mongoose.connect(
    "mongodb+srv://varunrana162003_db_user:rN8UDRkOfqBB1myc@cluster0.ctllgru.mongodb.net/",
  );
  console.log(`Mongo Connected DB Host: ${connectionDb.connection.host}`);
  server.listen(app.get("port"), () => {
    console.log("LISTENING ON PORT 8000");
  });
};

start();
/*Handle normal HTTP requests via Express and Handle real-time connections via Socket.IO */
