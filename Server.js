require("dotenv").config();

process.title = "mediasoup-demo-server";
process.env.DEBUG = process.env.DEBUG || "*INFO* *WARN* *ERROR*";

const __prod__ = require("./constants");
const express = require("express");
const Logger = require("./src/lib/Logger");
const { RoomHelper } = require("./src/lib/roomHelper");
 const mediaSoupCli = require("mediasoup-cli");
const app = express();
const utils = require("./src/lib/utils");

const Http = __prod__ ? require("https") : require("http");
const fs = require("fs");
const path = require("path");
const mediasoup = require("mediasoup");

const mediaSoupEventHandler = require("./src/eventHandler/mediaSoupEvent");
const roomEventEventHandler = require("./src/eventHandler/roomEvent");
let nextMediasoupWorkerIdx = 0;

const { Server } = require("socket.io");

const config = require("./src/config");

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

let worker;
let trafficRoomWorker;
let rooms = new Map();
let Traficrooms = new Map();
let peers = new Map();
let httpsServer;
const logger = new Logger();

const mediasoupWorkers = [];

const { mediaCodecs } = config.mediasoup.routerOptions;

let TheRoomHelper;

mediaSoupCli.observer(mediasoup);

main();

async function main() {

  await startExpressServer();

  await startHttpServer();

  await startSocketServer();

  await createWorkers();

}

async function startSocketServer() {
  const socketSwerver = new Server(httpsServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  logger.info("\x1b[32m%s\x1b[0m", `START SOCKET SERVER `);

  socketSwerver.on("connection", async (socket) => {
     TheRoomHelper = new RoomHelper(socket);


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

  app.get("/imges/:name", function (req, res) {
    let filename = path.join(__dirname, "src/uploads/", req.params.name);
    let loadingRoom = path.join(__dirname, "src/uploads/", "loadingRoom.png");

    try {
      if (fs.existsSync(filename)) return res.sendFile(filename);

      return res.sendFile(loadingRoom);
    } catch (err) {
      Logger.error(err);
    }
  });

  app.use(express.static(path.join(__dirname, "dist")));

  app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

async function startHttpServer() {

  logger.info("running an HTTPS server...");

  // HTTPS server for the protoo WebSocket server.
  const tls = {
    cert: fs.readFileSync(config.https.tls.cert),
    key: fs.readFileSync(config.https.tls.key),
  };
  
   httpsServer = __prod__ ? Http.createServer(tls, app) : Http.createServer(app);

  await new Promise((resolve) => {
    httpsServer.listen(
      Number(config.https.listenPort),
      config.https.listenIp,
      resolve
    );
  });
  
}

async function createWorkers() {
  let { numWorkers } = config.mediasoup;

  logger.info("running %d mediasoup Workers...", numWorkers);
  for (let i = 0; i < numWorkers - 1; ++i) {
    const worker = await mediasoup.createWorker({
      //dtlsCertificateFile : config.mediasoup.workerSettings.dtlsCertificateFile,
      //dtlsPrivateKeyFile  : config.mediasoup.workerSettings.dtlsPrivateKeyFile,
      logLevel: config.mediasoup.workerSettings.logLevel,
      logTags: config.mediasoup.workerSettings.logTags,
      rtcMinPort: Number(config.mediasoup.workerSettings.rtcMinPort),
      rtcMaxPort: Number(config.mediasoup.workerSettings.rtcMaxPort),
    });

    worker.on("died", () => {
      logger.error(
        "mediasoup Worker died, exiting  in 2 seconds... [pid:%d]",
        worker.pid
      );

      setTimeout(() => process.exit(1), 2000);
    });

    logger.info(`WORKER START PID:${worker.pid}`);
 
    if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== "false") {
      //console.log('WEBRTC SERVER IS NOT FALSE');
       // Each mediasoup Worker will run its own WebRtcServer, so those cannot
      // share the same listening ports. Hence we increase the value in config.js
      // for each Worker.
      const webRtcServerOptions = utils.clone(
        config.mediasoup.webRtcServerOptions
      );
      const portIncrement = mediasoupWorkers.length - 1;

      for (const listenInfo of webRtcServerOptions.listenInfos) {
        listenInfo.port += portIncrement;
      }

      const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

      worker.appData.webRtcServer = webRtcServer;
    }

    mediasoupWorkers.push(worker);

    // Log worker resource usage every X seconds.
    // setInterval(async () => {
    //   const usage = await worker.getResourceUsage();
    //   const usageTraffic = await trafficRoomWorker.getResourceUsage();
    //   const dumpTraffic = await trafficRoomWorker.dump();

    //   const dump = await worker.dump();

    //   logger.info(
    //     "mediasoup Worker resource usage [pid:%d]: %o",
    //     worker.pid,
    //     usage
    //   );

    //   logger.info("mediasoup Worker dump [pid:%d]: %o", worker.pid, dump);

    //   logger.info(
    //     "mediasoup Worker resource usage [pid:%d]: %o",
    //     trafficRoomWorker.pid,
    //     usageTraffic
    //   );

    //   logger.info(
    //     "mediasoup Worker dump [pid:%d]: %o",
    //     trafficRoomWorker.pid,
    //     dumpTraffic
    //   );
    // }, 12000);
  }

  trafficRoomWorker = await mediasoup.createWorker({
    //dtlsCertificateFile : config.mediasoup.workerSettings.dtlsCertificateFile,
    //dtlsPrivateKeyFile  : config.mediasoup.workerSettings.dtlsPrivateKeyFile,
    logLevel: config.mediasoup.workerSettings.logLevel,
    logTags: config.mediasoup.workerSettings.logTags,
    rtcMinPort: Number(config.mediasoup.workerSettings.rtcMinPort),
    rtcMaxPort: Number(config.mediasoup.workerSettings.rtcMaxPort),
  });

  if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== "false") {
    // Each mediasoup Worker will run its own WebRtcServer, so those cannot
    // share the same listening ports. Hence we increase the value in config.js
    // for each Worker.
    const webRtcServerOptions = utils.clone(
      config.mediasoup.webRtcServerOptions
    );
    const portIncrement = mediasoupWorkers.length - 1;

    for (const listenInfo of webRtcServerOptions.listenInfos) {
      listenInfo.port += portIncrement;
    }

    const webRtcServer = await trafficRoomWorker.createWebRtcServer(
      webRtcServerOptions
    );

    trafficRoomWorker.appData.webRtcServer = webRtcServer;
  }

  logger.info(`TRAFFIC WORKER START PID:${trafficRoomWorker.pid}`);

  trafficRoomWorker.on("died", () => {
    logger.error(
      "mediasoup Worker died, exiting  in 2 seconds... [pid:%d]",
      worker.pid
    );

    setTimeout(() => process.exit(1), 2000);
  });

  // setInterval(async () => {
  //   const usageTraffic = await trafficRoomWorker.getResourceUsage();
  //   const dumpTraffic = await trafficRoomWorker.dump();

  //   logger.info(
  //     "mediasoup Worker resource usage [pid:%d]: %o",
  //     trafficRoomWorker.pid,
  //     usageTraffic
  //   );

  //   logger.info(
  //     "mediasoup Worker dump [pid:%d]: %o",
  //     trafficRoomWorker.pid,
  //     dumpTraffic
  //   );
  // }, 12000);
}

async function getOrCreateRoom(roomName, type) {
 
  let router;
  if (type == "traffic") {
    if (Traficrooms.has(roomName)) {
      router = Traficrooms.get(roomName);
    } else {
      try {
      router = await trafficRoomWorker.createRouter({ mediaCodecs });
      } catch (e) {
        Logger.error("ERROR CREATEING TRAFFIC ROUTER",e);
      }
      Traficrooms.set(roomName, router);
    }

    return router;
  }

  if (rooms.has(roomName)) {
    router = rooms.get(roomName);
  } else {

    const worker = getMediasoupWorker();

    try {
    router = await worker.createRouter({ mediaCodecs });
    } catch (e) {
      Logger.error("ERROR CREATEING MAIN ROOM ROUTER",e);
    }

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
