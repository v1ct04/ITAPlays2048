// Requires
var express    = require('express');
var app        = express();
var path       = require('path');

var port = process.env.PORT || 8080;

var staticdir = path.join(__dirname, '..', 'static');

app.use('/js',    express.static(staticdir + '/js'));
app.use('/style', express.static(staticdir + '/style'));

app.get('/', function(req, res) {
  console.log("Serving static index.html");
  res.sendFile(staticdir + '/index.html');
});

app.listen(port);
console.log('Listening on port ' + port + '.');
