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

  //this function create a name for the viewr
  GenerateRoomeTrafic(id) {
     return "traffic@" + id;
  }

  //get the user id
  GenerateUserId(username) {

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
          logger.error(`Error parsing room key: ${roomKey}`, error);
        }
      }
    }

    return publicRoomTitles;
  }

  //this function will return thr current live rooms names
  GetAllUsersInRoom(room) {
    const fetchSockets = this.socket.in(room).fetchSockets();

    return fetchSockets;
  }

  //this function extract the room info and build the room name

  //get the room admin id
  GetRoomBossId(room, peers) {
    for (const [peerId, peer] of peers) {
      if (peer.roomName === room && peer.peerDetails.isAdmin === true) {
        return peerId;
      }
    }
    return undefined;
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
    return socket.rooms;
  }

  //quit all room iam connected to
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
