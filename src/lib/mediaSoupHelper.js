require("dotenv").config();

const mediaSoupHelper = ({
  socket,
  peers,
 // transports,
 // producers,
 // consumers,
  TheRoomHelper,
}) => {

  /*
  this function called to tell all users in the room
  that there is a new user just joined the room
  and it take his socket id and producer id as is
  and the room name 
  */
  informConsumers = (roomName, socketId, id) => {
    console.log(`just joined, id ${id} ${roomName}, ${socketId}`);

   // let room = TheRoomHelper.GetTheStringFullRoomName(roomName);

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
  };

  //this function called to save a producer to the producer array
  addProducer = (producer) => {
    // producers = [...producers, { socketId: socket.id, producer, roomName }];
    peers.get(socket.id).producers.set(producer.id, producer);
    //producers.push({ socketId: socket.id, producer, roomName });

    // peers[socket.id] = {
    //   ...peers[socket.id],
    //   producers: [...peers[socket.id].producers, producer.id],
    // };
  };

  //this function addConsumer to save a addConsumer to the producer array
  addConsumer = (consumer, roomName) => {


    peers.get(socket.id).consumers.set(consumer.id, consumer);

    // add the consumer to the consumers list
    // consumers = [...consumers, { socketId: socket.id, consumer, roomName }];
   // consumers.push({ socketId: socket.id, consumer, roomName });

    // add the consumer id to the peers list
    // peers[socket.id] = {
    //   ...peers[socket.id],
    //   consumers: [...peers[socket.id].consumers, consumer.id],
    // };
  };

  

  disConnectPeer = ( socketId ) => {
    peer = peers.get(socketId);
   // console.log(socketId);
    if(!peer) return;

   // console.log("\x1b[33m%s\x1b[0m", `CLOSING THE PEER ${socketId}`);

     for(const [,consumer] of peer.consumers) {
      console.log("\x1b[33m%s\x1b[0m", `CLOSING THE consumer  `);

      consumer.close();
    }

    for(const [,producer] of peer.producers) {

      console.log("\x1b[33m%s\x1b[0m", `CLOSING THE producer  `);

      producer.close();
    }

    for(const [,transport] of peer.transports) {

      console.log("\x1b[33m%s\x1b[0m", `CLOSING THE transport  `);

      transport.close();
    }

    // if (!items.length) return;
    // items.forEach((item, Index) => {
    //   if (item.socketId === socketId) {
    //   //  console.log("\x1b[33m%s\x1b[0m", `CLOSING THE ${type}`);
    
    //     item[type].close();
    //     items.splice(Index, 1);

    //   }
    // });
  };
  //this function called when user is disconnect from the server
  removeItems = (items, socketId, type) => {
    if (!items.length) return;
    items.forEach((item, Index) => {
      if (item.socketId === socketId) {
      //  console.log("\x1b[33m%s\x1b[0m", `CLOSING THE ${type}`);
    
        item[type].close();
        items.splice(Index, 1);

      }
    });
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

     //   console.log(`transport id: ${transport.id}`);

        transport.on("dtlsstatechange", (dtlsState) => {
          if (dtlsState === "closed") {
            transport.close();
          }
        });

        transport.on("close", () => {
        //  console.log("\x1b[31m%s\x1b[0m", `transport closed}`);
        });

        resolve(transport);
      } catch (error) {
        reject(error);
      }
    });
  };

  //this function used to get specifc producerTransport
  getTransport = (socketId) => {

    const transport  = peers.get(socketId).transports;
    
    let returnProducerTransport;

    for(const [,producerTransport] of transport) {

     if(!producerTransport.consumer) returnProducerTransport = producerTransport;

    }

    // const [producerTransport] = transports.filter(
    //   (transport) => transport.socketId === socketId && !transport.consumer
    // );
    return returnProducerTransport;

  };

  //this function addTransport save transport to the Transport array
  addTransport = (transport, roomName, consumer) => {
/*     console.log("AA TRANSPORT");
    console.log(transports.length); */

    peers.get(socket.id).transports.set(transport.id, transport);

 //   transports.push({ socketId: socket.id, transport, roomName, consumer }),
      /*     transports = [
      ...transports,
      { socketId: socket.id, transport, roomName, consumer },
    ];
 */
      // (peers[socket.id] = {
      //   ...peers[socket.id],
      //   transports: [...peers[socket.id].transports, transport.id],
      // });

   // console.log(transports.length);
  };

  return {
    addTransport,
    getTransport,
    createWebRtcTransport,
    removeItems,
    addConsumer,
    addProducer,
    disConnectPeer,
    informViewrs,
    informConsumers,
  };
};

module.exports = mediaSoupHelper;
