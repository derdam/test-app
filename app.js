
var express = require('express');
var request = require('request');
var qr = require('qr-image');
var httpProxy = require('http-proxy');
var app = express();
var fs = require('fs');

// app.use(express.compress());  // compress content
// app.use(express.cache()); // cache content

// Server setup, including websocket support */
var host='' //'192.168.1.101'; // address that clients use to connect to this server
var port = 8080; // port that clients use to connect to this server

var http = require('http');
var server = http.createServer(app).listen(port);

// https setup

var https = require('https');
var fs = require('fs'); // required to read cert and key files on filesystem

var httpsOpts = {
  key: fs.readFileSync(__dirname +'/ssl/key.pem'),
  cert: fs.readFileSync(__dirname +'/ssl/cert.pem')
};

https.createServer(httpsOpts, app).listen(8081);
console.log('Server running, listening on port 8081 for https.');



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


/* pdf converter */
var util = require('util'),
		spawn = require('child_process').spawn; //,
		cnv = spawn('convert', ['test.pdf', '-']);

// sample: return first page of a pdf in png:
app.get('/pdf', function (req,res) {

	// check if user requested a page in url query (i.e. ../pdf?page=1)
	var reqPage = req.query['page'];

	if (!reqPage) // requested page defaults to 0
		reqPage=0;
	else	reqPage=reqPage-1; // compensate 0-based page number


	if (reqPage<0) // page number guard
		reqPage=0;

	// check if user requested a density in url query (i.e. ../pdf?density=96)
	var reqDens = req.query['density'];

	if (!reqDens) // requested density defaults to 75
		reqDens=75;

	if (reqDens<1)	// density guard
		reqDens=1;
	if (reqDens>1200)
		reqDens=1200;
	
	// check if user requested a quality factor in url query (i.e. ../pdf?quality=70)
	var reqQual = req.query['quality'];
	if (!reqQual) // quality defaults to 80	
		reqQual=80;
		
				
	
			
	console.log('GET /pdf?page='+reqPage+'&density='+reqDens+'&quality='+reqQual);

	// check this for a better approach: http://docs.nodejitsu.com/articles/advanced/streams/how-to-use-stream-pipe


	 res.type('png');
	var pIn = "test.pdf["+reqPage.toString()+"]";
	var pOut = "test-"+reqPage.toString()+".png";
	cnv = spawn('convert', ['-density',reqDens.toString(), '-quality',reqQual,pIn, pOut]);
	
	cnv.stdout.on('data', function(data) {
		console.log('stdout: data received.');
		//res.pipe(data);
		
	});
	cnv.on('exit', function (code) {
  		console.log('convert process exited with code ' + code);
		if (code==0) {
		  var rs = fs.createReadStream(pOut);
		  rs.pipe(res);	
		}
	});

});

// sample: simple mailer
var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "damien.derbes@gmail.com",
        pass: "****" // TODO: de-hard code and change e-mail password on this account !!
    }
});

app.get('/permail', function (req, res) {

	console.log("creating qrindex.png for document");
	var qrcode = qr.image('data:'+'test.pdf', {type:'png'});
	
	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: "Xanthos Web Retrieval", // sender address
	    to: "damien.derbes@gmail.com", // ", // list of receivers
	    subject: "Xanthos Web Retrieval - document delivery", // Subject line
	    text: "1 Document in attachment.", // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	    attachments: [
	    	{   // file on disk as an attachment
            	fileName: "test.pdf",
            	filePath: "test.pdf" // stream this file
        	},
        	{   // use URL as an attachment
            	fileName: "qrindex.png",
            	filePath: "qrindex.png"
        	}
	    ]
	}
	
	   console.log("Sending test.pdf per mail..");
	// send mail with defined transport object
	smtpTransport.sendMail(mailOptions, function(error, response){
	    if(error){
	        console.log(error);
	        res.send("ok");
	    }else{
	    	res.send("error "+response.message);
	        console.log("Message sent: " + response.message);
	    }
	
	    // if you don't want to use this transport object anymore, uncomment following line
	    //smtpTransport.close(); // shut down the connection pool, no more messages
	});

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
	
	console.log('[WS] connection');
	/*
	var cnt = lastBcMsgHist[lastBcMsgHist.length-1]; // return last broadcasted message

	if (!cnt) {
		cnt = {content:'Websocket connection accepted by server.', received: new Date()};
	}
	socket.emit('message', cnt);
	*/
  
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
		lastBcMsgHist.push(resmsg);
		
		// limit the message history count
		if (lastBcMsgHist.length > 7) {
			lastBcMsgHist.splice(0,1); // remove first item in array
		}
    }); 

});
