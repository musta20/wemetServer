let Ajv = require("ajv");
const { RoomHelper } = require("../lib/roomHelper");

module.exports = ({
  socket,
  peers,
  TheRoomHelper,
  producers,
  createRoom,
  rooms,
  fs,
}) => {
  let ajv = new Ajv();
  //the schema used to valdait the input
  const schema = {
    properties: {
      name: {
        type: "string",
        minLength: 5,
        maxLength: 8,
        pattern: "^[a-zA-Z0-9]{4,10}$",
      },
    },
  };

  socket.on("leave", (name) => {

      peers.get(socket.id).producers.forEach((producer) => {
        producer.close();
      });

  //  console.log("\x1b[31m%s\x1b[0m", `closeing closing`);

    // const Userproduser = producers.find(
    //   (producer) => producer.socketId === socket.id
    // );
  //  peer.get(socket.id).producers.get(socket.id).close();
  //  let Userproduser = TheRoomHelper.GetTheUserProducers(socket);

 //   if (Userproduser) Userproduser.producer.close();
  //  let TheRoomLeav = TheRoomHelper.LeavAllRooms(socket);

  });

  //this event used to HiddeTheRoom or un Hidde Th eRoom  by the admin
  socket.on("HiddeTheRoom", (room, fun) => {

    const   isAdmin = peers.get(socket.id).peerDetails.isAdmin;
    if (!isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }

    /*     if (!peers[socket.id].peerDetails.IsPublic) {
          peers[socket.id].peerDetails.IsPublic = true;
          fun({ status: true, room: "room is locked" });
          return;
        } */
   
    peers.get(socket.id).peerDetails.IsPublic =!isAdmin;
    fun({ status: true, room: "room is unlocked" });
  });

  //chanche the value of isstream buy the room
  socket.on("isStream", (set, fun) => {
    const isAdmin = peers.get(socket.id).peerDetails.isAdmin;
    if (!isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }

    /*    if (peers[socket.id].peerDetails.isStream) {
      peers[socket.id].peerDetails.isStream = false;
    } else { */
    peers.get(socket.id).peerDetails.isStream =
      !peers.get(socket.id).peerDetails.isStream;
    //}

    fun({ status: true, room: "his gone" });
  });

  //chanche the value of IsPublic buy the room
  socket.on("IsPublic", (set, fun) => {
    const isAdmin = peers.get(socket.id).peerDetails.isAdmin;

    if (!isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }
    /*  if (peers[socket.id].peerDetails.IsPublic) {
      peers[socket.id].peerDetails.IsPublic = false;
    } else { */
    peers.get(socket.id).peerDetails.IsPublic =
      !peers.get(socket.id).peerDetails.IsPublic;
    //  }

   // console.log("IsPublic");

    fun({ status: true, room: "his gone" });
  });

  //this check if the room Exist
  socket.on("IsRommeExist", (room, fun) => {

    if (!TheRoomHelper.IsRommeExist(room, socket)) {
      fun({ status: true, room: room });
      return;
    }
    fun({
      status: false,
      room:
        "the room " + room + " is all ready exict",
    });
  });

  //this event used to lock or unlock the room by the admin
  socket.on("LockTheRoom", (room, fun) => {
   // console.log("LockTheRoom");
  const isAdmin = peers.get(socket.id).peerDetails.isAdmin;
    if (!isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }

    /*     if (!peers[socket.id].peerDetails.isRoomLocked) {
      peers[socket.id].peerDetails.isRoomLocked = true;
      fun({ status: true, room: "room is locked" });
      return;
    } */
    // console.log(!peers[socket.id].peerDetails.isRoomLocked)
    //  console.log(peers[socket.id].peerDetails.isRoomLocked)
    peers.get(socket.id).peerDetails.isRoomLocked =
      !peers.get(socket.id).peerDetails.isRoomLocked;
    fun({ status: true, room: "room is unlocked" });
  });

  //this event ban user from the room by the admin
  socket.on("kik", (isocketId, fun) => {
    const isAdmin = peers.get(socket.id).peerDetails.isAdmin;
    if (!isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }
    socket.to(isocketId).emit("GoOut");

    fun({ status: true, room: "his gone" });
  });

  const createRoomForFristTime = async ({ title, IsPublic }, fun) => {
    TheRoomHelper.LeavAllRooms(socket);
    // FullRomeName = {
    //   title: title,
    //   BossId: socket.id,
    //   TraficRoom: TheRoomHelper.GenerateRoomeTrafic(socket.id),
    // }
    // FullRomeName =
    //   '{"title":"' +
    //   title +
    //   '","BossId":"' +
    //   socket.id +
    //   '","TraficRoom":"' +
    //   TheRoomHelper.GenerateRoomeTrafic(socket.id) +
    //   '"}';

    const router1 = await createRoom(title, socket.id);
  //  console.log("CREATE STARTING STREAM ");


  peers.set(socket.id, {
    socket,
    roomName: title,
    transports:new Map(),
    producers: new Map(),
    consumers:new Map(),
    peerDetails: {
      name: "",
      isAdmin: true,
      isRoomLocked: false,
      isStream: true,
      IsPublic: IsPublic,
    },
  });
  
    // peers[socket.id] = {
    //   socket,
    //   roomName: title,
    //   transports: new Map(),
    //   producers: [],
    //   consumers: [],
    //   peerDetails: {
    //     name: "",
    //     isAdmin: true,
    //     isRoomLocked: false,
    //     isStream: true,
    //     IsPublic: IsPublic,
    //   },
    // };

    const rtpCapabilities = router1.rtpCapabilities;

    socket.join(title);
    socket.to("mainrrom").emit("AddRoom", { title });
    
    fun({
      status: true,
      room: title,
      First: true,
      BossId: socket.id,
      rtpCapabilities: rtpCapabilities,
    });
    return;
  };

  const joinExistRoom = async (roomName, fun) => {
    UserId = TheRoomHelper.GenerateUserId(socket.id);
  //  FullRomeName = TheRoomHelper.GetTheFullRoomName(roomName);

    let admin = TheRoomHelper.GetRoomBossId(roomName, rooms, peers);

    if (admin.peerDetails.isRoomLocked) {
      // fun({ status: false, room: "the room " + roomName + " is locked " });
      watchTheStream(roomName, fun);
      return;
    }

    // let BossId = FullRomeName.BossId;
    // FullRomeName =
    //   '{"title":"' +
    //   FullRomeName.title +
    //   '","BossId":"' +
    //   FullRomeName.BossId +
    //   '","TraficRoom":"' +
    //   FullRomeName.TraficRoom +
    //   '"}';
/*     console.log("JOINING THE ROOM");
    console.log(FullRomeName);
    console.log("ALL THE ROOMS NAMES");

    console.log(socket.adapter.rooms); */
    socket.join(roomName);

    const router1 = await createRoom(roomName, socket.id);

    peers.set(socket.id,{
      socket,
      roomName, // Name for the Router this Peer joined
      
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      peerDetails: {
        name: "",
        isAdmin: false, // Is this Peer the Admin?
      },
    });

    const rtpCapabilities = router1.rtpCapabilities;

    fun({
      status: true,
      BossId: BossId,
      First: false,
      UserId: UserId,
      room: roomName,
      rtpCapabilities: rtpCapabilities,
    });
  };

  const watchTheStream = async (roomName, fun) => {
    UserId = TheRoomHelper.GenerateUserId(socket.id);

   // FullRomeName = TheRoomHelper.GetTheFullRoomName(roomName);

   // let peerslist = Object.values(peers);
   let admin = TheRoomHelper.GetRoomBossId(roomName, peers);
   try {
    //  let admin = peerslist.find((peer) => peer.peerDetails.isAdmin === true);

       
      
      if (!admin.peerDetails.isStream) {
        fun({
          status: false,
          room:
            "the room " +
            roomName +
            " is not Streamed ",
        });
        return;
      }
    } catch (e) {
      console.error(e);
    }

   TraficRoom =TheRoomHelper.GenerateRoomeTrafic(roomName)


    let clients = TheRoomHelper.GetAllUsersInRoom(TraficRoom);


    const TraficRoomRouter = await createRoom(TraficRoom, socket.id);

    peers.set(socket.id , {
      socket,
      roomName: TraficRoom, // Name for the Router this Peer joined
      transports: new Map(),
      producers:  new Map(),
      consumers:  new Map(),
      peerDetails: {
        name: "",
        isAdmin: false, // Is this Peer the Admin?
      },
    });

  //  const [first] = clients;

    if (!clients.size) {
      socket.join(TraficRoom);

      let mainroom = rooms.get(title);

      //let router2 = rooms.get(TraficRoom);

      clients.forEach(async (user) => {
       // if (producerData.roomName === FullRomeName.title) {
          try {
            await mainroom.pipeToRouter({
              producerId: user.producer.id,
              router: TraficRoomRouter,
            });
          } catch (e) {}
       // }
      });
    }

    const rtpCapabilities = TraficRoomRouter.rtpCapabilities;

    fun({
      status: false,
      BossId: FullRomeName.BossId,
      rtpCapabilities: rtpCapabilities,
      room: "the room " + TraficRoom + " is watching  ",
    });
  };

  /*
  this the frist event user call when intering the room
  1-when reving the room name it will vladit it
  2-chek if the room not excit it will create it and set you as admin
  3-if the room excist will try to join it 
  4-if the room not setreamed will not join and just send you to hom page
  5-if the room is locked it will not allow user to join and the user becam just viewr
  */

  socket.on("CreateStream", async (roomProps, fun) => {
    let roomName = roomProps.title;

    var valid = ajv.validate(schema, { name: roomName });
   // console.log(roomName);
    if (!valid) {
      if (
        ajv.errors[0].message == 'should match pattern "^[a-zA-Z0-9]{4,10}$"'
      ) {
        fun({
          status: false,
          room: "the name is not valid special character is not allowed",
        });
        return;
      } else {
        fun({
          status: false,
          room: "the name is not valed " + ajv.errors[0].message,
        });
        return;
      }
    }

    if (!TheRoomHelper.IsRommeExist(roomName, socket)) {
      return createRoomForFristTime(roomProps, fun);
    }

    if (
      TheRoomHelper.IsRommeExist(roomName, socket) &&
      !roomProps.IsViewer &&
      !TheRoomHelper.IsRoomFull(roomName)
    ) {
      joinExistRoom(roomName, fun);
      return;
    }

    watchTheStream(roomName, fun);
  });

  //this event save the imge sent by the user as thumnal for live room
  socket.on("saveimg", async (img, fun) => {

    let base64Data = img.replace(/^data:image\/png;base64,/, "");

    let imgname = TheRoomHelper.GetRoomsIamIn(socket) + ".png";

     await fs.writeFile("src/uploads/" + imgname, base64Data, "base64", (err) => {
      if (err) throw err;
    });

    fun(imgname)


  });

  //the event display current live room and add or remove at real time
  socket.on("getroom", (room, fun) => {
    let rroommss = TheRoomHelper.GetRoomsNames(peers);
    //  console.log("SHOWING THE ROOMS IN LIST:");
    // console.log(rroommss);

    socket.join("mainrrom");

    fun(rroommss);
  });

  //the event take a privet message from user and frowrd it to specifc user
  socket.on("SendPrivetMessage", (id, fun) => {
    //console.log('PrivetMessage')
    //console.log(id)

    socket.to(id.id).emit("PrivetMessage", { Message: id.Message });
    fun({ status: true, room: "message sent" });
  });

  //the event take a  message and brodcast it to the room
  socket.on("Message", (room, Message) => {
    // FullRomeName = TheRoomHelper.GetTheFullRoomName(
    //   TheRoomHelper.GetRoomName(room)
    // );
    
    // FullRomeName =
    //   '{"title":"' +
    //   FullRomeName.title +
    //   '","BossId":"' +
    //   FullRomeName.BossId +
    //   '","TraficRoom":"' +
    //   FullRomeName.TraficRoom +
    //   '"}';
    //console.log("the room iam emmetin to ==============>")
    //console.log(FullRomeName)
    socket.to(TheRoomHelper.GenerateRoomeTrafic(room)).emit("Message", {
      Message,
    });

    socket.to(room).emit("Message", {
      Message,
    });
  });
};
