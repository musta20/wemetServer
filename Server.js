require("dotenv").config();

const __prod__ = require("./constants");

const express = require("express");

const { RoomHelper } = require("./src/lib/roomHelper");

const mediaSoupHelper = require("./src/lib/mediaSoupHelper");

const app = express();

const Http = __prod__ ? require("httpolyglot") : require("http");

const fs = require("fs");

const path = require("path");

const PORT = process.env.WEMET_SERVER_PORT;

const mediasoup = require("mediasoup");

const mediaSoupEventHandler = require("./src/eventHandler/mediaSoupEvent");

const roomEventEventHandler = require("./src/eventHandler/roomEvent");

let credentials = {};

let cors = {
  cors :{
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true,
}
};

if (__prod__) {
  const privateKey = fs.readFileSync(
    path.join(__dirname, "ssl/privkey.pem"),
    "utf8"
  );
  const certificate = fs.readFileSync(
    path.join(__dirname, "ssl/cert.pem"),
    "utf8"
  );
  const ca = fs.readFileSync(path.join(__dirname, "ssl/cert.pem"), "utf8");

  credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  cors = {
  };
}


const http = Http.createServer(credentials, app);

const io = require("socket.io")(http, cors);

let worker;
let rooms = {}; // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}
let peers = {}; // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []; // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []; // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []; // [ { socketId1, roomName1, consumer, }, ... ]

/*
mediasoup use mediasoup to create worker
*/
const createWorker = async () => {
  worker = await mediasoup.createWorker();

  console.log("\x1b[36m%s\x1b[0m", `WORKER START PID:${worker.pid}`);

  worker.on("died", (error) => {
    // This implies something serious happened, so kill the application
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000); // exit in 2 seconds
  });

  return worker;
};

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

let TheRoomHelper;

const createRoom = async (roomName, socketId) => {
  let router1;
  let peers = [];
  if (rooms[roomName]) {
    router1 = rooms[roomName].router;
    peers = rooms[roomName].peers || [];
  } else {
    router1 = await worker.createRouter({ mediaCodecs });
  }

  rooms[roomName] = {
    router: router1,
    peers: [...peers, socketId],
  };

  return router1;
};

worker = createWorker();

io.on("connection", async (socket) => {
  TheRoomHelper = new RoomHelper(socket);

  const {
    addTransport,
    getTransport,
    createWebRtcTransport,
    removeItems,
    addConsumer,
    addProducer,
    informViewrs,
    informConsumers,
  } = await mediaSoupHelper({
    socket,
    peers,
    transports,
    producers,
    consumers,
    TheRoomHelper,
  });

  await roomEventEventHandler({
    socket,
    peers,
    TheRoomHelper,
    producers,
    createRoom,
    rooms,
    fs,
  });

  await mediaSoupEventHandler({
    socket,
    peers,
    addTransport,
    getTransport,
    createWebRtcTransport,
    removeItems,
    addConsumer,
    addProducer,
    informViewrs,
    informConsumers,
    TheRoomHelper,
    transports,
    producers,
    consumers,
    rooms,
    fs,
  });
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/imges/:name", function (req, res) {
  let filename = path.join(__dirname, "src/uploads/", req.params.name);
  let loadingRoom = path.join(__dirname, "src/uploads/", "loadingRoom.png");
  try {
    if (fs.existsSync(filename)) return res.sendFile(filename);
    return res.sendFile(loadingRoom);
  } catch (err) {
    console.error(err);
  }
});


app.use(express.static(path.join(__dirname, "build")));

app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

http.listen(PORT, () => {
  console.log("\x1b[33m%s\x1b[0m", `NODEJS SERVER RUNNING ON PORT:${PORT}`);
});
