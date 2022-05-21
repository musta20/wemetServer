class RoomHelper {

  constructor(socket) {
    this.GetRoomsNames = this.GetRoomsNames.bind(this)
    this.IsPublic = this.IsPublic.bind(this)
    this.GetTheStringFullRoomName = this.GetTheStringFullRoomName.bind(this)
    this.socket = socket;
  }
  //this function create a name for the viewr 
  GenerateRoomeTrafic(id) {
    var rom = Math.floor(Math.random() * 1000000);
    return rom + "@" + id;
  }

  //get the user id
  GenerateUserId(username) {
    // var username =  Math.floor(Math.random() * 1000000);


    return username;

  }

  //this function will check if the room is public or not
  IsPublic(room, peers) {
    //console.log(peers)
    //console.log("GetTheStringFullRoomName  GetTheStringFullRoomName  GetTheStringFullRoomName")
    //console.log(room)
    let peerslist = Object.values(peers)

    var admin = peerslist.find(peer => peer.peerDetails.isAdmin == true && peer.roomName == room.title)
    console.log("CHECKING THE ADMIN")
    console.log(admin)
    return admin ? admin.peerDetails.IsPublic : false
  }

  //this function will return thr current live rooms names
  GetRoomsNames(peers) {
                      //socket.rooms
    console.log(peers)
    var myo =  this.socket.rooms
    console.log(myo)
    var obj = [];
    myo.forEach(function (index) {
      console.log(index)
    
      let ispublic = this.IsPublic(index, peers)
      if (index != null && ispublic) {
        obj.push(index)
      }
    }.bind(this))
    return obj;

  }
  
  //is the user viwer or gone join the room
  IsViewer(obj) {

    try {
      var c = JSON.parse(obj)

    } catch (e) {

      return null
    }
    return c.IsViewer

  }

  //is the user set the room as public
  GetIsPublic(obj) {

    try {
      var c = JSON.parse(obj)

    } catch (e) {

      return null
    }
    return c.IsPublic

  }

  //get this room name
  GetRoomName(obj) {
    try {
      var c = JSON.parse(obj)

    } catch (e) {
      //console.log('not object')
      return null
    }
    return c.title

  }
 
  //this function extract the room info 
  GetTheFullRoomName(name) {
    var myo = this.socket.rooms
    var rn = null;
    Object.getOwnPropertyNames(myo).forEach(function (index) {
      console.log(index)
      try {
        var c = JSON.parse(index)


      } catch (e) {
        return null;
      }
      console.log('GetTheFullRoomName GetTheFullRoomName')

      console.log(name)
      console.log(c)
      if (c.title == name) {
        rn = c;

      }
    });

    return rn;
  }

  //this function extract the room info and build the room name 
  GetTheStringFullRoomName(TheroomName) {
    FullRomeName = this.GetTheFullRoomName(TheroomName)

    if (FullRomeName !== null) {
      FullRomeName = '{"title":"' + FullRomeName.title +
        '","BossId":"' + FullRomeName.BossId + '","TraficRoom":"' + FullRomeName.TraficRoom + '"}'
    }

    return FullRomeName
  }

  //get the room admin id
  GetRoomBossId(room, rooms, peers) {
    var users = rooms[room].peers

    let admin = users.find(peer => peers[peer].peerDetails.isAdmin == true)

    return peers[admin]

  }

  //chekc if the room exist
  IsRommeExist(room, socket) {
    var myo = this.socket.rooms
    var obj = [];
    Object.getOwnPropertyNames(myo).forEach(function (index) {
      try {
        var c = JSON.parse(index)

      } catch (e) {
        return [];
      }

      obj.push(c.title)
    });

    return obj.includes(room);
  }

  //chekc if room is fully acoupy
  IsRoomFull(room) {
    try {
      if (this.socket.rooms[room].length >= 5) {
        return true;
      }
    } catch (e) {

    }

    return false;
  }

  //get the room name iam i
  GetRoomsIamIn(socket) {
/*     var c = [];
    Object.getOwnPropertyNames(socket.rooms).forEach(e => {
      if (this.GetRoomName(e) != null) {
        c.push(this.GetRoomName(e))
      }

    })
     */
    const roomStr = [...socket.rooms][1];

    const obj = JSON.parse(roomStr);

   return obj.title
     
  }

  //quit all room iam connected to
  LeavAllRooms(socket) {
   // var AllRome = this.GetRoomsIamIn(socket);
 //  if (AllRome != null) {
    //  AllRome.forEach(rome => {

     //   socket.leave('{"title":"' + rome + '"}')

    //  })
  //  }
    return true;

  }


}


exports.RoomHelper = RoomHelper;