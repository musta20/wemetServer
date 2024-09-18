require("dotenv").config();

const Logger = require("./Logger");
const logger = new Logger();

const mediaSoupHelper = ({ socket, peers }) => {
  /*
  this function called to tell all users in the room
  that there is a new user just joined the room
  and it take his socket id and producer id as is
  and the room name 
  */
  informConsumers = (roomName, socketId, id) => {
    logger.info(`user just joined room, id ${id} ${roomName}, ${socketId}`);
    socket
      .to(roomName)
      .emit("new-producer", { producerId: id, socketId: socketId });
  };

  /*
  this function called to tell all users in the 
  viewr room that there a new user joined the 
  live room 
  */
  informViewrs = (roomName, id, socketId) => {
    socket
      .to(roomName)
      .emit("new-producer", { producerId: id, socketId: socketId });

    logger.info(`user joined, id ${id} ${roomName}, ${socketId}`);
  };

  //this function called to save a producer to the producer array
  addProducer = (producer) => {
    peers.get(socket.id).producers.set(producer.id, producer);

    logger.info("\x1b[33m%s\x1b[0m", `producer added ${producer.id} `);
  };

  //this function addConsumer to save a addConsumer to the producer array
  addConsumer = (consumer, roomName) => {
    peers.get(socket.id).consumers.set(consumer.id, consumer);
  };

  disConnectPeer = (socketId) => {
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
  };

  //this function the client call to create webrtc transport
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

  //this function used to get specifc producerTransport
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

  //this function addTransport save transport to the Transport array
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
