const express = require('express')
const util = require('util')
const fs = require('fs')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000
app.use(express.static('public'))
app.use('/files', express.static('files'))
app.set('view engine', 'pug')

function getBase64(filepath: string) {
  const base64 = fs.readFileSync(filepath, { encoding: 'base64' })
  return `${base64}`
}

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/downloader', (req, res) => {
  res.render('downloader')
})

app.get('/file', (req, res) => {
  const path: string = req.query.path
  // res.send()
  // console.log(getBase64(__dirname + `/files/testvideo/${path}`))
  const base64 = getBase64(__dirname + `/files/testvideo/${path}`)
  console.log('\n')
  console.log(Buffer.from(base64, 'base64'))
  console.log('\n')
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', '*')
  res.send(base64)
  // getBase64(__dirname + `/files/testvideo/${path}`, callback)
  // res.sendFile(__dirname + `/files/testvideo/${path}`)
})

app.get('/getfile', (req, res) => {
  const filename: string = req.query.filename
  const ext: string = req.query.ext
  const { size } = fs.statSync(__dirname + `/files/${filename}.${ext}`)
  if (!size) {
    res.sendStatus(404)
  } else {
    const data = {
      filename,
      size,
      ext
    }
    res.send(data)
  }
})

app.get('/download', (req, res) => {
  const filename = req.query.filename
  const chunksize = req.query.chunksize
  const ext = req.query.ext
  const offset = req.query.offset
  let read = false
  console.log(offset, chunksize)
  var buffer = Buffer.alloc(Number(chunksize))

  fs.open(__dirname + `/files/${filename}.${ext}`, 'r', function(err, fd) {
    fs.read(fd, buffer, 0, Number(chunksize), Number(offset), function(
      err,
      bytesRead,
      buffer
    ) {
      res.send(buffer)
    })
  })
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
})

app.listen(PORT, () => {
  console.log(`Kloak Video on PORT ${PORT}`)
})
