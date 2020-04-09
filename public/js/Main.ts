import Downloader from './Downloader.js'

const hiddendl = document.getElementById('hiddendl')
const files = document.querySelectorAll('.item')
const downloads = []

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
    case 'COMPLETE_FILE':
      console.log(data)
      hiddendl.href = data.url
      hiddendl.download = data.filename
      hiddendl.click()
    default:
      break
  }
}

files.forEach((file) => {
  file.addEventListener('click', (e) => {
    console.log(e.target.dataset['filename'])
    downloads.push(new Downloader(e.target.dataset['filename'], callback))
  })
})
