class RoomHelper {
  constructor(socket) {
    this.GetRoomsNames = this.GetRoomsNames.bind(this);
    this.IsPublic = this.IsPublic.bind(this);
    this.GetTheStringFullRoomName = this.GetTheStringFullRoomName.bind(this);
    this.socket = socket;
    this.isJsonString = this.isJsonString.bind(this);
  }
  //this function create a name for the viewr
  GenerateRoomeTrafic(id) {
    let rom = Math.floor(Math.random() * 1000000);
    return rom + "@" + id;
  }

  //get the user id
  GenerateUserId(username) {
    // let username =  Math.floor(Math.random() * 1000000);

    return username;
  }

  //this function will check if the room is public or not
  IsPublic(room, peers) {
    let peerslist = Object.values(peers);
    let Theroom = { title: "" };
    try {
      Theroom = JSON.parse(room);
    } catch (e) {
      return null;
    }

    let admin = peerslist.find(
      (peer) =>
        peer.peerDetails.isAdmin == true && peer.roomName == Theroom.title
    );

    return admin ? admin.peerDetails.IsPublic : false;
  }

  //this function will return thr current live rooms names
  GetRoomsNames(peers) {
    //socket.rooms
    //  console.log("THE ALL PEERS ")
    let myo = this.socket.adapter.rooms;

    // console.log("GET THE ROOMS NAMES :");

    //  console.log(myo)
    let obj = [];
    myo.forEach((element, index) => {
      let ispublic = this.IsPublic(index, peers);

      if (index != null && ispublic) {
        obj.push(JSON.parse(index).title);
      }
    });
    // console.log(obj);
    return obj;
  }

  //is the user viwer or gone join the room
  IsViewer(obj) {
    try {
      let c = JSON.parse(obj);
    } catch (e) {
      return null;
    }
    return c.IsViewer;
  }

  //is the user set the room as public
  GetIsPublic(obj) {
    let c;
    try {
      c = JSON.parse(obj);
    } catch (e) {
      return null;
    }
    return c.IsPublic;
  }

  //get this room name
  GetRoomName(obj) {
    let c;
    try {
      c = JSON.parse(obj);
    } catch (e) {
      //console.log('not object')
      return null;
    }
    return c.title;
  }

  //this function extract the room info
  GetTheFullRoomName(name) {
    let myo = this.socket.adapter.rooms;
    let rn = null;
    myo.forEach(function (index) {
      try {
        let c = JSON.parse(index);
      } catch (e) {
        return null;
      }
      console.log("GetTheFullRoomName GetTheFullRoomName");

      console.log(name);
      console.log(c);
      if (c.title == name) {
        rn = c;
      }
    });

    return rn;
  }

  //this function extract the room info and build the room name
  GetTheStringFullRoomName(TheroomName) {
    FullRomeName = this.GetTheFullRoomName(TheroomName);

    if (FullRomeName !== null) {
      FullRomeName =
        '{"title":"' +
        FullRomeName.title +
        '","BossId":"' +
        FullRomeName.BossId +
        '","TraficRoom":"' +
        FullRomeName.TraficRoom +
        '"}';
    }

    return FullRomeName;
  }

  //get the room admin id
  GetRoomBossId(room, rooms, peers) {
    let users = rooms[room].peers;

    let admin = users.find((peer) => peers[peer].peerDetails.isAdmin == true);

    return peers[admin];
  }

  isJsonString(str) {
    console.log(str)
    try {
      JSON.parse(str);
    } catch (e) {
      console.log('\x1b[33m%s\x1b[0m',`THIS IS FALSE `);

      return false;
    }
    console.log('\x1b[33m%s\x1b[0m',`THIS IS TRUE`);

    return true;
  }

  //chekc if the room exist
  IsRommeExist(room, socket) {
    let myo = this.socket.adapter.rooms;

    let obj = [];

    myo.forEach( (element, index) =>{

      if (this.isJsonString(index)) {
        console.log(`IS THE ROOM : ${index} EXIST IN THE ACTIVE ROOMS IN THE NEXT LIST:`);

        obj.push(JSON.parse(index).title);
      }

    });

  //  console.log(`IS THE ROOM : ${room} EXIST IN THE ACTIVE ROOMS IN THE NEXT LIST:`);
   // console.log(obj)
    return obj.includes(room);
  }

  //chekc if room is fully acoupy
  IsRoomFull(room) {
    try {
      if (this.socket.rooms[room].length >= 5) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  //get the room name iam i
  GetRoomsIamIn(socket) {
    /*     let c = [];
    Object.getOwnPropertyNames(socket.rooms).forEach(e => {
      if (this.GetRoomName(e) != null) {
        c.push(this.GetRoomName(e))
      }

    })
     */
    const roomStr = [...socket.rooms][1];

    //console.log("DISPLAYING THE ROOM STR");
    //console.log(roomStr);
    if (roomStr === "mainrrom") return roomStr;
    const obj = JSON.parse(roomStr);

    return obj.title;
  }

  //quit all room iam connected to
  LeavAllRooms(socket) {
    let AllRome = this.GetRoomsIamIn(socket);
    if (AllRome === "mainrrom") {
      socket.leave(AllRome);
      return true;
    }
    const theroom = this.GetTheStringFullRoomName(AllRome);
    if (theroom) socket.leave(theroom);
    //  if (AllRome != null) {
    //  AllRome.forEach(rome => {

    //   socket.leave('{"title":"' + rome + '"}')

    //  })
    //  }
    return true;
  }
}

exports.RoomHelper = RoomHelper;
