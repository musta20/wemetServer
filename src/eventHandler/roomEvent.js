let Ajv = require("ajv");
const { RoomHelper } = require("../lib/roomHelper");
const fs = require("fs");

module.exports = ({
  socket,
  peers,
  TheRoomHelper,
  getOrCreateRoom,
  rooms,
 // fs,
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


  //this event used to HiddeTheRoom or un Hidde Th eRoom  by the admin
  socket.on("HiddeTheRoom", (room, fun) => {

    const userIsAdmin = peers.get(socket.id);
    if (!userIsAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }

    /*     if (!peers[socket.id].peerDetails.IsPublic) {
          peers[socket.id].peerDetails.IsPublic = true;
          fun({ status: true, room: "room is locked" });
          return;
        } */
   
          userIsAdmin.peerDetails.IsPublic =!userIsAdmin.peerDetails.IsPublic;
    fun({ status: true, room: "room is unlocked" });
  });

  //chanche the value of isstream buy the room
  socket.on("isStream", (set, fun) => {
    const userAdmin = peers.get(socket.id);
    if (!userAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }

    /*    if (peers[socket.id].peerDetails.isStream) {
      peers[socket.id].peerDetails.isStream = false;
    } else { */
    userAdmin.peerDetails.isStream = !userAdmin.peerDetails.isStream;
    //}

    fun({ status: true, room: "his gone" });
  });

  //chanche the value of IsPublic buy the room
  socket.on("IsPublic", (set, fun) => {
    const userAdmin = peers.get(socket.id);

    if (!userAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }
    /*  if (peers[socket.id].peerDetails.IsPublic) {
      peers[socket.id].peerDetails.IsPublic = false;
    } else { */
    userAdmin.peerDetails.IsPublic = !userAdmin.peerDetails.IsPublic;
    //  }

   // console.log("IsPublic");

    fun({ status: true, room: "IsPublic status changed" });
  });

  //this check if the room Exist
  socket.on("IsRommeExist", (room, fun) => {

    if (!TheRoomHelper.IsRoomExist(room, socket)) {
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
  const userIsAdmin = peers.get(socket.id);
   
    if (!userIsAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }



    userIsAdmin.peerDetails.isRoomLocked = !userIsAdmin.peerDetails.isRoomLocked;
     fun({ status: true, room: "room is unlocked" });
  });

  //this event ban user from the room by the admin
  socket.on("kik", ({userId}, fun) => {
    const userAdmin = peers.get(socket.id);
    if (!userAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }
    socket.to(userId).emit("GoOut");

    fun({ status: true, room: "his gone" });
  });

  const createRoomForFristTime = async ({ title, IsPublic }, fun) => {
    TheRoomHelper.LeavAllRooms(socket);
 
    const router1 = await getOrCreateRoom(title );
 

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
    console.log("joinExistRoom");
    UserId = TheRoomHelper.GenerateUserId(socket.id);
  //  FullRomeName = TheRoomHelper.GetTheFullRoomName(roomName);

    let admin = TheRoomHelper.GetRoomBossId(roomName, peers);
     if (peers.get(admin).peerDetails.isRoomLocked) {
      // fun({ status: false, room: "the room " + roomName + " is locked " });
      watchTheStream(roomName, fun);
      return;
    }

     
    socket.join(roomName);

    const router1 = await getOrCreateRoom(roomName );

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
      BossId: admin,
      First: false,
      UserId: UserId,
      room: roomName,
      rtpCapabilities: rtpCapabilities,
    });
  };

  const watchTheStream = async (roomName, fun) => {

    console.log("watchTheStream");
    UserId = TheRoomHelper.GenerateUserId(socket.id);

   // FullRomeName = TheRoomHelper.GetTheFullRoomName(roomName);

   // let peerslist = Object.values(peers);
   let BossId = TheRoomHelper.GetRoomBossId(roomName, peers);
   let admin = peers.get(BossId);
   
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


   let clients = socket.adapter.rooms.get(roomName);
   //await TheRoomHelper.GetAllUsersInRoom(TraficRoom);
 

    const TraficRoomRouter = await getOrCreateRoom(TraficRoom,'traffic');

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

  //  console.log(clients);
    if (!clients.length) {

      socket.join(TraficRoom);

      let mainroom = rooms.get(roomName);

    //  console.log(clients);
      clients.forEach(async (user) => {

         userProducer = peers.get(user);

         for(const [key, value] of userProducer.producers) {

          try {
            await mainroom.pipeToRouter({
              producerId:key,
              router: TraficRoomRouter,
            });
          } catch (e) {
            console.log('ERRROR IN PIPE TO ROUTER', e);
          }
         }
 
      });
    }
     const rtpCapabilities = TraficRoomRouter.rtpCapabilities;
     fun({
      status: false,
      BossId: BossId,
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

    if (!TheRoomHelper.IsRoomExist(roomName, socket)) {
      return createRoomForFristTime(roomProps, fun);
    }

    if (
      TheRoomHelper.IsRoomExist(roomName, socket) &&
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

    let imgname = peers.get(socket.id).roomName + ".png";

     await fs.writeFile("src/uploads/" + imgname, base64Data, "base64", (err) => {
      if (err) throw err;
    });

    fun(imgname)


  });

  //the event display current live room and add or remove at real time
  socket.on("getroom", (room, fun) => {
    let rroommss = TheRoomHelper.GetRoomsNames(peers);

    
    socket.join("mainrrom");

    fun(rroommss);
  });

  //the event take a privet message from user and frowrd it to specifc user
  socket.on("SendPrivetMessage", (id, fun) => {
   
    

    socket.to(id.id).emit("PrivetMessage", { Message: id.Message });
    fun({ status: true, room: "message sent" });
  });

  //the event take a  message and brodcast it to the room
  socket.on("Message", (room, Message) => {
 //  console.log("sending message " +Message)
    socket.to(TheRoomHelper.GenerateRoomeTrafic(JSON.parse(room).title)).emit("Message", {
      Message,
    });

    socket.to(JSON.parse(room).title).emit("Message", {
      Message,
    });
  });
};
