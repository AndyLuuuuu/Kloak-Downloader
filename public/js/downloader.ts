class Downloader {
  private MAX_DL_WORKERS: number
  private CHUNKSIZE: string
  private BASE_URL: string
  private UUID: string
  private workerManager: Worker
  private databaseManager: Worker
  constructor(
    maxWorkers: number,
    chunksize: string,
    baseurl: string,
    uuid: string
  ) {
    this.MAX_DL_WORKERS = maxWorkers
    this.CHUNKSIZE = chunksize
    this.BASE_URL = baseurl
    this.UUID = uuid
  }
  init = () => {
    this.databaseManager = new Worker('./databaseWorker.js')
    this.workerManager = new Worker('./workerManager.js')
    this.workerManager.addEventListener('message', this.messageHandler)
    this.workerManager.postMessage({
      cmd: 'initialize',
      data: {
        maxDownloadWorkers: this.MAX_DL_WORKERS,
        chunkSize: this.CHUNKSIZE,
        baseURL: this.BASE_URL,
        uuid: this.UUID
      }
    })
  }
  messageHandler = e => {
    console.log(e)
  }
}
