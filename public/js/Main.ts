import Downloader from './Downloader.js'

const videoWrapper = document.getElementById('videoWrapper')
const video = document.getElementById('video')
let ms: MediaSource = null
let videoSourceBuffer: SourceBuffer = null
const hiddendl = document.getElementById('hiddendl')
const files = document.querySelectorAll('.item')
const downloads = []
const videoSegments = []
console.log(files)

const log = (message: string) => {
  console.log(`<${new Date().toLocaleString()}> ${message}`)
}

const callback = (e) => {
  const cmd = e.cmd
  const data = e.data
  switch (cmd) {
    case 'SYSTEM_READY':
      log('Downloader ready.')
      data.self.start()
      break
    case 'FILE_INFORMATION':
      downloads[data.filename] = data
      break
    case 'SEGMENT_COMPLETE':
      break
    case 'DOWNLOAD_FINISHED':
      console.log('DOWNLOAD FINISHED')
      downloads[data.filename]['finished'] = true
      break
    case 'VIDEO_SEGMENT':
      videoSegments.push(URL.createObjectURL(new Blob([data.buffer])))
      console.log(videoSegments)
      break
    case 'COMPLETE_FILE':
      console.log(data)
      if (data.script) {
        hiddendl.href = data.script
        hiddendl.download = `${data.filename}-assembler`
        hiddendl.click()
      }
      hiddendl.href = data.url
      hiddendl.download = `${data.filename}-${data.filepiece}`
      hiddendl.click()
    default:
      break
  }
}

function fetchAndAppend(url, cb) {
  console.log(url)
  fetch(url)
    .then((res) => {
      return res.arrayBuffer()
    })
    .then((buff) => {
      cb(buff)
    })
}

function setupMediasource() {
  ms = new MediaSource()
  video.src = URL.createObjectURL(ms)
  console.log(MediaSource.isTypeSupported('video/mp4; codecs="avc1.4D401F"'))
  ms.addEventListener('sourceopen', () => {
    videoSourceBuffer = ms.addSourceBuffer('video/mp4; codecs="avc1.4D401F"')
    let video
    function fetchSegment() {
      video = videoSegments.shift()
      if (video) {
        fetchAndAppend(video, (buff) => {
          videoSourceBuffer.appendBuffer(buff)
        })
      } else {
        setTimeout(() => {
          fetchSegment()
        }, 2000)
      }
    }
    fetchSegment()
    // let video = videoSegments.shift()
    // if (video) {
    //   fetchAndAppend(video, videoSourceBuffer)
    // }
    // videoSourceBuffer.addEventListener('update', () => {
    //   video = videoSegments.shift()
    //   if (video) {
    //     fetchAndAppend(video, videoSourceBuffer)
    //   }
    // })
  })
}

files.forEach((file) => {
  file.addEventListener('click', (e) => {
    console.log(e.target.dataset)
    // const isVideo = e.target.dataset.isvideo ? true : false
    // console.log(isVideo)
    // if (isVideo) {
    //   videoWrapper.classList.remove('hide')
    //   setupMediasource()
    //   downloads.push(
    //     new Downloader(e.target.dataset['filename'], isVideo, callback)
    //   )
    //   return
    // }
    downloads.push(
      new Downloader(e.target.dataset['filename'], false, callback)
    )
  })
})
