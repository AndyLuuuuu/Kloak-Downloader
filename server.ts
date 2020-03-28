const express = require('express');
const util = require('util');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const FILE_DIR = __dirname + '/files/';
const mime = require('mime-types');
app.use(express.static('public'));
app.use('/files', express.static('files'));
app.set('view engine', 'pug');

function getBase64(filepath: string) {
  const base64 = fs.readFileSync(filepath, { encoding: 'base64' });
  return `${base64}`;
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/downloader', (req, res) => {
  res.render('downloader');
});

app.get('/file', (req, res) => {
  const path: string = req.query.path;
  // res.send()
  // console.log(getBase64(__dirname + `/files/testvideo/${path}`))
  const base64 = getBase64(__dirname + `/files/testvideo/${path}`);
  console.log('\n');
  console.log(Buffer.from(base64, 'base64'));
  console.log('\n');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.send(base64);
});

app.get('/requestfile', (req, res) => {
  // console.log(req.query);
  fs.readdir(FILE_DIR, (err, files) => {
    files.forEach(file => {
      if (file.includes(req.query.file)) {
        const extension = file.split('.')[file.split('.').length - 1];
        const filename = req.query.file;
        const { size } = fs.statSync(FILE_DIR + file);
        const mimetype = mime.lookup(file);
        res.send({ filename, extension, size, mimetype });
      }
    });
  });
});

app.get('/download', (req, res) => {
  const filename = req.query.filename;
  const extension = req.query.extension;
  const chunksize = req.query.chunksize;
  const offset = req.query.offset;
  let read = false;
  console.log(offset, chunksize);
  var buffer = Buffer.alloc(Number(chunksize));

  fs.open(__dirname + `/files/${filename}.${extension}`, 'r', function(
    err,
    fd
  ) {
    fs.read(fd, buffer, 0, Number(chunksize), Number(offset), function(
      err,
      bytesRead,
      buffer
    ) {
      console.log(err);
      console.log(bytesRead);
      console.log(buffer.slice(0, bytesRead).length);
      res.send(buffer.slice(0, bytesRead));
    });
  });
});

app.listen(PORT, () => {
  console.log(`Kloak Video on PORT ${PORT}`);
});
