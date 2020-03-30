var express = require('express');
var util = require('util');
var fs = require('fs');
var path = require('path');
var app = express();
var PORT = process.env.PORT || 3000;
var FILE_DIR = __dirname + '/files/';
var mime = require('mime-types');
app.use(express.static('public'));
app.use('/files', express.static('files'));
app.set('view engine', 'pug');
function getBase64(filepath) {
    var base64 = fs.readFileSync(filepath, { encoding: 'base64' });
    return "" + base64;
}
app.get('/', function (req, res) {
    res.render('index');
});
app.get('/downloader', function (req, res) {
    res.render('downloader');
});
app.get('/video', function (req, res) {
    res.render('video');
});
app.get('/file', function (req, res) {
    var path = req.query.path;
    // res.send()
    // console.log(getBase64(__dirname + `/files/testvideo/${path}`))
    var base64 = getBase64(__dirname + ("/files/testvideo/" + path));
    console.log('\n');
    console.log(Buffer.from(base64, 'base64'));
    console.log('\n');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.send(base64);
});
app.get('/requestfile', function (req, res) {
    // console.log(req.query);
    fs.readdir(FILE_DIR, function (err, files) {
        files.forEach(function (file) {
            if (file.includes(req.query.file)) {
                var extension = file.split('.')[file.split('.').length - 1];
                var filename = req.query.file;
                var size = fs.statSync(FILE_DIR + file).size;
                var mimetype = mime.lookup(file);
                res.send({ filename: filename, extension: extension, size: size, mimetype: mimetype });
            }
        });
    });
});
app.get('/download', function (req, res) {
    var filename = req.query.filename;
    var extension = req.query.extension;
    var chunksize = req.query.chunksize;
    var offset = req.query.offset;
    var read = false;
    console.log(offset, chunksize);
    var buffer = Buffer.alloc(Number(chunksize));
    fs.open(__dirname + ("/files/" + filename + "." + extension), 'r', function (err, fd) {
        fs.read(fd, buffer, 0, Number(chunksize), Number(offset), function (err, bytesRead, buffer) {
            console.log(err);
            console.log(bytesRead);
            console.log(buffer.slice(0, bytesRead).length);
            res.send(buffer.slice(0, bytesRead));
        });
    });
});
app.get('/videodownload', function (req, res) {
    // total = movie.length;
    // var range = req.headers.range;
    // var positions = range.replace(/bytes=/, "").split("-");
    // var start = parseInt(positions[0], 10);
    // var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
    // var chunksize = (end-start)+1;
    // res.writeHead(206, { "Content-Range": "bytes " + start + "-" + end + "/" + total,
    //                      "Accept-Ranges": "bytes",
    //                      "Content-Length": chunksize,
    //                      "Content-Type":"video/mp4"});
    // res.end(movie.slice(start, end+1), "binary");
});
app.listen(PORT, function () {
    console.log("Kloak Video on PORT " + PORT);
});
