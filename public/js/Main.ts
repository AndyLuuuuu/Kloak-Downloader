import Downloader from './Downloader.js'

const downloadButton = document.getElementById('dl')
const saveButton = document.getElementById('save')
const hiddendl = document.getElementById('hiddendl')
const progressSegment = document.getElementById('progressSegment')
const progressMessage = document.getElementById('progressMessage')

const log = (message: string) => {
  console.log(`<${new Date().toLocaleString()}> ${message}`)
}

const updateProgress = (data) => {
  const percent = `${Math.round(
    (downloads[data.filename].downloadCount / downloads[data.filename].parts) *
      100
  )}%`
  if (downloads[data.filename].downloadCount !== 0) {
    downloads[data.filename].downloadCount++
    progressSegment.style.width = percent
    progressMessage.textContent = percent
  }
}

const downloads = {}

const callback = (e) => {
  const cmd = e.cmd
  const data = e.data
  switch (cmd) {
    case 'SYSTEM_READY':
      log('Downloader ready.')
      break
    case 'FILE_INFORMATION':
      downloads[data.filename] = data
      updateProgress(data)
      break
    case 'SEGMENT_COMPLETE':
      updateProgress(data)
      break
    case 'DOWNLOAD_FINISHED':
      console.log('DOWNLOAD FINISHED')
      saveButton.disabled = false
      saveButton.setAttribute('data-file', data.filename)
      downloads[data.filename]['finished'] = true
      // console.log('YO BRO, DOWNLOAD FINISHED');
      break
    case 'COMPLETE_FILE':
      console.log(data)
      hiddendl.href = data.url
      hiddendl.download = data.filename
      hiddendl.click()
    default:
      break
  }
}

const download = new Downloader(
  `http://localhost:3000/requestfile?file=0e781511-ed5e-42d7-a2da-df4b5a344fb2`,
  callback
)

downloadButton.addEventListener('click', () => {
  download.start()
})

saveButton.addEventListener('click', (e) => {
  download.postMessage({
    cmd: 'REQUEST_FILE',
    data: downloads[e.target.dataset.file],
  })
  progressMessage.textContent = 'Preparing file...'
})
