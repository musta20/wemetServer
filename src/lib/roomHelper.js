const Logger = require("./Logger");

const logger = new Logger();
class RoomHelper {
  constructor(socket) {
    this.GetRoomsNames = this.GetRoomsNames.bind(this);

    this.IsPublic = this.IsPublic.bind(this);

    this.socket = socket;

    this.GetAllUsersInRoom = this.GetAllUsersInRoom.bind(this);

    this.broadcasters = new Map();

    this.room = new Map();
  }

  //This function create a name for the viewer
  GenerateRoomeTrafic(id) {
     return "traffic@" + id;
  }



  //Get the user id
  GenerateUserId(username) {

    return username;
  }

  //This function will check if the room is public or not
  IsPublic(room, peers) {
    for (const [, peer] of peers) {
      if (peer.peerDetails.isAdmin && peer.roomName === room) {
        return peer.peerDetails.IsPublic;
      }
    }
    return false;
  }

  //This function will return the current live rooms names
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
          logger.error(`Error parsing room key: ${roomKey}`, error);
        }
      }
    }

    return publicRoomTitles;
  }

  //This function will return the current live rooms names
  GetAllUsersInRoom(room) {
     const roomClients = this.socket.adapter.rooms.get(room);
    if (!roomClients) {
      return [];
    }
    
    // const users = [];
    // console.log(roomClients)
    // for (const clientId of roomClients) {
    //   const clientSocket = this.socket.sockets.get(clientId);
    //   if (clientSocket) {
    //     users.push({
    //       id: clientId,
    //       username: clientSocket.data.username // Assuming you store username in socket.data
    //     });
    //   }
    // }
    
    return roomClients;
  }

  //Get the room admin id
  GetRoomBossId(room, peers) {
    for (const [peerId, peer] of peers) {
      if (peer.roomName === room && peer.peerDetails.isAdmin === true) {
        return peerId;
      }
    }
    return undefined;
  }

  //Check if the room exist
  IsRoomExist(room) {
     const rooms = this.socket.adapter.rooms;
 
     return rooms.has(room);
  }

  //Check if room is full
  IsRoomFull(room) {
    const length = this.socket.in(room).fetchSockets.length;
     try {
      if (length >= 4) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  //Get the current room name 
  GetRoomsIamIn(socket) {
    return socket.rooms;
  }

  //Quit all room iam connected to
  LeavAllRooms(socket) {
    return new Promise((resolve) => {
      const rooms = Array.from(socket.rooms);

      for (const [name, room] of rooms) {
        socket.leave(name);
      }

      // We use process.nextTick to ensure all leave operations have completed
      process.nextTick(() => {
        resolve();
      });
    });
  }
}

exports.RoomHelper = RoomHelper;
