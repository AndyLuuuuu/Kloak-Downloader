interface config {
  baseURL: string
  maxDownloadWorkers: number
  chunkSize: number
  fileUUID: string
}
const config: config = {
  baseURL: null,
  maxDownloadWorkers: null,
  chunkSize: null,
  fileUUID: null
}

const downloadQueue: string[] = []
const downloadWorkers: Worker[] = []
const isDownloading: boolean = false

let fileDownloadInfo = {
  filename: null,
  extension: null,
  totalsize: null,
  parts: null,
  chunksize: 1048576,
  downloadCount: 0,
  startOffset: 0
}

function createDownloadWorker() {
  const worker = {
    worker: new Worker('../js/downloadWorker.js'),
    messageChannel: new MessageChannel(),
    idle: true
  }
  worker.messageChannel.port1.onmessage = workerMessages
  worker.worker.postMessage(
    {
      cmd: 'start',
      data: { id: downloadWorkers.length, channel: worker.messageChannel.port2 }
    },
    [worker.messageChannel.port2]
  )
  downloadWorkers.push(worker)
}

function workerMessages(e) {
  const cmd = e.data.cmd
  const data = e.data.data
  switch (cmd) {
    case 'saveToDB':
      downloadWorkers[data.workerid].idle = true
      DATABASE_WORKER.postMessage({
        cmd: 'saveToDB',
        data: {
          filename: data.filename,
          ext: data.ext,
          base64: data.base64,
          offset: data.offset
        }
      })
      console.log(data)
      break
    default:
      break
  }
}

self.addEventListener('message', e => {
  const cmd = e.data.cmd
  const data = e.data.data
  switch (cmd) {
    case 'initialize':
      console.log('Worker manager started.')
      config.baseURL = data.baseURL
      config.maxDownloadWorkers = data.maxDownloadWorkers
      config.chunkSize = data.chunkSize
      config.fileUUID = data.uuid
      break
    // Retrieve basic data about file, filename, extension and filesize
    case 'getfile':
      fetch(`${BASE_URL}filename=${data.filename}&ext=${data.ext}`)
        .then(res => {
          return res.json()
        })
        .then(json => {
          setFileInformation(json.filename, json.ext, json.size)
        })
        .then(() => {
          startDownloadProcess()
        })
      break
    case 'downloadWorker':
      break
    default:
      console.log('lol')
  }
})

function setFileInformation(
  filename: string,
  extension: string,
  totalsize: number
) {
  fileDownloadInfo.filename = filename
  fileDownloadInfo.totalsize = totalsize
  fileDownloadInfo.extension = extension
  fileDownloadInfo.parts = Math.ceil(totalsize / ONE_MB)
  console.log(`TOTAL PARTS: ${Math.ceil(totalsize / ONE_MB)}`)
  // fileDownloadInfo.parts = 2
}

function requestDownload(offset: number) {
  if (workers.length === MAX_DL_WORKERS) {
    for (const worker of workers) {
      if (worker.idle) {
        worker.worker.postMessage({
          cmd: 'download',
          data: {
            filename: fileDownloadInfo.filename,
            ext: fileDownloadInfo.extension,
            offset: offset,
            chunksize: fileDownloadInfo.chunksize
          }
        })
        worker.idle = false
        fileDownloadInfo.downloadCount = fileDownloadInfo.downloadCount + 1
        return
      }
    }
  } else {
    createNewDownloadWorker()
  }
  return requestDownload(offset)
}

function startDownloadProcess() {
  const queueInterval = setInterval(() => {
    if (queue.length < 10) {
      console.log('Adding to queue!')
      if (fileDownloadInfo.downloadCount < fileDownloadInfo.parts) {
        queue.push({
          filename: fileDownloadInfo.filename,
          ext: fileDownloadInfo.extension,
          offset: fileDownloadInfo.startOffset
        })
        fileDownloadInfo.startOffset =
          fileDownloadInfo.startOffset + fileDownloadInfo.chunksize
      }
    }
  }, 500)

  const queueConsume = setInterval(() => {
    console.log('Consuming a queue!')
    if (queue.length > 0) {
      const file = queue.shift()
      console.log(file)
      requestDownload(file.offset)
    }
  }, 500)
}
