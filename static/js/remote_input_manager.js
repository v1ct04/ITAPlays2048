function RemoteInputManager(socket) {
  this.events = {};

  this.listen(socket);
}

RemoteInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

RemoteInputManager.prototype.emit = function (event) {
  var callbacks = this.events[event];
  if (callbacks) {
    var args = [];
    for (var i = 1; i < arguments.length; i++) 
      args.push(arguments[i]);

    callbacks.forEach(function (callback) {
      callback.apply(null, args);
    });
  }
};

RemoteInputManager.prototype.listen = function (socket) {
  var self = this;

  socket.on('move', function(data) {
    var m = JSON.parse(data);
    self.emit('move', m.dir, new Tile(m.tile.position, m.tile.value));
  });
  socket.on('keepPlaying', function() {
    self.emit('keepPlaying');
  });
  socket.on('restart', function(gameState) {
    self.emit('restart', JSON.parse(gameState));
  });
};
