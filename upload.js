var formidable = require('formidable'),
    http = require('http'),
    util = require('util');

var fs = require('fs');
var request = require('request');
var spawn = require('child_process').spawn; 


http.createServer(function(req, res) {
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();
    form.uploadDir = "public/uploads";
    form.keepExtensions = true;
    form.parse(req, function(err, fields, files) {

	console.log(util.inspect({fields: fields, files: files}));   

	var sdata = {"DocumentType":files.upload.type,"Title":files.upload.name,"Format":files.upload.type,"_id":files.upload.name};

	var sitems = fs.readFileSync('uploads.json');
	var items = JSON.parse(sitems);

        items.push(sdata);

	fs.createReadStream(files.upload.path).pipe(fs.createWriteStream(files.upload.name));
	fs.writeFileSync('uploads.json', JSON.stringify(items));
	
	res.writeHead(301, {Location: 'https://localhost:8081/wr5.html'});
	res.end();


    });

    return;
  }

}).listen(8082);
