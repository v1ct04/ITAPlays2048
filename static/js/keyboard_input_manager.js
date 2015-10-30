function KeyboardInputManager(socket) {
  this.events = {};
  this.socket = socket;

  if (window.navigator.msPointerEnabled) {
    //Internet Explorer 10 style
    this.eventTouchstart    = "MSPointerDown";
    this.eventTouchmove     = "MSPointerMove";
    this.eventTouchend      = "MSPointerUp";
  } else {
    this.eventTouchstart    = "touchstart";
    this.eventTouchmove     = "touchmove";
    this.eventTouchend      = "touchend";
  }

  this.chatInput = document.querySelector("#chat-input");
  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
  if(this.socket) {
    this.socket.emit(event, JSON.stringify(data));
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
  };

  // Respond to direction keys
  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];

    if (!modifiers && mapped !== undefined && document.activeElement !== self.chatInput) {
      event.preventDefault();
      self.emit("move", mapped);
    } else {
      self.chatInput.focus();
    }

    // Enter Key sends message from chat
    if(!modifiers && event.which === 13) {
      self.chatMessage(event);
    }
  });

  // Respond to button presses
  this.bindButtonPress(".retry-button", this.restart);
  this.bindButtonPress(".keep-playing-button", this.keepPlaying);
  this.bindButtonPress(".chat-button", this.chatMessage);

  // Respond to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener(this.eventTouchstart, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
        event.targetTouches.length > 1) {
      return; // Ignore if touching with more than 1 finger
    }

    if (window.navigator.msPointerEnabled) {
      touchStartClientX = event.pageX;
      touchStartClientY = event.pageY;
    } else {
      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
    }

    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchmove, function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener(this.eventTouchend, function (event) {
    if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
        event.targetTouches.length > 0) {
      return; // Ignore if still touching with one or more fingers
    }

    var touchEndClientX, touchEndClientY;

    if (window.navigator.msPointerEnabled) {
      touchEndClientX = event.pageX;
      touchEndClientY = event.pageY;
    } else {
      touchEndClientX = event.changedTouches[0].clientX;
      touchEndClientY = event.changedTouches[0].clientY;
    }

    var dx = touchEndClientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = touchEndClientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};

KeyboardInputManager.prototype.bindButtonPress = function (selector, fn) {
  var button = document.querySelector(selector);
  button.addEventListener("click", fn.bind(this));
  button.addEventListener(this.eventTouchend, fn.bind(this));
};

KeyboardInputManager.prototype.chatMessage = function (event) {
  event.preventDefault();
  var msg = this.chatInput.value;
  if (msg !== "") {
    this.chatInput.value = "";
    var trimMsg = msg.trim().toLowerCase();
    var strArray = trimMsg.split(/\s+/);
    var args = []
    for (var i = 1; i < strArray.length; i++) {
      args.push(strArray[i]);
    }
    var isCommand = this.parseChatMessage(strArray[0], args);
    if (!isCommand) {
      this.emit("chatMessage", msg);
    }
  }
};

KeyboardInputManager.prototype.parseChatMessage = function(command, args) {
  var isCommand = false;
  switch(command) {
    case "nick": {
      if(args.length === 1) {
        isCommand = true;
        data = {
          username: args[0],
          automatic: false,
        };
        this.emit("changeUsername", data);
      }
    } break;

    case "room": {
      if(args.length === 1) {
        isCommand = true;
        this.emit("room", args[0]);
      }
    } break;

    case "list_rooms": {
      if(args.length === 0) {
        isCommand = true;
        this.emit("listRooms");
      }
    } break;
  }
  return isCommand;
}