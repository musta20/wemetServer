require("dotenv").config();

process.title = "mediasoup-demo-server";
process.env.DEBUG = process.env.DEBUG || "*INFO* *WARN* *ERROR*";

const __prod__ = require("./constants");
const express = require("express");
const Logger = require("./src/lib/Logger");
const { RoomHelper } = require("./src/lib/roomHelper");
const mediaSoupHelper = require("./src/lib/mediaSoupHelper");
const mediaSoupCli = require("mediasoup-cli");
const https = require("https");
const app = express();
const Http = __prod__ ? require("httpolyglot") : require("http");
const fs = require("fs");
const path = require("path");
const PORT = process.env.WEMET_SERVER_PORT || 6800;
const mediasoup = require("mediasoup");

const mediaSoupEventHandler = require("./src/eventHandler/mediaSoupEvent");
const roomEventEventHandler = require("./src/eventHandler/roomEvent");

const http = Http.createServer(app);

const io = require("socket.io")(http);

const config = require("./src/config");

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

let worker;
let trafficRoomWorker;
let rooms = new Map();
let Traficrooms = new Map();
let peers = new Map();

const logger = new Logger();

const mediasoupWorkers = [];

let TheRoomHelper;

mediaSoupCli.observer(mediasoup);

let credentials = {};

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

main();

async function main() {
  await createWorkers();

  await startSocketServer();

  await startExpressServer();

  await startHttpServer();
}

async function startSocketServer() {
  io.on("connection", async (socket) => {
    TheRoomHelper = new RoomHelper(socket);

    console.log("\x1b[32m%s\x1b[0m", `NEW CONNECTION: ${socket.id} `);

    await roomEventEventHandler({
      socket,
      peers,
      TheRoomHelper,
      getOrCreateRoom,
      Traficrooms,
      rooms,
    });

    await mediaSoupEventHandler({
      socket,
      peers,
      TheRoomHelper,
      Traficrooms,
      getOrCreateRoom,
      rooms,
    });
  });
}

async function startExpressServer() {
  let cors = {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
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

    cors = {};
  }

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
}

async function startHttpServer() {
  return new Promise((resolve, reject) => {
    http.listen(PORT, () => {
      console.log("\x1b[33m%s\x1b[0m", `HTTP SERVER RUNNING ON PORT:${PORT}`);
      resolve();
    });
  });
}

async function createWorkers() {
  let { numWorkers } = config.mediasoup;

  logger.info("running %d mediasoup Workers...", numWorkers);
  for (let i = 0; i < numWorkers - 1; ++i) {
    const worker = await mediasoup.createWorker();

    worker.on("died", () => {
      logger.error(
        "mediasoup Worker died, exiting  in 2 seconds... [pid:%d]",
        worker.pid
      );

      setTimeout(() => process.exit(1), 2000);
    });

    logger.info(`WORKER START PID:${worker.pid}`);

    mediasoupWorkers.push(worker);

    // Log worker resource usage every X seconds.
    setInterval(async () => {
      const usage = await worker.getResourceUsage();
      const usageTraffic = await trafficRoomWorker.getResourceUsage();
      const dumpTraffic = await trafficRoomWorker.dump();

      const dump = await worker.dump();

      logger.info(
        "mediasoup Worker resource usage [pid:%d]: %o",
        worker.pid,
        usage
      );

      logger.info("mediasoup Worker dump [pid:%d]: %o", worker.pid, dump);

      logger.info(
        "mediasoup Worker resource usage [pid:%d]: %o",
        trafficRoomWorker.pid,
        usageTraffic
      );

      logger.info(
        "mediasoup Worker dump [pid:%d]: %o",
        trafficRoomWorker.pid,
        dumpTraffic
      );
    }, 12000);
  }

  trafficRoomWorker = await mediasoup.createWorker();
  logger.info(`TRAFFIC WORKER START PID:${trafficRoomWorker.pid}`);

  trafficRoomWorker.on("died", () => {
    logger.error(
      "mediasoup Worker died, exiting  in 2 seconds... [pid:%d]",
      worker.pid
    );

    setTimeout(() => process.exit(1), 2000);
  });

  setInterval(async () => {
    const usageTraffic = await trafficRoomWorker.getResourceUsage();
    const dumpTraffic = await trafficRoomWorker.dump();

    logger.info(
      "mediasoup Worker resource usage [pid:%d]: %o",
      trafficRoomWorker.pid,
      usageTraffic
    );

    logger.info(
      "mediasoup Worker dump [pid:%d]: %o",
      trafficRoomWorker.pid,
      dumpTraffic
    );
  }, 12000);
}

async function getOrCreateRoom(roomName, type) {
  let router;
  if (type == "traffic") {
    if (Traficrooms.has(roomName)) {
      router = Traficrooms.get(roomName);
    } else {
      router = await trafficRoomWorker.createRouter({ mediaCodecs });

      Traficrooms.set(roomName, router);
    }

    return router;
  }

  if (rooms.has(roomName)) {
    router = rooms.get(roomName);
  } else {
    const worker = getMediasoupWorker();
    router = await worker.createRouter({ mediaCodecs });
    rooms.set(roomName, router);
  }

  return router;
}

function getMediasoupWorker() {
  const worker = mediasoupWorkers[nextMediasoupWorkerIdx];

  if (++nextMediasoupWorkerIdx === mediasoupWorkers.length)
    nextMediasoupWorkerIdx = 0;

  return worker;
}
