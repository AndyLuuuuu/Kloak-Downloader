class DownloadWorker {
  private DEBUG = false
  private worker: Worker
  constructor() {
    this.log(`DownloadWorker created.`)
    this.init()
  }

  init = () => {
    const workerURL = URL.createObjectURL(
      new Blob([`(${this.workerFn.toString()})()`], { type: 'text/javascript' })
    )
    this.worker = new Worker(workerURL)
    URL.revokeObjectURL(workerURL)
  }

  log(message: string) {
    console.log(`<${new Date().toLocaleString()}> ${message}`)
  }

  getWorker(): Worker {
    return this.worker
  }

  workerFn = () => {
    let BASE_URL = `http://192.168.0.12:3000/download?`
    let downloadWorkerInfo: downloadWorkerInfo = null
    const query = (data: downloadQueue) => {
      return Object.keys(data)
        .map((key) => (key = `${key}=${data[key]}`))
        .join('&')
    }

    self.addEventListener('message', (e) => {
      const cmd = e.data.cmd
      const data = e.data.data
      switch (cmd) {
        case 'START':
          downloadWorkerInfo = data
          break
        case 'DOWNLOAD':
          fetch(`${BASE_URL}${query(data)}`)
            .then((res) => {
              return res.arrayBuffer()
            })
            .then((buffer) => {
              downloadWorkerInfo.channel.postMessage(
                <downloadWorkerMessage>{
                  cmd: 'SEGMENT_COMPLETE',
                  data: {
                    downloadWorkerID: downloadWorkerInfo.id,
                    filename: data.filename,
                    extension: data.extension,
                    startOffset: data.startOffset,
                    downloadOffset: data.downloadOffset,
                    buffer,
                  },
                },
                [buffer]
              )
            })
          break
        default:
          break
      }
    })
  }
}
