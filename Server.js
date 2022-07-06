let express = require("express");

require("dotenv").config();

const { RoomHelper } = require("./src/lib/roomHelper");
const mediaSoupHelper = require("./src/lib/mediaSoupHelper");
let app = express();
let http = require("http").Server(app);
const fs = require("fs");
let parser = require("body-parser");
const path = require("path");
const PORT = process.env.PORT;
let mediasoup = require("mediasoup");
//require("./media-soup-cli")
const mediaSoupEventHandler = require("./src/eventHandler/mediaSoupEvent");
const roomEventEventHandler = require("./src/eventHandler/roomEvent");
var io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

app.use(parser.urlencoded({ extended: false }));
app.use(parser.json());
app.get("/", express.static(path.join(__dirname, "build")));

const options = {
  key: fs.readFileSync("src/ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("src/ssl/cert.pem", "utf-8"),
};

let TheRoomHelper;

const createRoom = async (roomName, socketId) => {
  /*
   worker.createRouter(options)
   options = { mediaCodecs, appData }
   mediaCodecs -> defined above
   appData -> custom application data - we are not supplying any
   none of the two are required
  */

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

//set the event handler on client connection
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

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

http.listen(PORT, () => {
  console.log("\x1b[33m%s\x1b[0m", `NODEJS SERVER RUNNING ON PORT:${PORT}`);
});
