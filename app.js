
var express = require('express');
var request = require('request');
var qr = require('qr-image');
var httpProxy = require('http-proxy');
var app = express();



//app.use(express.compress());  // compress content
//app.use(express.cache());

// Server setup, including websocket support */
var host='' //'192.168.1.101'; // address that clients use to connect to this server
var port = 8080; // port that clients use to connect to this server

var http = require('http');
var server = http.createServer(app).listen(port);

// https setup
/*
var https = require('https');
var fs = require('fs'); // required to read cert and key files on filesystem

var httpsOpts = {
  key: fs.readFileSync(__dirname +'/ssl/key.pem'),
  cert: fs.readFileSync(__dirname +'/ssl/cert.pem')
};

https.createServer(httpsOpts, app).listen(8081);
console.log('Server running, listening on port 8081 for https.');
*/


// Web socket setup
var io = require('socket.io').listen(server);
console.log('Server running, listening on port ', port);


// provide satic web server. /public is the folder used as root.
app.use(express.static(__dirname + '/public'));


// sample: proxying service using 'request' module:
app.get('/prx', function (req, res) {
	var x = request('http://192.168.10.157:3000/user');
	req.pipe(x);
    x.pipe(res);
});


// sample: return a QR code in png:	
app.get('/qr', function (req, res) {
    io.emit('message', req.query.data);
	console.log('GET /qr ' + req.query.data);
	var code = qr.image('data:'+req.query.data, {type:'png'});
    res.type('png');
    code.pipe(res);
});


// sample: return a QR code in png:	
app.get('/qr/ts', function (req, res) {
    io.emit('message', req.query.data);
	console.log('GET /qr ' + req.query.data);
	var code = qr.image('ts:'+new Date()+' data:'+req.query.data, {type:'png'});
    res.type('png');
    code.pipe(res);
});



// sample: proxying service using 'request' module:
app.get('/user', function (req, res) {
	console.log('GET /user (relayed by service proxy)');
	proxy.web(req,res);
});

// sample: proxying service using 'request' module:
app.post('/user', function (req, res) {
	console.log('POST /user' + req.body);
	proxy.web(req, res);
});

// returns the history of broadcasted messages
app.get('/message/hist', function (req, res) {
	res.json(lastBcMsgHist);
});

// sample: proxying service using 'http-proxy' module:
// configure service proxy

var proxy = new httpProxy.createProxyServer({
  target: {
    host: '192.168.10.157',
    port: 3000
  }
});

// WebSocket event handlers

var lastBcMsgHist = new Array(); // holds last broadcasted messages


// on client connect:
io.sockets.on('connection', function(socket) {

	var cnt = lastBcMsgHist[lastBcMsgHist.length-1]; // return last broadcasted message

	if (!cnt) {
		cnt = {content:'Websocket connection accepted by server.', received: new Date()};
	}
	console.log('[WS] connection');
	socket.emit('message', cnt);
  
	 // on message receive (from a channel called 'message')    
    socket.on('message', function (message) {
        console.log('[WS] message received : ' + message);
			
		// build the response message		
		var resmsg =  {content:message, received:new Date()};

		// emit message response to sender only:
		 socket.emit('message', resmsg);
		 
		// emit message response to all other users (except the sender!!)
		socket.broadcast.emit('message', resmsg);

		// store broadcasted message in last broadcasted messages
		lastBcMsgHist.push(resmsg); //{ content:message});
		
		// limit the message history count
		if (lastBcMsgHist.length > 7) {
			lastBcMsgHist.splice(0,1); // remove first item in array
		}
    }); 

});
