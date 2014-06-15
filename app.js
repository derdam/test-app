
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

https.createServer(httpsOpts, app).listen(port+1);
console.log('Server running, listening on port '+(port+1)+' for https.');



var args = process.argv.slice(2);
// console.log('args: '+args);

if(args=='') {
	console.log('WARNING: send per mail will not work: missing parameters.');
}

var mailpwd = args;



// Web socket setup
var io = require('socket.io').listen(server);
//console.log('Server running, listening on port ', port);


// provide satic web server. /public is the folder used as root.
app.use(express.static(__dirname + '/public'));


// sample: proxying service using 'request' module:
app.get('/prx', function (req, res) {
	var x = request('http://192.168.10.157:3000/user');
	req.pipe(x);
    x.pipe(res);
});


app.get('/admin', function (req, res) {
	res.type('application/json');
	res.send(JSON.stringify({ismailpwd:(mailpwd!='')}));
	res.end();
});

app.post('/admin/mail-pwd', express.bodyParser(), function (req, res) {
	console.log('POST: /admin/mail-pwd');
	// console.log('mailpwd: '+req.body.mailpwd);
	if (req.body.mailpwd) {
		mailpwd = req.body.mailpwd;
		console.log("mail-pwd set: ******"); // + mailpwd);
	}
	
});

app.post('/pdf/input/', function (req, res) {
 
	
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="add.pdf"; // defaults to add.pdf
		
	var reqUrl = req.query['url'];
	if (!reqUrl) 
		reqUrl ="";
	
			console.log("POST /pdf/input/&filename="+reqFile+"&url="+reqUrl);		
		
	var file = fs.createWriteStream(reqFile);
	var request = http.get(reqUrl, function(response) {
  		response.pipe(file);
	});
	
	res.end();
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
		//cnv = spawn('convert', ['test.pdf', '-']);

// tracks calls to GET /pdf handler
var pdfcount=0;

// a collection of pageinfo request/responses to be used as a simple cache.
var pgInfoCache = {};

// sample: return  page of a pdf in png:
app.get('/pdf', function (req,res) {

	pdfcount+=1;
	
	// check if user requested a local file located in current server's current directory
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="test.pdf"; // defaults to test.pdf
		
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
		
	// check if user requested a rotation angle in url query (i.e. ../pdf?rotate=90)
	var reqRot = req.query['rotate'];
	if (!reqRot) // rotation defaults to 0	
		reqRot=0;
	
	// check if user requested a grayscale rendering (i.e. ../pdf?grayscale=true)
	var reqGs = req.query['grayscale'];
	
	// check if user requested a gamma correction for rendering (i.e. ../pdf?gamma=0.9)
	var reqGamma = req.query['gamma'];
    if (!reqGamma)
    	reqGamma='1.0';
    	
    // check if user requested a zoom toggle (i.e. /pdf?zoom=true
    
    var reqZoom = req.query['zoom'];
    if (!reqZoom)
    	reqZoom="false"; // defaults to false
    	
    	
    	
			
	console.log('GET /pdf?page='+reqPage+'&density='+reqDens+'&quality='+reqQual+"&rotate="+reqRot+"&grayscale="+reqGs+"&gamma="+reqGamma+"&zoom="+reqZoom);

	// check this for a better approach: http://docs.nodejitsu.com/articles/advanced/streams/how-to-use-stream-pipe
	
// input file for pdfdraw command
		var pIn = reqFile;
		
		

		// on linux/ubuntu we use /dev/shm RAM storage for temporary files.
		var pOut = "/dev/shm/"+pIn+"."+reqPage.toString()+"-"+pdfcount.toString()+".png";
		//spawn("mkfifo", [pOut]);



	// Callback - serve the requested page.
	var doServe = function() {
		//console.log("doServe");
		// serve pdf page
		res.type('png');
		
		res.header("Cache-Control", "no-cache, no-store");
		
			
		// ghostscript, via convert: cnv = spawn('convert', ['-density',reqDens.toString(), '-quality',reqQual,pIn, pOut]);
		// pdfdraw (mu-pdftools)
		if (true) // | reqPage<pp.pages) // (! fs.existsSync(pOut)) {
			if (!reqGs) 
				cnv = spawn('pdfdraw', ['-G',reqGamma,'-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1]);
			else
				cnv = spawn('pdfdraw', ['-G', reqGamma,'-g', '-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1]);
				
			cnv.stdout.on('data', function(data) {
				console.log('stdout: data received.');
				//res.pipe(data);
				
			});
			
			cnv.on('err', function (err) {
			});
			
			
			cnv.on('exit', function (code) {
		  		console.log('convert process exited with code ' + code);
				if (code==0) {
				  var rs = fs.createReadStream(pOut);
				  
				  // ask stream to remove sent file when pipe is completed.
				  rs.on('end', function() {
				  
					 console.log('Cleaning '+pOut+' ..');
					 fs.unlink(pOut, function (err) {
		  				if (!err)
		  					console.log('successfully deleted.\n');
		  					// else: forget deliberatly.
					  });				 
					  
				  });
		
				  rs.pipe(res);	
				} else {
					res.end();
					fs.unlink(pOut, function (err) {
		  				if (!err)
		  					console.log('successfully deleted.\n');
		  					// else: forget deliberatly.
					 });				 
				}
			});
			
	}
	
	
	// compute pdfinfo key for cache retrieval
	var pik = reqFile; // we use filename as key
	var pif  = pgInfoCache[pik];

	var DPI = 108; //  108 for 2 A4 pages
	
	//console.log('pif= '+pif);
	
	if (pif) {
		console.log("pgInfoCache HIT for pik "+pik);
		console.log('data: '+pif.pageDpiFactor);
				var zf = 0.25;
				
				if (reqZoom=="true")
					zf=1.0;
					
				reqDens=Math.round(DPI*pif.pageDpiFactor*zf); // scale
				// invoke callback for serving page:
				doServe();
		
	} else {
		console.log("pgInfoCache missed for pik "+pik);
		
		
	
	
	
	// get pdf info (page count page/s size, ..)
	cinf =  spawn('pdfinfo', ['-f', 1,   reqFile]);
	
	// get pdf info callback
	cinf.on('exit', function (code) {
  		console.log('pdfinfo process exited with code ' + code);
  		// buf=foo(buf);		
	});	
	
	// get pdf info callback
	cinf.stdout.on('data', function(data) {
		try {
			var pp = foo(data.toString());
		
			if (pp) {
			
				if (!pif) {
					console.log('adding pdfinfo for pik '+pik);
					pgInfoCache[pik] = pp;
				}
				
				console.log('data: '+pp.pageDpiFactor);
				var zf = 0.25;
				
				if (reqZoom=="true")
					zf=1.0;
					
				reqDens=Math.round(DPI*pp.pageDpiFactor*zf); // scale
				// invoke callback for serving page:
				doServe();
			}
		}
		catch(err)
		{
			console.log("pdinfo parse err: "+err.toString());
		}
	});	
	}
	  
});

// sample: pdf info
app.get('/pdf/info', function (req, res) {

	pdfcount+=1;
	
	// check if user requested a local file located in current server's current directory
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="test.pdf"; // defaults to test.pdf
		
	// check if user requested a page in url query (i.e. ../pdf?page=1)
	var reqPage = req.query['page'];

	if (!reqPage) { // requested page defaults to 0 (get metadata for whole document)
		reqPage=0
	} 
	else if (reqPage<1) { // page number guard
		reqPage=1;
	}
	
		
	console.log('GET /pdf/info?filename='+reqFile+'&page='+reqPage);
			
	//var cmd = "pdfinfo -f "+reqPage+" -l "+reqPage+" "+reqFile;
	
	//console.log('SPAWN '+cmd);
	
	if (reqPage>0) {
		cnv = spawn('pdfinfo', ['-f', reqPage, '-l', reqPage, reqFile])
	} else
	{
		cnv = spawn('pdfinfo', [reqFile])
	}
	
		
	res.type('text');
	var buf;
	cnv.stdout.on('data', function(data) {
		// console.log('stdout: data received: '+data);
		buf=buf+data;
		
	});
	
	cnv.on('exit', function (code) {
  		console.log('convert process exited with code ' + code);
  		res.type('application/json');
  		res.send(foo(buf));
  			//res.send(buf);
  		res.end();
	});	
	
});

var foo = function(data) {
	// console.log("data: "+data);
	
	// 'original' way of doing, kept for example
	/*
	var rePattern = new RegExp(/(Pages:)([ ]*)([0-9]*)/);
	var matches = data.match(rePattern);
	var pages = matches.pop(); // page number is in last group. 
	*/
	
	if (data) {
	
	// 'new' and shorter way
	var mpages = data.match(new RegExp(/(Pages:)([ ]*)([0-9]*)/));
	
	var mtitle = data.match(new RegExp(/(Title:)([ ]*)(.*)/));
	var title = mtitle==null ? undefined : mtitle.pop();
	
	//console.log(title);
	var mauthor = data.match(new RegExp(/(Author:)([ ]*)(.*)/));
	
	// extract page width
	var pw = 595.32;
	
	var mpagesize = data.match(new RegExp(/(Page[ ,0-9]* size:[ ])(.*)/));
	
	if (mpagesize) {
		var ps = mpagesize.pop();
		var mpagesizeDet = ps.match(new RegExp(/([0-9.]+)([ ]+x[ ]+)([0-9.]+)/));

		if (mpagesizeDet)
			pw = parseFloat(mpagesizeDet[1]);
	}
	
	// compute dpi page factor, so that clien can scale each page to same width
	var pdpif = 1.0;
	
	if (pw > 0.1) {
		pdpif = 595.32/pw;  // scale to A4 page width, expressed in points.
	}
	
	var mencrypted = data.match(new RegExp(/(Encrypted:)([ ]*)(.*)/));
	
	return {'title' : title,
			'author' : mauthor == null ? undefined : mauthor.pop(),
			'pages' : mpages == null ? undefined : mpages.pop(),
			'pageSize' : mpagesize == null ? undefined : ps,
			'pageDpiFactor' : pdpif,
			'encrypted' : mencrypted == null ? undefined : mencrypted.pop()
			};
	}
}

// sample: pdf metadata
app.get('/pdf/metadata', function (req, res) {

	pdfcount+=1;
	
	// check if user requested a local file located in current server's current directory
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="test.pdf"; // defaults to test.pdf
	
	// check if user requested a page in url query (i.e. ../pdf?page=1)
	var reqPage = req.query['page'];

	if (!reqPage) { // requested page defaults to 0 (get metadata for whole document)
		reqPage=0
	} 
	else if (reqPage<1) { // page number guard
		reqPage=1;
	}
	
				
	console.log('GET /pdf/metadata?filename='+reqFile+'&page='+reqPage);
			
	if (reqPage>0) {
		cnv = spawn('pdfinfo', ['-meta', '-f', reqPage, '-l', reqPage, reqFile]);
	}
	else
	{
		cnv = spawn('pdfinfo', ['-meta', reqFile]);

	}
	
		
	res.type('text');
	var buf;
	cnv.stdout.on('data', function(data) {
		// console.log('stdout: data received: '+data);
		buf=buf+data;
		
	});
	
	cnv.on('exit', function (code) {
  		console.log('convert process exited with code ' + code);
  		res.send(buf);
  		res.end();
	});
	
});


// sample: pdf text
app.get('/pdf/text', function (req, res) {

	pdfcount+=1;
	
	// check if user requested a local file located in current server's current directory
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="test.pdf"; // defaults to test.pdf
		
		
	// check if user requested a page in url query (i.e. ../pdf?page=1)
	var reqPage = req.query['page'];

	if (!reqPage) { // requested page defaults to 0 (get text for whole document)
		reqPage=0
	} 
	else if (reqPage<1) { // page number guard
		reqPage=1;
	}
	
				
	console.log('GET /pdf/text?filename='+reqFile+'&page='+reqPage);
			
	var cmd = "pdfdraw -t "+reqFile+" "+reqPage;
	
	console.log('SPAWN '+cmd);
	
	if (reqPage > 0) {
		var pageRange = reqPage; //+','+reqPage;
		cnv = spawn('pdfdraw', ['-t', reqFile, pageRange]); 
	} else {
		cnv = spawn('pdfdraw', ['-t', reqFile]); 
	}
	
		

	var buf='';
	cnv.stdout.on('data', function(data) {
		// console.log('stdout: data received: '+data);
		buf+=data;
		
	});
	
	cnv.on('exit', function (code) {
  		console.log('convert process exited with code ' + code);
  		//res.type('html');
  		res.send(buf);
  		res.end();
	});
			
});



// sample: remote viewer

app.post('/remoteviewer', express.bodyParser(), function(req, res) {
	console.log("RX POST /remoteviewer");
	console.log("RX "+req.body.url);
	//console.log("RX "+JSON.stringify(req.body));
	//var data = JSON.parse(JSON.stringify(req.body));
	//console.log("RX "+data.url);
	
	//	var resmsg =  {content:req.body.url, received:new Date()};
	//io.sockets.emit('message', resmsg);
	
	res.end();
});

// sample: simple mailer
var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        user: "damien.derbes@gmail.com",
        pass: mailpwd // TODO: de-hard code and change e-mail password on this account !!
    }
});

app.get('/permail', function (req, res) {

// console.log('mailpwd: '+mailpwd);

	// check if user requested a local file located in current server's current directory
	var reqFile = req.query['filename'];
	if (!reqFile)
		reqFile="test.pdf"; // defaults to test.pdf
	
	//console.log("creating qrindex.png for document "+reqFile);
	//var qrcode = qr.image('data:'+reqFile, {type:'png'});
	
	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: "Xanthos Web Retrieval", // sender address
	    to: "damien.derbes@gmail.com", // ", // list of receivers
	    subject: "Xanthos Web Retrieval - document delivery - "+reqFile, // Subject line
	    text: "1 Document in attachment.", // plaintext body
	    // html: "<b>Hello world ✔</b>" // html body
	    attachments: [
	    	{   // file on disk as an attachment
            	fileName: reqFile,
            	filePath: reqFile // stream this file
        	}
	    ]
	}
	
	   console.log("Sending "+reqFile+" per mail..");
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
    
    socket.on('viewer', function (message) {
        console.log('[WS] viewer received : ' + message);
	});

});
