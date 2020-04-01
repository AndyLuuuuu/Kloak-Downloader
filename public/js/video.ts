var video = document.getElementById('video')
// uuid = '0e781511-ed5e-42d7-a2da-df4b5a344fb2',
// start = 0,
// length = 15477531,
// chunks = 1,
// file = 'http://localhost:8888/video',
// mediaSource = new MediaSource(),
// chunkSize = 1048576
const ONE_MB = 1048576
let videoInformation: {
  filename: string
  extension: string
  size: number
  mimetype: string
  chunks: number
  start: number
  mediaSource: MediaSource
} = null

const setupMediaSource = () => {
  video.src = URL.createObjectURL(videoInformation.mediaSource)
  videoInformation.mediaSource.onsourceopen = e => {
    function loadChunk() {
      return fetch('http://localhost:3000/test', {
        headers: {
          Range: `bytes=${videoInformation.start}-${ONE_MB}`
        }
      }).then(res => {
        videoInformation.start = videoInformation.start + ONE_MB
        return res.arrayBuffer()
      })
    }
    console.log(e)
    var sourceBuffer = videoInformation.mediaSource.addSourceBuffer(
      'video/mp4; codecs="avc1.640028"'
    )
    sourceBuffer.addEventListener('updatestart', e => {
      console.log(e)
    })
    sourceBuffer.addEventListener('updateend', e => {
      console.log(e)
      loadChunk().then(buffer => {
        console.log(buffer)
        sourceBuffer.appendBuffer(buffer)
      })
    })
    loadChunk().then(buffer => {
      console.log(buffer)
      sourceBuffer.appendBuffer(buffer)
    })
  }

  // var sourceBuffer = videoInformation.mediaSource.addSourceBuffer(
  //   'video/mp4; codecs="avc1.640028"'
  // )

  // sourceBuffer.addEventListener('updateend',() => {loadChunk()})

  // var xhr = new XMLHttpRequest()
  // xhr.open('GET', file, true)
  // xhr.responseType = 'arraybuffer'
  // var startByte = parseInt(start + chunkSize * i)
  // xhr.setRequestHeader(
  //   'Range',
  //   'bytes=' + start + chunkSize * i + '-' + (start + chunkSize - 1)
  // )
  // xhr.addEventListener('load', function(e) {
  //   mediaSource.sourceBuffers[0].appendBuffer(new Uint8Array(xhr.response))
  // })
  // xhr.send()
}

fetch(
  'http://localhost:3000/requestfile?file=0e781511-ed5e-42d7-a2da-df4b5a344fb2'
)
  .then(res => {
    return res.json()
  })
  .then(videoInfo => {
    console.log(videoInfo)
    videoInformation = {
      filename: videoInfo.filename,
      extension: videoInfo.extension,
      size: videoInfo.size,
      mimetype: videoInfo.mimetype,
      chunks: videoInfo.size / ONE_MB,
      start: 0,
      mediaSource: new MediaSource()
    }
    return
  })
  .then(() => {
    setupMediaSource()
  })
