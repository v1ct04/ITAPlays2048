var socket = io();

var remoteStorage = new RemoteStorageManager(socket);
remoteStorage.onReady(function(s) {
  var InputManager = RemoteInputManager.bind(null, socket);
  var StorageManager = MemoryStorageManager.bind(null, s.getGameState(), s.getBestScore());
  
  // Wait till the browser is ready to render the game (avoids glitches)
  window.requestAnimationFrame(function() {
    new GameManager(4, InputManager, HTMLActuator, StorageManager);

    var keyboardInput = new KeyboardInputManager(socket);
  })
});
