require("dotenv").config();

const Logger = require("./Logger");
const logger = new Logger();
const fs = require("fs");

const mediaSoupHelper = ({ socket, peers  }) => {
  /*
  This function called to tell all users in the room
  that there is a new user just joined the room
  and it take his socket id and producer id as is
  and the room name 
  */
  informConsumers = (roomName, socketId, name, id) => {
    logger.info(`user just joined room, id ${id} ,${name} ${roomName}, ${socketId} `);
    socket
      .to(roomName)
      .emit("new-producer", { producerId: id, socketId: socketId, name: name });
  };

  /*
  This function called to tell all users in the 
  viewer room that there a new user joined the 
  live room 
  */
  informViewrs = (roomName, id, socketId ,name) => {
    socket
      .to(roomName)
      .emit("new-producer", { producerId: id, socketId: socketId , name: name });

    logger.info(`user joined, id ${id} ${roomName}, ${socketId}`);
  };

  //This function called to save a producer to the producer array
  addProducer = (producer) => {
    peers.get(socket.id).producers.set(producer.id, producer);

    logger.info("\x1b[33m%s\x1b[0m", `producer added ${producer.id} `);
  };

  //This function addConsumer to save a addConsumer to the producer array
  addConsumer = (consumer, roomName) => {
    peers.get(socket.id).consumers.set(consumer.id, consumer);
  };

  disConnectPeer = async (socketId , TheRoomHelper ,rooms,Traficrooms) => {
    peer = peers.get(socketId);

    if (!peer) return;

    for (const [, consumer] of peer.consumers) {
      logger.info("\x1b[33m%s\x1b[0m", `CLOSING THE consumer  `);

      consumer.close();
    }

    for (const [, producer] of peer.producers) {
      logger.info("\x1b[33m%s\x1b[0m", `CLOSING THE producer  `);

      producer.close();
    }

    for (const [, transport] of peer.transports) {
      logger.info("\x1b[33m%s\x1b[0m", `CLOSING THE transport  `);

      transport.close();
    }
  

    let TheroomName = peers.get(socketId)?.roomName;

    if (!TheroomName) return;

    if (!TheRoomHelper.IsRoomExist(TheroomName, socket)) {
      if (TheroomName !== "mainrrom" && !TheroomName.includes("@")) {

       //console.log('THE PROSSESS OF CLOSING THE ROOM')

        rooms?.get(TheroomName)?.close();

        rooms.delete(TheroomName);
        socket.to("mainrrom").emit("DelteRoom", { TheroomName });

       await fs.unlink("src/uploads/" + TheroomName + ".png", (err) => {
          if (err) {
            logger.error(err);
            return;
          }
        });
      }

      if (TheroomName !== "mainrrom" && TheroomName.includes("@")) {
        Traficrooms?.get(TheroomName)?.close();
        Traficrooms?.delete(TheroomName);
      }

    }

    if (peers.get(socketId)?.peerDetails?.isAdmin) {
      if (TheroomName !== null) {
        if (!TheroomName) return;

        let clients = socket.adapter.rooms.get(TheroomName);

        if (!clients) return;
        const [first] = clients;

        if (clients.length !== 0) {
          const newAdmin = peers.get(first);
          const currentAdmin = peers.get(socketId);
          newAdmin.peerDetails.isAdmin = true;

          newAdmin.peerDetails.isRoomLocked =
            currentAdmin.peerDetails.isRoomLocked;

          newAdmin.peerDetails.IsPublic = currentAdmin.peerDetails.IsPublic;

          newAdmin.peerDetails.isStream = currentAdmin.peerDetails.isStream;

          socket.to(first).emit("switchAdminSetting", {
            isRoomLocked: currentAdmin.peerDetails.isRoomLocked,
            isStream: currentAdmin.peerDetails.isStream,
            IsPublic: currentAdmin.peerDetails.IsPublic,
          });
          socket.to(TheroomName).emit("switchAdmin", { admin: first });

          socket
            .to(TheRoomHelper.GenerateRoomeTrafic(TheroomName))
            .emit("switchAdmin", { admin: first });
        }
      }
    }

    if (TheroomName) {
      socket
        .to(TheRoomHelper.GenerateRoomeTrafic(TheroomName))
        .emit("FreeToJoin", { status: true });
    }

    peers.delete(socketId);
  
  
  };

  //This function the client call to create webrtc transport
  createWebRtcTransport = async (router) => {
    return new Promise(async (resolve, reject) => {
      try {
        // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
        const webRtcTransport_options = {
          listenIps: [
            {
              ip: process.env.PUBLIC_LISTEN_IPS, // replace with relevant IP address
              announcedIp: process.env.ANNOUNCED_PUBLIC_IP,
            },
          ],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
        };

        // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
        let transport = await router.createWebRtcTransport(
          webRtcTransport_options
        );

        transport.on("dtlsstatechange", (dtlsState) => {
          if (dtlsState === "closed") {
            transport.close();
          }
        });

        transport.on("close", () => {
          logger.info("\x1b[31m%s\x1b[0m", `transport closed}`);
        });

        resolve(transport);
      } catch (error) {
        reject(error);
      }
    });
  };

  //This function used to get specific producerTransport
  getTransport = (socketId) => {
    const transport = peers.get(socketId).transports;

    let returnProducerTransport;

    for (const [, producerTransport] of transport) {
      if (!producerTransport.consumer)
        returnProducerTransport = producerTransport;
    }

    // const [producerTransport] = transports.filter(
    //   (transport) => transport.socketId === socketId && !transport.consumer
    // );
    return returnProducerTransport;
  };

  //This function addTransport save transport to the Transport array
  addTransport = (transport, roomName, consumer) => {
    peers.get(socket.id).transports.set(transport.id, transport);
  };

  return {
    addTransport,
    getTransport,
    createWebRtcTransport,
    addConsumer,
    addProducer,
    disConnectPeer,
    informViewrs,
    informConsumers,
  };
};

module.exports = mediaSoupHelper;
