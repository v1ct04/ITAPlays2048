// Requires
var express    = require('express');
var app        = express();
var path       = require('path');

var port = process.env.PORT || 8080;

var staticdir = path.join(__dirname, '..', 'static');

app.use('/js',    express.static(path.join(staticdir, 'js')));
app.use('/style', express.static(path.join(staticdir, 'style')));

app.get('/', function(req, res) {
  console.log("Serving static index.html");
  res.sendFile(path.join(staticdir, 'index.html'));
});

var http = require('http').Server(app);
var socket2048 = require('./socket2048.js')(http);
var core2048 = require('./core2048.js');

http.listen(port, function() {
  console.log('Listening on port ' + port + '.');

  new core2048.GameManager(4, socket2048.inputManager, socket2048.actuator, socket2048.storageManager);
});
