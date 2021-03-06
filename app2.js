
var express = require('express');
var request = require('request');
var qr = require('qr-image');
var httpProxy = require('http-proxy');
var app = express();
var fs = require('fs');



// new try: load config from a file, then from a  pipe.

var scfg = './app-config/config.json';

var cfgs = fs.readFileSync(scfg).toString();
fs.unlink(scfg);

var cfg = JSON.parse(cfgs);

cfgs = undefined;







// app.use(express.compress());  // compress content
// app.use(express.cache()); // cache content

app.use(express.bodyParser());


// Server setup, including websocket support */
var host = '' //'192.168.1.101'; // address that clients use to connect to this server
var port = 8080; // port that clients use to connect to this server


var http = require('http');


var server = http.createServer(app).listen(port);

// https setup

var https = require('https');
var fs = require('fs'); // required to read cert and key files on filesystem

var httpsOpts = {
  key: fs.readFileSync(__dirname +'/ssl/key.pem'),
  passphrase: cfg.sslPrivKeyPwd,
  cert: fs.readFileSync(__dirname +'/ssl/cert.pem'),
  requestCert: false, // request client to provide a certificate ?
  rejectUnauthorized: false // reject unauthaurized acces ?
};

https.createServer(httpsOpts, app).listen(port+1);
console.log('Server running, listening on port '+(port+1)+' for https.');

cfg.sslPrivKeyPwd = undefined;
httpsOpts.passphrase = undefined;

// crypto setup
var crypto = require('crypto');


if(cfg.mailPwd == undefined) {
	console.log('WARNING: send per mail will not work: missing parameters !!');
}





// mail password input from node console
//var pwi = require('./app-modules/input-password.js');

//pwi.foo();
//var x = pwi.get_password();





// mail pwd verification
var hash = crypto.createHash('sha256').update(cfg.mailPwd).digest('base64');

if (hash=="ySAN1j2rPQeJUhOUvCveTKp1atnUrhpCVDeeEOzRtVY=") {
	console.log("mail pasword hash verified.");
} else {
	console.log("ERROR: send per mail will not work: mail password hash failed verification !!");
};


var items=new Array(); // holds documents list

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
		mailpwd = req.body.mailpwd.toString();
		//console.log("mail-pwd set: ******"); // + mailpwd);
	}
	
});

var seq = 1;
function timestamp () {
  now = new Date();
  year = "" + now.getFullYear();
  month = "" + (now.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
  day = "" + now.getDate(); if (day.length == 1) { day = "0" + day; }
  hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
  minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
  second = "" + now.getSeconds(); if (second.length == 1) { second = "0" + second; }
  sseq = ""+ seq.toString();
  seq+=1;
  return year +month + day + hour + minute + second+'-'+sseq;
}



app.post('/pdf/input/', function (req, res) {
 	
	// Add fake document.
	// This could by achieved by a simple call to items.push(..
	// *BUT* enclosing this call in a code snippet allow the action
	// to be executed now or later using eval()
	// or being appended using a source code template to a new source code version.
	// 


	var reqFile = req.query['filename'];
	if (reqFile) {
	console.log('reqfile:'+reqFile);

	var trn = "items.push({'DocumentType': 'Book','Title': 'TEST','Format':'pdf', '_id':'"+reqFile+"'});";

	eval(trn);


	fs.readFile('app2.js', 'utf8', function (err,data) {
  		if (err) {
    			return console.log(err);
  		}

  		var tag='@@';
  		var uwid= 'app2-'+timestamp()+'.js';
  
 		var result = data.replace(new RegExp(tag+'bind-items','g'), uwid+'\n\t'+trn+'\n\t//'+tag+'bind-items');

  		fs.writeFile(uwid, result, 'utf8', function (err) {
     			if (err) return console.log(err);
   
		
			fs.writeFileSync('app2-'+uwid+'-bak-js', fs.readFileSync('app2.js'));
			fs.writeFileSync('app2.js', fs.readFileSync(uwid));
	
  		});

	});
	
	/*
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
	*/
	res.end();

}
	
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

var deleteFile = function(fileName) {
	// console.log('Cleaning '+fileName+' ..');
	 fs.unlink(fileName, function (err) {
	 	if (!err)
		  console.log('deleted '+fileName+' successfully.\n');
		else
		  console.log('deleting '+fileName+' failed: '+err);
	});	
}

// sample passeword token used for accessing protected documents.
var demotoken = "sesame";

// holds processes

var pcs = [];





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
    	
    	
    // check if user requested a token (i.e. /pdf?token=1234)
    var dtoken = req.query['token'];
    if  (dtoken && (dtoken!='milla'+demotoken)) //'milla'); //demotoken)
    {
	reqFile = "prot.pdf";
    }
	
			
	console.log('GET /pdf?page='+reqPage+'&density='+reqDens+'&quality='+reqQual+"&rotate="+reqRot+"&grayscale="+reqGs+"&gamma="+reqGamma+"&zoom="+reqZoom);

	// check this for a better approach: http://docs.nodejitsu.com/articles/advanced/streams/how-to-use-stream-pipe
	
// input file for pdfdraw command
		var pIn = reqFile;
		
		
		// on linux/ubuntu we use /dev/shm RAM storage for temporary files.
		var pOut = "/dev/shm/"+pIn+"."+reqPage.toString()+"-"+pdfcount.toString()+".png";
		
		//spawn("mkfifo", [pOut]);



	// Callback - serve the requested page.
	var doServe = function() {
	
		// response content type is png
		res.type('png');
		
		// tell client to not cache response
		res.header("Cache-Control", "no-cache, no-store");
		
			
		// ghostscript, via convert: cnv = spawn('convert', ['-density',reqDens.toString(), '-quality',reqQual,pIn, pOut]);

		// pdfdraw (mu-pdftools)
		if (true) // | reqPage<pp.pages) // (! fs.existsSync(pOut)) {

			// set converter options
			var cnvOptions;	

			if (!reqGs) 
				cnvOptions = ['-G',reqGamma,'-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1];
			else
				cnvOptions = ['-G', reqGamma,'-g', '-R',reqRot,'-r',reqDens,'-o',pOut,pIn,reqPage+1];


			// create a named pipe for page output. -m parameters stands for
			// chmod 600 on linux, rw only for owner
			//console.log('create pipe (mkfifo) '+pOut);
			var ppipe=spawn("mkfifo", ['-m',600,pOut]);
			ppipe.on('err', function (err) {
				console.log('mkfifo process exited with error: '+err);
			});
			

			// on success, create a readStream on pipe
			ppipe.on('exit', function (code) {
		  		//console.log('mkfifo process exited with code ' + code);
				
				if (code==0) {

					

					// create a stream that can read the named pipe pOut
					var rs = fs.createReadStream(pOut);

					// ask stream to remove named pipe when streaming is completed.
				  	rs.on('end', function() {
						//console.log(pOut+' streamed. Deleting..');
						deleteFile(pOut);
				 	});

					// ask stream to report error and remove named pipe on error
					rs.on('error', function() {
						console.log(pOut+ ' error streaming : '+err);
						deleteFile(pOut);
					});

					// connect stream that reads pOut to response
					rs.pipe(res);
						
					// start pdf page extraction, output will be the named pipe pOut.
					// Extraction result is piped to pOut, that is also piped to response.
					cnv = spawn('pdfdraw', cnvOptions);
					cnv.on('err', function() {
						console.log(pOut+ 'error spawning pdfdraw '+pIn+' to '+pOut+' : '+err);
						deleteFile(pOut);
					});
					
					console.log('pid='+cnv.pid);
					pcs.push(cnv.pid);

					cnv.on('exit', function() {
						console.log('exit '+cnv.pid);
						var index = pcs.indexOf(cnv.pid);
						if (index > -1) {
   						  pcs.splice(index, 1);
						};
						console.log('cleaning: '+pcs.length);
						for (var i=0; i < pcs.length; i++) {
  							console.log(pcs[i]); //"aa", "bb"
							 kill = spawn('kill', [ pcs[i] ]);
							 var index2 = pcs.indexOf(pcs[i]);
							 if (index2 > -1) {
   						  		pcs.splice(index2, 1);
							 };

						}


					});

				}
				else {
					console.log('error: deleting '+pOut);
					deleteFile(pOut);
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
		//console.log('data: '+pif.pageDpiFactor);
				var zf = 0.25;
				
				if (reqZoom=="true" | reqZoom=="md")
					zf=1.0;

				if (reqZoom=="lg")
					zf=1.414;
					
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
				
				// console.log('data: '+pp.pageDpiFactor);
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
	

	//cnv.spawn('./pdfinfo.sh', [reqPage, reqFile])
		
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
    service: cfg.mailService, // "Gmail",
    auth: {
        user: cfg.mailUsr, // "damien.derbes@gmail.com",
        pass: cfg.mailPwd // TODO: de-hard code and change e-mail password on this account !!
    }
});

app.get('/permail', function (req, res) {


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





app.get('/permail/token', function (req, res) {

	
	console.log("GET /permail/token");
	demotoken = Math.floor((Math.random() * 1000) + 1); 
	console.log({token: demotoken});
	


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
	    subject: "Xanthos Web Retrieval - document token delivery - "+demotoken, // - "+reqFile, // Subject line
	    text: "Token: "+demotoken // plaintext body  
	    }
	
	   console.log("Sending "+reqFile+" token per mail..");
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



var oldResultset = '';
var resultsetId = ''; // new Date().getTime().toString();

// returns documents list
app.get("/documents", function(req, res) {


	// check if user requested a result set 
	var resultset = req.query['resultset'];
	if (!resultset)
		resultset = 'documents'; // default value
	

	if (items.length==0 | resultset!=oldResultset) {
		var dataFilename = './'+resultset+'.json';

	
		items = JSON.parse(fs.readFileSync(dataFilename));
		oldResultset=resultset;

	}
	
	// return collection as JSON
	res.json(items);
});


// returns documents list
app.get("/folder", function(req, res) {

	var ret = new Array(); // holds documents list

	// check if user requested a filter 
	var filter = req.query['filter'];
	if (!filter) 
		filter = ''; // default value
	

		var dataFilename = __dirname ;

	
		var files = fs.readdirSync(dataFilename);
		
		files = files.filter(function(value) {
			return value.match(".pdf$")==".pdf";	
		});


		files.forEach(function(entry) {
    			//console.log(entry);
			var fst = fs.statSync(entry);
			
			var newItem = {filename: entry, size: fst.size, modified: fst.mtime, created: fst.ctime, folder: dataFilename, _id: entry};
			console.log(JSON.stringify(fst));

			ret.push(newItem);

		});
	
		
	
	// return collection as JSON
	res.json(ret);
});


app.get("/quit", function(req, res) {
	console.log('exiting node.js process with code 0 ..');
	process.exit(code=0);
});


app.post("/resultset", function (req, res) {
	
	
	console.log("POST /resultset "+JSON.stringify(req.body));
	items = req.body;
	resultsetId = new Date().getTime().toString();
	res.json({id:resultsetId});
});

app.put("/resultset", function (req, res) {
	
	
	console.log("PUT /resultset "+JSON.stringify(req.body)); 
	items.push(req.body);
	resultsetId = new Date().getTime().toString();
	res.json({id:resultsetId});
});

app.post("/resultset/file", function(req,res) {
	console.log("POST /resultset/");
	var fn = req.body.filename;
	res.end();
	if (fn) {
		console.log("filename: "+fn);
		
		items = JSON.parse(fs.readFileSync(fn));

		resultsetId = new Date().getTime().toString();
		
	}
});


app.get("/resultset", function(req, res) {
	res.json(items);
});

app.get("/resultset/id", function(req, res) {
	//console.log("GET resultset/id : "+resultsetId);
	res.json({id:resultsetId});
});

var audioId = '/audio/propaganda-mabuse.mp3';

app.get("/audioplayer/id", function(req, res) {
	//console.log("GET resultset/id : "+resultsetId);
	res.json({id:audioId, autoPlay:true});
});

app.post("/audioplayer/id", function(req, res) {
	console.log("POST /audioplayer/id");
	var id = req.body.id;
	res.end();
	if (id) {
		console.log("id: "+id);
		
		audioId = id;
		
	}
});




