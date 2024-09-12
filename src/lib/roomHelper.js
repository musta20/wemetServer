class RoomHelper {
  constructor(socket) {
    this.GetRoomsNames = this.GetRoomsNames.bind(this);
    
    this.IsPublic = this.IsPublic.bind(this);
    
    this.GetTheStringFullRoomName = this.GetTheStringFullRoomName.bind(this);
    
    this.socket = socket;
    
    this.isJsonString = this.isJsonString.bind(this);

    this.GetAllUsersInRoom = this.GetAllUsersInRoom.bind(this);

    this.broadcasters = new Map();
    
    this.room = new Map();

  }

  //this function create a name for the viewr
  GenerateRoomeTrafic(id) {
    //let rom = Math.floor(Math.random() * 1000000);
    return "traffic@" + id;
  }

  //get the user id
  GenerateUserId(username) {
    // let username =  Math.floor(Math.random() * 1000000);

    return username;
  }

  //this function will check if the room is public or not
  IsPublic(room, peers) {
    for (const [, peer] of peers) {
      if (peer.peerDetails.isAdmin && peer.roomName === room) {
        return peer.peerDetails.IsPublic;
      }
    }
    return false;
  }

  //this function will return thr current live rooms names
  GetRoomsNames(peers) {
 
    let rooms = this.socket.adapter.rooms;
    let publicRoomTitles = [];
    
    for (const [roomKey, roomValue] of rooms) {
      if (roomKey !== null) {
        try {

          if (this.IsPublic(roomKey, peers)) {
            publicRoomTitles.push(roomKey);
          }
        } catch (error) {
          console.error(`Error parsing room key: ${roomKey}`, error);
        }
      }
    }

    return publicRoomTitles;
  }

    //this function will return thr current live rooms names
    GetAllUsersInRoom(room) {
      
      const fetchSockets = this.socket.in(room).fetchSockets();
  
      // if (rooms.has(room)) {
      //   return rooms.get(room);
      // }
      
      return fetchSockets;
    }

  //is the user viwer or gone join the room
  IsViewer(obj) {
    let c
    try {
       c = JSON.parse(obj);
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
      ////console.log('not object')
      return null;
    }
    return c.title;
  }

  //this function extract the room info
  GetTheFullRoomName(name) {
    let myo = this.socket.adapter.rooms;
    let fullRoomName ;
    myo.forEach( (element,index) => {
     
      if(!this.isJsonString(index)) return;
     
        let c = JSON.parse(index);
      
  
      if (c.title == name) {
        fullRoomName = c;
      }
    });

    return fullRoomName;
  }

  //this function extract the room info and build the room name
  GetTheStringFullRoomName(TheroomName) {

   let FullRomeName = this.GetTheFullRoomName(TheroomName);
 
let retunFullRomeName;
    if (FullRomeName !== null) {

      retunFullRomeName =
        '{"title":"' +
        FullRomeName.title +
        '","BossId":"' +
        FullRomeName.BossId +
        '","TraficRoom":"' +
        FullRomeName.TraficRoom +
        '"}';
    }

    return retunFullRomeName;
  }

  //get the room admin id
  GetRoomBossId(room, peers) {
    for (const [peerId, peer] of peers) {
      if (peer.roomName === room && peer.peerDetails.isAdmin === true) {
        return peerId;
      }
    }
    return undefined;
  }

  isJsonString(str) {
    //console.log(str)
    try {
      JSON.parse(str);
    } catch (e) {

      return false;
    }

    return true;
  }

  //chekc if the room exist
  IsRoomExist(room) {
    const rooms = this.socket.adapter.rooms;
    return rooms.has(room);
  }

  //chekc if room is fully acoupy
  IsRoomFull(room) {
    try {
      if (this.socket.in(room).fetchSockets.length >= 5) {
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
    return socket.rooms;
  //   const roomStr = [...socket.rooms][1];

  //   ////console.log("DISPLAYING THE ROOM STR");
  //  // console.log(roomStr);
  //   if (roomStr === "mainrrom") return roomStr;
  //   if(!this.isJsonString(roomStr)) return "";
  //   const obj = JSON.parse(roomStr);

  //   return obj.title;
  }

  //quit all room iam connected to
  LeavAllRooms(socket) {


  return new Promise((resolve) => {
    const rooms = Array.from(socket.rooms);
    
    // The first item is the socket's ID, so we start from the second item
    for (let i = 1; i < rooms.length; i++) {
      socket.leave(rooms[i]);
    }
    
    // We use process.nextTick to ensure all leave operations have completed
    process.nextTick(() => {
      resolve();
    });
  });
   // let AllRome = this.GetRoomsIamIn(socket);
   // if(!AllRome) return true;
   // if (AllRome === "mainrrom") {
   //   socket.leave(AllRome);
   //   return true;
   // }
   // const theroom = this.GetTheStringFullRoomName(AllRome);
   // if (theroom) socket.leave(theroom);
    //  if (AllRome != null) {
    //  AllRome.forEach(rome => {

    //   socket.leave('{"title":"' + rome + '"}')

    //  })
    //  }
 //   return true;
  }
}

exports.RoomHelper = RoomHelper;
