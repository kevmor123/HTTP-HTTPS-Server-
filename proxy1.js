
var httpProxy = require("http-proxy");
var http = require("http");
var url = require("url");
var net = require('net');
var fs   = require('fs');
var sys  = require('sys');

var blacklist = [];
fs.watchFile('./blacklist.txt', function(c,p) { update_blacklist(); });

//function to check if the text file has been updated
function update_blacklist() {
  sys.log("Updating blacklist.");
  blacklist = fs.readFileSync('blacklist.txt', "utf8").split('\n')
              .filter(function(rx) { return rx.length })
              .map(function(rx) { return RegExp(rx) });
}

var server = http.createServer(function (req, res) {
  //checking if the url is in the blacklist text file
  for (i in blacklist) {
    if (blacklist[i].test(req.url)) {
      sys.log("Denied: " + req.method + " " + req.url);
      res.end();
      return;
    }else sys.log("Proxying http request for: " + req.method + " " + req.url);
  }
   //Parse the request's url
  var urlObj = url.parse(req.url);
  var target = urlObj.protocol + "//" + urlObj.host;
  //Creating proxy server
  var proxy = httpProxy.createProxyServer({});
  proxy.on("error", function (err, req, res) {
    console.log("error");
    res.end();
  });
 //Send Request
  proxy.web(req, res, {target: target});
}).listen(8080);  //this is the port your clients will connect to

   //Listen for response
  server.addListener('connect', function (req, socket, bodyhead) {
    var hostDomain = req.url.split(":")[0];


  //Creating Socket
  console.log("Proxying HTTPS Request for:"  + req.method + " " + req.url);
  var proxySocket = new net.Socket();
  proxySocket.connect(443, hostDomain, function () {
      proxySocket.write(bodyhead);
      socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
    }
  );

  //Passing through data
  proxySocket.on('data', function (chunk) {
    socket.write(chunk);
  });

  //end
  proxySocket.on('end', function () {
    socket.end();
  });

  //error handling
  proxySocket.on('error', function () {
    socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
    socket.end();
  });

  //Pass Through Data
  socket.on('data', function (chunk) {
    proxySocket.write(chunk);
  });

   //End
  socket.on('end', function () {
    proxySocket.end();
  });

  //error handling
  socket.on('error', function () {
    proxySocket.end();
  });

});

update_blacklist();