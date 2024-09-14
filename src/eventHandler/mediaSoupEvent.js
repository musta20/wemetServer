const mediaSoupHelper = require("../lib/mediaSoupHelper");

const fs = require("fs");


module.exports = async ({
  socket,
  peers,
  TheRoomHelper,
  transports,
  producers,
  consumers,
  rooms
 
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
    peers,
    transports,
    producers,
    consumers,
    TheRoomHelper,
  });

  //when the user disconnected this event whill close all producer /consumer
  socket.on("disconnect", () => {
    disConnectPeer(socket.id);
  // removeItems(consumers, socket.id, "consumer");
  // removeItems(producers, socket.id, "producer");
  // removeItems(transports, socket.id, "transport");

    let TheroomName = peers.get(socket.id)?.roomName;
   // console.log("\x1b[33m%s\x1b[0m", `Show the ROOM IAM GETTING OUT OF`);

    console.log(TheroomName);

    if (!TheroomName) return;

    if (!TheRoomHelper.IsRoomExist(TheroomName, socket)) {

      if (TheroomName !== "mainrrom" && !TheroomName.includes("@")) {

        rooms?.get(TheroomName)?.close()

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
        rooms?.get(TheroomName)?.close()

      }
      
      // return;
    }

   // console.log("\x1b[32m%s\x1b[0m", `show the GetTheFullRoomName`);

   // FullRomeName = TheRoomHelper.GetTheFullRoomName(TheroomName);

    // if (FullRomeName) {
    //   FullstringRomeName =
    //     '{"title":"' +
    //     FullRomeName.title +
    //     '","BossId":"' +
    //     FullRomeName.BossId +
    //     '","TraficRoom":"' +
    //     FullRomeName.TraficRoom +
    //     '"}';
    // }

    
   // socket.leave(TheroomName);

    if (peers.get(socket.id)?.peerDetails?.isAdmin) {
      if (FullRomeName !== null) {

        if (!FullRomeName) return;

        let clients = TheRoomHelper.GetAllUsersInRoom(TheroomName);


        if (!clients) return;
        const first = clients.entries().next();

        if (clients.length !== 0) {
          peers.get(first).peerDetails.isAdmin = true;

          peers.get(first).peerDetails.isRoomLocked =
            peers.get(socket.id).peerDetails.isRoomLocked;

            peers.get(first).peerDetails.IsPublic =
            peers.get(socket.id).peerDetails.IsPublic;

          peers.get(first).peerDetails.isStream =
            peers.get(socket.id).peerDetails.isStream;

        //  console.log("admin switched");

          socket.to(first).emit("switchAdminSetting", {
            isRoomLocked: peers.get(socket.id).peerDetails.isRoomLocked,
            isStream: peers.get(socket.id).peerDetails.isStream,
            IsPublic: peers.get(socket.id).peerDetails.IsPublic,
          });
          socket.to(TheroomName).emit("switchAdmin", { admin: first });

          socket
            .to(TheRoomHelper.GenerateRoomeTrafic(TheroomName))
            .emit("switchAdmin", { admin: first });
        }
      }
    }

    if (TheroomName) {
      socket.to(TheRoomHelper.GenerateRoomeTrafic(TheroomName)).emit("FreeToJoin", { status: true });
    }

   // const roomName  = peers.get(socket.id).roomName;

     peers.delete(socket.id);

 // peers.splice(socket.id,1)
    // try {
    //   rooms[roomName] = {
    //     router: rooms[roomName].router,
    //     peers: rooms[roomName].peers.filter(
    //       (socketId) => socketId !== socket.id
    //     ),
    //   };
    // } catch (e) {
    //   console.log(e);
    // }
  });

  //asking the server to resv a specifc transport
  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {


      try {

        const user  = peers.get(socket.id);

        const router = rooms.get(user.roomName);

        const consumerTransport = user.transports.get(serverConsumerTransportId);

        // let consumerTransport = transports.find(
        //   (transportData) =>
        //     transportData.consumer &&
        //     transportData.transport.id == serverConsumerTransportId
        // )?.transport;

        if (router.canConsume({
            producerId: remoteProducerId,
            rtpCapabilities,
          })
        ) 
        {

     
          const consumer = await consumerTransport.consume({
            producerId: remoteProducerId,
            rtpCapabilities,
            paused: true,
          });

          consumer.on("transportclose", () => {

          //  console.log("\x1b[31m%s\x1b[0m", `transportclose`);
          });

          consumer.on("producerclose", () => {
            console.log("\x1b[31m%s\x1b[0m", `producer of consumer closed`);

            socket.emit("producer-closed", {

              remoteProducerId: remoteProducerId,
              
              socketId: usocketId.socketId

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
           addConsumer(consumer, user.roomName);

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
   await peers.get(socket.id).consumers.get(serverConsumerId).resume();
    // const { consumer } = consumers.find(
    //   (consumerData) => consumerData.consumer.id === serverConsumerId
    // );
    // // console.log(consumer.id)
    // await consumer.resume();
  });

  //the event will reterun back to the user the currnt produsers in the room
  socket.on("getProducers", ({ isViewr, roomName }, callback) => {
    //return all producer transports
    // console.log("WHAT IS THIS WERID CONRDIAL");
    //  console.log(isViewr)
    //  console.log(roomName)

    //const roomName =  Mainroom
      
    let producerList =[];
    // producers.forEach((producerData) => {
    //   if (
    //     producerData.socketId !== socket.id &&
    //     producerData.roomName === roomName
    //   ) {
    //     producerList = [
    //       ...producerList,
    //       [producerData.producer.id, producerData.socketId],
    //     ];
    //   }
    // });
   // console.log("\x1b[31m%s\x1b[0m", `ALL THE PRODUCERS YOU ASK FOR`);
    //  console.log(producerList);

  for(const [id,peer] of peers){
     if(peer.roomName === roomName  &&
      id !== socket.id

     ){
      for(const [producerId,producer] of peer.producers){
         producerList = [
          ...producerList,
          [producerId, id],
        ]
      }
  
  }
}
    // return the producer list back to the client
    callback(producerList);
  });

  //this event a user called to create wenrtctransport  send/resv
  socket.on("createWebRtcTransport", async ({ consumer }, callback) => {
    // get Room Name from Peer's properties
    //console.log(peers[socket.id])
    
    const roomName = peers.get(socket.id).roomName;

    // get Router (Room) object this peer is in based on RoomName
    // console.log(roomName)
    // console.log( peers[socket.id])
    const router = rooms.get(roomName);

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
   // const GetTheStringFullRoomName =
    // TheRoomHelper.GetTheStringFullRoomName(roomName);
    //console.log(GetTheStringFullRoomName)

    if ( roomName, socket)
       {
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
      const { roomName } = peers.get(socket.id);

      addProducer(producer, roomName);

      let TraficRoom = TheRoomHelper.GetTheFullRoomName(roomName);

      let router1 = rooms.get(roomName);

      if (rooms.has(TraficRoom)) {
        let router2 = rooms.get(TraficRoom);

        await router1.pipeToRouter({
          producerId: producer.id,
          router: router2,
        });
      }

      informConsumers(roomName, socket.id, producer.id);

      informViewrs(TraficRoom, producer.id, socket.id);

      //console.log('Producer ID: ', producer.id, producer.kind)

      producer.on("transportclose", () => {
        //console.log('transport for this producer closed ')
        console.log("\x1b[31m%s\x1b[0m", `transportclose`);

        producer.close();
      });
      let peersInRoom =  await TheRoomHelper.GetAllUsersInRoom(roomName);
     // console.log(roomName+"  peersInRoom",peersInRoom)
      // Send back to the client the Producer's id
      callback({
        id: producer.id,
        producersExist:  peersInRoom.length >= 1 ? true : false,
      });
    }
  );

  //in this event the user ask the server to recv a stram from the specifc server consumer transport
  socket.on(
    "transport-recv-connect",
    async ({ dtlsParameters, serverConsumerTransportId }) => {
      //console.log(`DTLS PARAMS: ${dtlsParameters}`)
      //console.log("ITHECK THE ERORR MY BE HABINGIN HERE",serverConsumerTransportId);

      

       try {
       for( const [ id,transportData] of peers.get(socket.id).transports){

          if( transportData.consumers.size &&
             id == serverConsumerTransportId )
             {
              transportData.connect({ dtlsParameters });
              //console.log('Line 413',transportData);
             // consumerTransport = transportData;

             }
       }

  //    console.log(consumerTransport)
        // const consumerTransport = transports.find(
        //   (transportData) =>
        //     transportData.consumer &&
        //     transportData.transport.id == serverConsumerTransportId
        // ).transport;

        //await consumerTransport.connect({ dtlsParameters });
      } catch (e) {
        console.log(e);
      }
    }
  );
};
