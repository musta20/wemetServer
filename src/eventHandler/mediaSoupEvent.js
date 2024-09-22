const Logger = require("../lib/Logger");
const mediaSoupHelper = require("../lib/mediaSoupHelper");
const logger = new Logger();

module.exports = async ({
  socket,
  peers,
  TheRoomHelper,
  Traficrooms,
  rooms,
}) => {
  const {
    addTransport,
    getTransport,
    createWebRtcTransport,
    disConnectPeer,
    addConsumer,
    addProducer,
    informViewrs,
    informConsumers,
  } = await mediaSoupHelper({
    socket,
    peers
  });

  socket.on("leave",async (name) => {
  await  disConnectPeer(socket.id , TheRoomHelper ,rooms,Traficrooms);

    let TheroomName = peers.get(socket.id)?.roomName;
    socket.leave(TheroomName);

  });

  
  /*
    When the user disconnected this event will close all producer / consumer
  */
  
  socket.on("disconnect", async () => {
    
  await  disConnectPeer(socket.id , TheRoomHelper ,rooms,Traficrooms);

  });

  /*
    Asking the server to receive a specific transport
  */

  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {
      let usocketId;
      try {
        const user = peers.get(socket.id);

        const router = user.roomName.startsWith("traffic@")
          ? Traficrooms.get(user.roomName)
          : rooms.get(user.roomName);

        const consumerTransport = user.transports.get(
          serverConsumerTransportId
        );

        const mainUserRoomName = user.roomName.startsWith("traffic@")
          ? user.roomName.slice(8)
          : user.roomName;

        for (const [index, userPeer] of peers) {
          if (userPeer.roomName === mainUserRoomName) {
            for (const [, producer] of userPeer.producers) {
              if (producer.id === remoteProducerId) {
                usocketId = index;
              }
            }
          }
        }

        if (
          router.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
          })
        ) {
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });

          consumer.on("transportclose", () => {
            socket.emit("transportclose", {
              remoteProducerId: remoteProducerId,

              socketId: usocketId,
            });
          });

          consumer.on("producerclose", () => {
            socket.emit("producer-closed", {
              remoteProducerId: remoteProducerId,

              socketId: usocketId,
            });
          });

          addConsumer(consumer, user.roomName);

          /*
           From the consumer extract the following params 
           to send back to the Client
          */
          const params = {
            id: consumer.id,
            producerId: remoteProducerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            serverConsumerId: consumer.id,
          };

          // send the parameters to the client
          callback({ params });
        }
      } catch (error) {
        logger.error(error);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  /* Start consuming the server consumer id */

  socket.on("consumer-resume", async ({ serverConsumerId }) => {
    await peers.get(socket.id).consumers.get(serverConsumerId).resume();
  });

  /* This event will return back to the user the current producers in the room */ 

  socket.on("getProducers", async({ isViewr, roomName }, callback) => {
    let producerList = [];
    const usersInSocket =  await TheRoomHelper.GetAllUsersInRoom(roomName);
    console.log(usersInSocket)
    for (const [id, peer] of peers) {
      if (peer.roomName === roomName && id !== socket.id) {
       // const name = usersInSocket.usersInSocket.find(user => user.id === socket.id);
        for (const [producerId, producer] of peer.producers) {
          producerList = [...producerList, [producerId, id,peer.socket?.data?.name]];
        }
      }
    }
    /* Return the producer list back to the client */
    callback(producerList);
  });

  /* This event sent by clint  to create webrtcTransport  send/resv */

  socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
    const roomName = peers.get(socket.id).roomName;

    const router = roomName.startsWith("traffic@")
      ? Traficrooms.get(roomName)
      : rooms.get(roomName);

    createWebRtcTransport(router).then(
      (transport) => {
        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          },
        });

        // add transport to Peer's properties
        addTransport(transport, roomName, consumer);
      },
      (error) => {
        logger.error(error);
      }
    ).catch((error) => {
      logger.error("ERROR CREATING WEBRTC TRANSPORT",error);
    });
  });

  /* This event check if the room is available to join */

  socket.on("isFreeToJoin", ({ roomName }, fun) => {
    if ((roomName, socket)) {
      fun({ status: false });
    } else {
      fun({ status: true });
    }
  });

   /* This event connect a user transport  to server transport */
  socket.on("transport-connect", ({ dtlsParameters }) => {
    try {
      getTransport(socket.id).connect({ dtlsParameters });
    } catch (e) {
      logger.error(e);
    }
  });

  /* In this event the user start producing stream to the server */
  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client

      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });

      // add producer to the producers array
      const { roomName } = peers.get(socket.id);

      addProducer(producer, roomName);

      let TraficRoom = TheRoomHelper.GenerateRoomeTrafic(roomName);


      if (Traficrooms.has(TraficRoom)) {
        let router1 = rooms.get(roomName);

        let router2 = Traficrooms.get(TraficRoom);

        await router1.pipeToRouter({
          producerId: producer.id,
          router: router2,
        });


        informViewrs(TraficRoom, producer.id, socket.id,socket.data.name);

      }
      console.log(roomName, socket.id, socket.data.name);
      informConsumers(roomName, socket.id, socket.data.name, producer.id);


      producer.on("transportclose", () => {
        producer.close();
      });
      let peersInRoom = await TheRoomHelper.GetAllUsersInRoom(roomName);
console.log(peersInRoom.size)
      callback({
        id: producer.id,
        producersExist: peersInRoom.size >= 1 ? true : false,
      });
    }
  );

  /* This event clint ask the server to recv a stream from the specific server consumer transport */
  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      try {
        for (const [id, transportData] of peers.get(socket.id).transports) {
          if (transportData.consumers.size && id == serverConsumerTransportId) {
            transportData.connect({ dtlsParameters });
          }
        }
      } catch (e) {
        logger.error(e);
      }
    }
  );
};
