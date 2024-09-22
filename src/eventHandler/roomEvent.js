let Ajv = require("ajv");
const fs = require("fs");

module.exports = ({ socket, peers, TheRoomHelper, getOrCreateRoom, rooms }) => {
  let ajv = new Ajv();
  //the schema used to validate the input
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

  //this event used to HiddeTheRoom or un hide Th Room  by the admin
  socket.on("HiddeTheRoom", (room, fun) => {
    const userIsAdmin = peers.get(socket.id);
    if (!userIsAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }

    userIsAdmin.peerDetails.IsPublic = !userIsAdmin.peerDetails.IsPublic;
    fun({ status: true, room: "room is unlocked" });
  });

  //change the value of isStream buy the room
  socket.on("isStream", (set, fun) => {
    const userAdmin = peers.get(socket.id);
    if (!userAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }

    userAdmin.peerDetails.isStream = !userAdmin.peerDetails.isStream;

    fun({ status: true, room: "his gone" });
  });

  //change the value of IsPublic buy the room
  socket.on("IsPublic", (set, fun) => {
    const userAdmin = peers.get(socket.id);

    if (!userAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "your not admin" });
      return;
    }

    userAdmin.peerDetails.IsPublic = !userAdmin.peerDetails.IsPublic;

    fun({ status: true, room: "IsPublic status changed" });
  });

  //this check if the room Exist
  socket.on("IsRoomExist", (room, fun) => {
     if (!TheRoomHelper.IsRoomExist(room, socket)) {
      fun({ status: true, room: room });
      return;
    }
    fun({
      status: false,
      room: "the room " + room + " is all ready exict",
    });
  });

  //this event used to lock or unlock the room by the admin
  socket.on("LockTheRoom", (room, fun) => {

    const userIsAdmin = peers.get(socket.id);

    if (!userIsAdmin.peerDetails.isAdmin) {
      fun({ status: false, room: "you are not the admin" });
      return;
    }

    userIsAdmin.peerDetails.isRoomLocked =
      !userIsAdmin.peerDetails.isRoomLocked;
    fun({ status: true, room: "room is unlocked" });
  });

  //this event ban user from the room by the admin
  socket.on("banUser", ({ userId }, fun) => {
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

    const router1 = await getOrCreateRoom(title);

    peers.set(socket.id, {
      socket,
      roomName: title,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
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
     UserId = TheRoomHelper.GenerateUserId(socket.id);

    let admin = TheRoomHelper.GetRoomBossId(roomName, peers);
    if (peers.get(admin).peerDetails.isRoomLocked) {

      watchTheStream(roomName, fun);
      return;
    }

    socket.join(roomName);

    const router1 = await getOrCreateRoom(roomName);

    peers.set(socket.id, {
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
     UserId = TheRoomHelper.GenerateUserId(socket.id);

    let BossId = TheRoomHelper.GetRoomBossId(roomName, peers);
    let admin = peers.get(BossId);

    try {

      if (!admin.peerDetails.isStream) {
        fun({
          status: false,
          room: "the room " + roomName + " is not Streamed ",
        });
        return;
      }
    } catch (e) {
      console.error(e);
    }

    TraficRoom = TheRoomHelper.GenerateRoomeTrafic(roomName);

    let clients = socket.adapter.rooms.get(roomName);

    const TraficRoomRouter = await getOrCreateRoom(TraficRoom, "traffic");

    peers.set(socket.id, {
      socket,
      roomName: TraficRoom, // Name for the Router this Peer joined
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      peerDetails: {
        name: "",
        isAdmin: false, // Is this Peer the Admin?
      },
    });

    if (!clients.length) {
      socket.join(TraficRoom);

      let mainroom = rooms.get(roomName);

      clients.forEach(async (user) => {
        userProducer = peers.get(user);

        for (const [key, value] of userProducer.producers) {
          try {
            await mainroom.pipeToRouter({
              producerId: key,
              router: TraficRoomRouter,
            });
          } catch (e) {
            Logger.error(e);
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
  *** This the first event user call when entering the room 

  1-when receive the room name it will validate it
  2-check if the room not exist it will create it and set you as admin
  3-if the room exist it will try to join it 
  4-if the room not streamed will not join and just send you to home page
  5-if the room is locked it will not allow user to join and the user become just watcher
  */

  socket.on("CreateStream", async (roomProps, fun) => {
    let roomName = roomProps.title;
    socket.data.name = roomProps.userName
      ? roomProps.userName
      : Array(5)
          .fill("")
          .map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26)))
          .join("");

    var valid = ajv.validate(schema, { name: roomName });

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
      console.log('createRoomForFristTime');
      await createRoomForFristTime(roomProps, fun);
      return 
    }

    // console.log('this is room exist '+ TheRoomHelper.IsRoomExist(roomName, socket));
    // console.log('roomProps.IsViewer  '+ roomProps.IsViewer );
    // console.log('is room full '+ TheRoomHelper.IsRoomFull(roomName));


    if (
      TheRoomHelper.IsRoomExist(roomName, socket) &&
      !roomProps.IsViewer &&
      !TheRoomHelper.IsRoomFull(roomName)
    ) {
      console.log('YES IAMM CALLLED')
      joinExistRoom(roomName, fun);
      return;
    }

    watchTheStream(roomName, fun);
  });

  //this event save the image sent by the user as thumbnail for the live room
  socket.on("saveimg", async (img, fun) => {
    let base64Data = img.replace(/^data:image\/png;base64,/, "");

    let imgname = peers.get(socket.id).roomName + ".png";

    await fs.writeFile(
      "src/uploads/" + imgname,
      base64Data,
      "base64",
      (err) => {
        if (err) throw err;
      }
    );

    fun(imgname);
  });

  //the event display current live room and add or remove at real time
  socket.on("getroom", (room, fun) => {
    let rroommss = TheRoomHelper.GetRoomsNames(peers);

    socket.join("mainrrom");

    fun(rroommss);
  });

  //the event take a privet message from user and forward it to specific user
  socket.on("SendPrivetMessage", (id, fun) => {
    socket.to(id.id).emit("PrivetMessage", { Message: id.Message });
    fun({ status: true, room: "message sent" });
  });

  //the event take a  message and broadcast it to the room
  socket.on("Message", (room, Message ) => {
 console.log(Message , room ,socket.data.name);
    socket
      .to(TheRoomHelper.GenerateRoomeTrafic(room))
      .emit("Message", {
        Message,
        name: socket.data.name
      });

    socket.to(room).emit("Message", {
      Message,
      name: socket.data.name
    });
  });
};
