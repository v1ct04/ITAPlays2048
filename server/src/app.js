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
var io = require('socket.io')(http);

http.listen(port, function() {
  console.log('Listening on port ' + port + ' in ' + app.get('env') + ' mode.')

  require('./room_manager.js')(io);
});
