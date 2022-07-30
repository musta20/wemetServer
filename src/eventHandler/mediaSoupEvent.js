module.exports = ({
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
  fs
}) => {

  //when the user disconnected this event whill close all producer /consumer
  socket.on("disconnect", () => {
   removeItems(consumers, socket.id, "consumer");
   removeItems(producers, socket.id, "producer");
   removeItems(transports, socket.id, "transport");

    let TheroomName = peers[socket.id]?.roomName;
   // console.log("\x1b[33m%s\x1b[0m", `Show the ROOM IAM GETTING OUT OF`);

    //console.log(TheroomName);

    if (!TheroomName) return;

    if (!TheRoomHelper.IsRommeExist(TheroomName, socket)) {
      if (TheroomName !== "mainrrom" && !TheroomName.includes("@")) {
        rooms?.[TheroomName]?.router?.close()
        socket.to("mainrrom").emit("DelteRoom", { TheroomName });

        fs.unlink("src/uploads/" + TheroomName + ".png", (err) => {
          if (err) {
            console.error(err);
            return;
          }

          //file removed
        });
      }

      if (TheroomName !== "mainrrom" && TheroomName.includes("@")) {
        rooms?.[TheroomName]?.router?.close()

      }
      
      // return;
    }

   // console.log("\x1b[32m%s\x1b[0m", `show the GetTheFullRoomName`);

    FullRomeName = TheRoomHelper.GetTheFullRoomName(TheroomName);

    if (FullRomeName) {
      FullstringRomeName =
        '{"title":"' +
        FullRomeName.title +
        '","BossId":"' +
        FullRomeName.BossId +
        '","TraficRoom":"' +
        FullRomeName.TraficRoom +
        '"}';
    }

    if (peers[socket.id]?.peerDetails?.isAdmin) {
      if (FullRomeName !== null) {
        if (FullRomeName === "undefined") return;

        let clients = TheRoomHelper.GetAllUsersInRoom(TheRoomHelper.GetTheStringFullRoomName(FullRomeName.title));
/*         console.log('THIS IS PEERDETAILS IS ADMIN')
        console.log(FullRomeName)
        console.log(clients) */

        if (!clients) return;
        const [first] = clients;

        if (clients.length !== 0) {
          peers[first].peerDetails.isAdmin = true;

          peers[first].peerDetails.isRoomLocked =
            peers[socket.id].peerDetails.isRoomLocked;

          peers[first].peerDetails.IsPublic =
            peers[socket.id].peerDetails.IsPublic;

          peers[first].peerDetails.isStream =
            peers[socket.id].peerDetails.isStream;

        //  console.log("admin switched");

          socket.to(first).emit("switchAdminSetting", {
            isRoomLocked: peers[socket.id].peerDetails.isRoomLocked,
            isStream: peers[socket.id].peerDetails.isStream,
            IsPublic: peers[socket.id].peerDetails.IsPublic,
          });
          socket.to(FullstringRomeName).emit("switchAdmin", { admin: first });

          socket
            .to(FullRomeName.TraficRoom)
            .emit("switchAdmin", { admin: first });
        }
      }
    }

    if (FullRomeName) {
      socket.to(FullRomeName.TraficRoom).emit("FreeToJoin", { status: true });
    }

    const { roomName } = peers[socket.id];

    delete peers[socket.id];
 // peers.splice(socket.id,1)
    try {
      rooms[roomName] = {
        router: rooms[roomName].router,
        peers: rooms[roomName].peers.filter(
          (socketId) => socketId !== socket.id
        ),
      };
    } catch (e) {
      console.log(e);
    }
  });

  //asking the server to resv a specifc transport
  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {


      try {
        const { roomName } = peers[socket.id];
        const usocketId = producers.find(
          (producerdata) => producerdata.producer.id == remoteProducerId
        );


        const router = rooms[roomName].router;


        let consumerTransport = transports.find(
          (transportData) =>
            transportData.consumer &&
            transportData.transport.id == serverConsumerTransportId
        )?.transport;


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

          //  console.log("\x1b[31m%s\x1b[0m", `transportclose`);
          });

          consumer.on("producerclose", () => {
//            console.log("\x1b[31m%s\x1b[0m", `producer of consumer closed`);

            socket.emit("producer-closed", {
              remoteProducerId: remoteProducerId,
              socketId: usocketId.socketId,
            });

           // consumerTransport.close();
          
          //  let transportsIndex=transports.findIndex(t=>t.transport.id === consumerTransport.id)
           // transports.splice(transportsIndex,1)
          /*   transports = transports.filter(
              (transportData) =>
                transportData.transport.id !== consumerTransport.id
            ); */

          //  consumer.close();
      /*       consumers = consumers.filter(
              (consumerData) => consumerData.consumer.id !== consumer.id
            ); */
          });

          addConsumer(consumer, roomName);

          // from the consumer extract the following params
          // to send back to the Client
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
        console.log(error);
        callback({
          params: {
            error: error,
          },
        });
      }
    }
  );

  // start consumeing the serverconsumeroid
  socket.on("consumer-resume", async ({ serverConsumerId }) => {
    // console.log("consumer resume IS THERE ERROR HAPENNING HERER");
    // console.log(`IS THERE ERROR HAPPENG HERE IN THE CONSUMERS`);
    //  console.log(consumers )
    //  console.log(serverConsumerId )
    const { consumer } = consumers.find(
      (consumerData) => consumerData.consumer.id === serverConsumerId
    );
    // console.log(consumer.id)
    await consumer.resume();
  });

  //the event will reterun back to the user the currnt produsers in the room
  socket.on("getProducers", ({ isViewr, roomName }, callback) => {
    //return all producer transports
    // console.log("WHAT IS THIS WERID CONRDIAL");
    //  console.log(isViewr)
    //  console.log(roomName)

    //const roomName =  Mainroom

    let producerList = [];
    producers.forEach((producerData) => {
      if (
        producerData.socketId !== socket.id &&
        producerData.roomName === roomName
      ) {
        producerList = [
          ...producerList,
          [producerData.producer.id, producerData.socketId],
        ];
      }
    });
   // console.log("\x1b[31m%s\x1b[0m", `ALL THE PRODUCERS YOU ASK FOR`);
    //  console.log(producerList);

    // return the producer list back to the client
    callback(producerList);
  });

  //this event a user called to create wenrtctransport  send/resv
  socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
    // get Room Name from Peer's properties
    //console.log(peers[socket.id])
    
    const roomName = peers[socket.id].roomName;

    // get Router (Room) object this peer is in based on RoomName
    // console.log(roomName)
    // console.log( peers[socket.id])
    const router = rooms[roomName].router;

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
        console.log(error);
      }
    );
  });

  //this event check wither the room is abvalple to join
  socket.on("isFreeToJoin", ({ roomName }, fun) => {
    const GetTheStringFullRoomName =
      TheRoomHelper.GetTheStringFullRoomName(roomName);
    //console.log(GetTheStringFullRoomName)

    if (
      TheRoomHelper.IsRoomFull(
        TheRoomHelper.GetTheStringFullRoomName(roomName),
        socket
      )
    ) {
      fun({ status: false });
    } else {
      fun({ status: true });
    }
  });

  //this event connect a user transport  to server transport
  socket.on("transport-connect", ({ dtlsParameters }) => {
    //console.log('DTLS PARAMS... ', { dtlsParameters })
    try {
      getTransport(socket.id).connect({ dtlsParameters });
    } catch (e) {
      console.log(e);
    }
  });

  //in this event the user start producing stream to the server
  socket.on(
    "transport-produce",
    async ({ kind, rtpParameters, appData }, callback) => {
      // call produce based on the prameters from the client

      const producer = await getTransport(socket.id).produce({
        kind,
        rtpParameters,
      });

      // add producer to the producers array
      const { roomName } = peers[socket.id];

      addProducer(producer, roomName);

      let TraficRoom = TheRoomHelper.GetTheFullRoomName(roomName);

      // console.log(peers[socket.id])
      // console.log(TraficRoom)

      let router1 = rooms[roomName].router;

      if (rooms[TraficRoom?.TraficRoom]) {
        let router2 = rooms[TraficRoom?.TraficRoom].router;

        await router1.pipeToRouter({
          producerId: producer.id,
          router: router2,
        });
      }

      informConsumers(roomName, socket.id, producer.id);

      informViewrs(TraficRoom.TraficRoom, producer.id, socket.id);

      //console.log('Producer ID: ', producer.id, producer.kind)

      producer.on("transportclose", () => {
        //console.log('transport for this producer closed ')
        console.log("\x1b[31m%s\x1b[0m", `transportclose`);

        producer.close();
      });

      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist: producers.length > 1 ? true : false,
      });
    }
  );

  //in this event the user ask the server to recv a stram from the specifc server consumer transport
  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      //console.log(`DTLS PARAMS: ${dtlsParameters}`)
      //  console.log("ITHECK THE ERORR MY BE HABINGIN HERE");
      try {
        const consumerTransport = transports.find(
          (transportData) =>
            transportData.consumer &&
            transportData.transport.id == serverConsumerTransportId
        ).transport;

        await consumerTransport.connect({ dtlsParameters });
      } catch (e) {
        console.log(e);
      }
    }
  );
};
