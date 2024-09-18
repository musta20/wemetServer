const Logger = require("../lib/Logger");
const mediaSoupHelper = require("../lib/mediaSoupHelper");

const fs = require("fs");


module.exports = async ({
  socket,
  peers,
  TheRoomHelper,
  Traficrooms,
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
    peers
  });



  socket.on("leave", (name) => {

    disConnectPeer(socket.id);

    let TheroomName = peers.get(socket.id)?.roomName;
    socket.leave(TheroomName);

  });

  //when the user disconnected this event whill close all producer /consumer
  socket.on("disconnect", async () => {
    disConnectPeer(socket.id);
 

    let TheroomName = peers.get(socket.id)?.roomName;

 
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

 

    if (peers.get(socket.id)?.peerDetails?.isAdmin) {
      if (TheroomName !== null) {

        if (!TheroomName) return;

        let clients = socket.adapter.rooms.get(TheroomName)
    
        
        if (!clients) return;
        const [first] = clients;
     

        if (clients.length !== 0) {
          const newAdmin = peers.get(first);
          const currentAdmin = peers.get(socket.id);
          newAdmin.peerDetails.isAdmin = true;

          newAdmin.peerDetails.isRoomLocked =
          currentAdmin.peerDetails.isRoomLocked;

            newAdmin.peerDetails.IsPublic =
            currentAdmin.peerDetails.IsPublic;

            newAdmin.peerDetails.isStream =
            currentAdmin.peerDetails.isStream;


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
      socket.to(TheRoomHelper.GenerateRoomeTrafic(TheroomName)).emit("FreeToJoin", { status: true });
    }

     peers.delete(socket.id);


  });

  //asking the server to resv a specifc transport
  socket.on(
    "consume",
    async (
      { rtpCapabilities, remoteProducerId, serverConsumerTransportId },
      callback
    ) => {

      let usocketId;
      try {

        const user  = peers.get(socket.id);

        const router = user.roomName.startsWith("traffic@") ? Traficrooms.get(user.roomName) : rooms.get(user.roomName);

        const consumerTransport = user.transports.get(serverConsumerTransportId);

        const mainUserRoomName = user.roomName.startsWith("traffic@") ? user.roomName.slice(8) : user.roomName;

        for(const [index, userPeer] of peers) {

          if(userPeer.roomName === mainUserRoomName) {
            
            for(const [, producer] of userPeer.producers) {
              if(producer.id === remoteProducerId) {
                 usocketId = index;
              }
              
          }

        }

        
  
        
        }
  
 

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

 
            socket.emit("transportclose", {

              remoteProducerId: remoteProducerId,
              
              socketId: usocketId

            });

          });

          consumer.on("producerclose", () => {

           socket.emit("producer-closed", {

              remoteProducerId: remoteProducerId,
              
              socketId:  usocketId

            });

   
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
        Logger.error(error);
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
 
   await peers.get(socket.id).consumers.get(serverConsumerId).resume();
 
  });

  //the event will reterun back to the user the currnt produsers in the room
  socket.on("getProducers", ({ isViewr, roomName }, callback) => {
 
      
    let producerList =[];
 

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

    
    const roomName = peers.get(socket.id).roomName;

   
      const router = roomName.startsWith("traffic@") ? Traficrooms.get(roomName) : rooms.get(roomName);

     
    
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
        Logger.error(error);
      }
    );
  });

  //this event check wither the room is abvalple to join
  socket.on("isFreeToJoin", ({ roomName }, fun) => {

    
    if ( roomName, socket)
       {
      fun({ status: false });
    } else {
      fun({ status: true });
    }
  });

  //this event connect a user transport  to server transport
  socket.on("transport-connect", ({ dtlsParameters }) => {
     try {
      getTransport(socket.id).connect({ dtlsParameters });
    } catch (e) {
      Logger.error(e);
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
        let router2 = Traficrooms.get(TraficRoom);

        await router1.pipeToRouter({
          producerId: producer.id,
          router: router2,
        });
      }

      informConsumers(roomName, socket.id, producer.id);

      informViewrs(TraficRoom, producer.id, socket.id);


      producer.on("transportclose", () => {
      
        producer.close();
      });
      let peersInRoom =  await TheRoomHelper.GetAllUsersInRoom(roomName);

      
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

       try {
       for( const [ id,transportData] of peers.get(socket.id).transports){

          if( transportData.consumers.size &&
             id == serverConsumerTransportId )
             {
              transportData.connect({ dtlsParameters });
          

             }
       }

      } catch (e) {
        Logger.error(e);
      }
    }
  );
};
