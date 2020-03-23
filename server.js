var express = require('express');
var util = require('util');
var fs = require('fs');
var path = require('path');
var app = express();
var PORT = process.env.PORT || 3000;
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
    // getBase64(__dirname + `/files/testvideo/${path}`, callback)
    // res.sendFile(__dirname + `/files/testvideo/${path}`)
});
app.get('/getfile', function (req, res) {
    var filename = req.query.filename;
    var ext = req.query.ext;
    var size = fs.statSync(__dirname + ("/files/" + filename + "." + ext)).size;
    if (!size) {
        res.sendStatus(404);
    }
    else {
        var data = {
            filename: filename,
            size: size,
            ext: ext
        };
        res.send(data);
    }
});
app.get('/download', function (req, res) {
    var filename = req.query.filename;
    var chunksize = req.query.chunksize;
    var ext = req.query.ext;
    var offset = req.query.offset;
    var read = false;
    console.log(offset, chunksize);
    var buffer = Buffer.alloc(Number(chunksize));
    fs.open(__dirname + ("/files/" + filename + "." + ext), 'r', function (err, fd) {
        fs.read(fd, buffer, 0, Number(chunksize), Number(offset), function (err, bytesRead, buffer) {
            res.send(buffer);
        });
    });
    // const reader = fs.createReadStream(__dirname + `/files/${filename}.${ext}`, {
    //   start: Number(offset),
    //   end: Number(offset) + Number(chunksize)
    // })
    // reader.on('data', chunk => {
    //   if (!read) {
    //     console.log(chunk)
    //     res.send(chunk)
    //     read = true
    //   }
    // })
});
app.listen(PORT, function () {
    console.log("Kloak Video on PORT " + PORT);
});
