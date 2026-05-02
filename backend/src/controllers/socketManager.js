import { Server } from "socket.io"; /*You are importing the Server class from Socket.IO. This class is used to create a WebSocket server*/
/*Express server → handles REST API requests
Socket.IO server → handles realtime connections*/
let connections = {}; /*It is an object.*/

let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  /*This server is the HTTP server created using Node.js*/
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: [
        "*",
      ] /*This combinations is not recommended in production*/,
      credentials: true,
    } /*this CORS block ensures frontend can connect to backend sockets successfully. */,
  }); /*This is the most important line You are creating a Socket.IO server instance and You are attaching it to your existing HTTP server*/

  io.on("connection", (socket) => {
    console.log("Something Connected");
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        /*path is being used as a key of "connections" object, not an index.*/
        connections[path] = [];
      }
      connections[path].push(
        socket.id,
      ); /*"path" is the room where the users are getting added*/
      timeOnline[socket.id] = new Date();

      for (let a = 0; a < connections[path].length; ++a) {
        io.to(connections[path][a]).emit(
          "user-joined",
          socket.id,
          connections[path],
        );
      }
      /*sending every user notification that a new user is joined even the new user will get notified*/

      if (messages[path] !== undefined) {
        for (let a = 0; a < messages[path].length; ++a) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][a]["data"],
            messages[path][a]["sender"],
            messages[path][a]["socket-id-sender"],
          );
        }
      }
      /*showing the previous messages to the new user*/
    });
    /*When a user joins a call:
Add them to the room (connections[path])
Store when they joined
Notify all users in that room
Send previous chat messages to the new user
So this acts like a room join handler + sync existing participants + restore chat history*/

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, message) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          /*"[room, isFound]" this is the accumulator*/
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }

          return [room, isFound];
        },
        ["", false],
      );
      /*"Object.entries(connections)" this returns all the entries in the connections object in the form of array if "connections = {
  room1: ["socketA", "socketB"],
  room2: ["socketC", "socketD"]
}" then it returns "[
  ["room1", ["socketA","socketB"]],
  ["room2", ["socketC","socketD"]]
]" and then we use "reduce" method */
      /*Finding which room the sender belongs to*/

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }

        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });

        console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
        /*sending messages in the chat room*/
      }
    });
    /*Finds which room the sender belongs to
      Saves the message in that room’s history
      Sends the message to everyone in the room */

    socket.on("disconnect", () => {
      var diffTime = Math.abs(timeOnline[socket.id] - new Date());

      var key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections)),
      )) /*is a common JavaScript trick used to make a deep copy of data (specifically here: a copy of the entries of the connections object). first to array ,then to string and the to array again but this is a different copy in the memory*/ {
        for (let a = 0; a > v.length; ++a) {
          if (v[a] === socket.id) {
            key = k;
            for (let a = 0; a < connections[key].length; ++a) {
              io.to(connections[key][a]).emit("user-left", socket.id);
            }
            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);
            /*Remove 1 element from array at position index*/
            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });
  });
  return io;
};
