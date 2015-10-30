var core2048 = require('./core2048.js');
var socket2048 = require('./socket2048');

function RoomIo(io, name) {
  this.emit = function() {
    var to_room = io.to(name);
    to_room.emit.apply(to_room, arguments);
  }
}

function Room(io, name) {
  this.name = name;
  this.sockets = new Set();
  this.io = new RoomIo(io, name);

  var args = socket2048(this.io);
  this.game = new core2048.GameManager(4, args.inputManager, args.actuator, args.storageManager);
}

Room.prototype.isEmpty = function() {
  return this.sockets.size === 0;
}

Room.prototype.tearDown = function() {
  for (var entry of this.sockets) {
    var socket = entry[0];
    this.leave(socket);
  }
}

Room.prototype.join = function(socket) {
  if (this.sockets.has(socket)) throw "Socket already in room";
  this.sockets.add(socket);
  socket.join(this.name);

  this.game.storageManager.onJoin(socket);
  this.game.inputManager.onJoin(socket);
  socket.emit("joinRoom", this.name);
}

Room.prototype.leave = function(socket) {
  if (!this.sockets.has(socket)) throw "Socket not in room";
  this.sockets.delete(socket);
  socket.leave(this.name);

  this.game.inputManager.onLeave(socket);
}

function RoomManager(io) {
  this.io = io;
  this.rooms = new Map();
  this.socket_to_room_name = new Map();

  this.rooms.set("default", new Room(io, "default"));

  var self = this;
  io.on('connection', function(socket) {
    self.joinOrCreateRoom(socket, "default");

    socket.on('room', function(data) {
      var room_name = JSON.parse(data);
      if (typeof(room_name) === "string" && room_name.search("\\s") < 0) {
        var room = self.joinOrCreateRoom(socket, room_name);
        var msg = self.getJoinedRoomMsg(room);
        var data = {
          msg: msg,
        };
        socket.emit('chatMessage', JSON.stringify(data));
      }
    });
    socket.on('listRooms', function() {
      var roomList = Array.from(self.rooms.keys());
      var roomListStr = roomList.join(", ");
      var data = {
        msg: "Online rooms: " + roomListStr,
      };
      socket.emit('chatMessage', JSON.stringify(data));
    });
    socket.on('disconnect', function() {
      var room = self.socketRoom(socket);
      if (room) self.leaveRoom(socket, room);
    });
  });
}

RoomManager.prototype.getJoinedRoomMsg= function(room) {
  var users = room.sockets.size - 1;
  switch(users) {
    case 0:
      return "You created room " + room.name;
    case 1:
      return "You joined room " + room.name + ". There is 1 other user in this room";
    default:
      return "You joined room " + room.name + ". There are " + users + " other users in this room";
  }
}

RoomManager.prototype.socketRoom = function(socket) {
  var room_name = this.socket_to_room_name.get(socket.id);
  if (!room_name) return null;
  return this.rooms.get(room_name);
}

RoomManager.prototype.joinOrCreateRoom = function(socket, room_name) {
  // Exit current socket room
  var prevRoom = this.socketRoom(socket);
  if (prevRoom) {
    if (prevRoom.name == room_name) return;
    this.leaveRoom(socket, prevRoom);
    
    if (prevRoom.isEmpty() && prevRoom.name !== "default") {
      prevRoom.tearDown();
      this.rooms.delete(prevRoom.name);
    }
  }

  // Get or Create room if it doesn't exist
  var room = this.rooms.get(room_name);
  if (!room) {
    room = new Room(this.io, room_name);
    this.rooms.set(room_name, room);
  }

  room.join(socket);
  this.socket_to_room_name.set(socket.id, room_name);
  return room;
}

RoomManager.prototype.leaveRoom = function(socket, room) {
  this.socket_to_room_name.delete(socket.id);
  room.leave(socket);
}

module.exports = function(io) {
  return new RoomManager(io);
}
