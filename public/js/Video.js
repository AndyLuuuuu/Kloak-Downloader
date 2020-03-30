var video = document.getElementById('video'),
  start = 0,
  length = 15477531,
  chunks = 1,
  file = 'http://localhost:8888/video',
  mediaSource = new MediaSource(),
  chunkSize = Math.ceil(length / chunks)

mediaSource.addEventListener('sourceopen', function() {
  console.log('d')
  var sb = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.640028"')
  sb.addEventListener(
    'updateend',
    function() {
      if (i == chunks - 1) {
        //mediaSource.endOfStream();
        return
      }
      loadChunk(++i)
    },
    false
  )
  loadChunk(0)
})

mediaSource.addEventListener('sourceclose', function() {
  console.log('ended')
})

video.src = window.URL.createObjectURL(mediaSource)

var i = 0
function loadChunk(i) {
  var xhr = new XMLHttpRequest()
  xhr.open('GET', file, true)
  xhr.responseType = 'arraybuffer'
  var startByte = parseInt(start + chunkSize * i)
  xhr.setRequestHeader(
    'Range',
    'bytes=' + start + chunkSize * i + '-' + (start + chunkSize - 1)
  )
  xhr.addEventListener('load', function(e) {
    mediaSource.sourceBuffers[0].appendBuffer(new Uint8Array(xhr.response))
  })
  xhr.send()
}
