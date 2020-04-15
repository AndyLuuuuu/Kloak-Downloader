import ManagerWorker from './ManagerWorker.js'
import AssemblyWorker from './AssemblyWorker.js'
export default class Downloader {
  static JS_FOLDER_URL = `http://192.168.0.12:3000/js/`
  private DOWNLOAD_BASE_URL = `http://192.168.0.12:3000/requestfile?file=`
  private filename = ''
  private DEBUG = false
  private MAX_FILE_SIZE = 314572800
  private file: fileInformation
  private filePieces: Array<filePiece> = []
  private currentFilePiece: filePiece = null
  private managerWorker: Worker
  private assemblyWorker: Worker = null
  private downloadQueue: Array<downloadQueue> = []
  private queueInterval
  private queueConsumeInterval
  private checkDownloadInterval
  private downloadState: 'start' | 'pause' | 'stop' = 'stop'
  private chunksize: number = 2097152
  private isVideo: boolean = false
  private mainCallback: Function
  constructor(filename: string, isVideo: boolean, callback: Function) {
    if (!window.indexedDB) {
      alert(
        "Your browser doesn't support a stable version of IndexedDB.\nWe recommend you use the Chrome browser."
      )
    }
    this.isVideo = isVideo
    this.managerWorker = new ManagerWorker().getWorker()
    this.managerWorker.onmessage = this.messageChannel
    this.managerWorker.postMessage({ cmd: 'START', data: filename })
    this.mainCallback = callback
    this.filename = filename
    this.queueInterval = this.pushQueue()
    this.queueConsumeInterval = this.consumeQueue()
  }

  log = (message: any) => {
    if (this.DEBUG) {
      console.log(message)
    }
  }

  messageChannel = (e) => {
    const cmd = e.data.cmd
    const data = e.data.data
    switch (cmd) {
      case 'SYSTEM_READY':
        this.mainCallback({
          cmd: 'SYSTEM_READY',
          data: { msg: data, self: this },
        })
        this.fetchFileInformation(
          `${this.DOWNLOAD_BASE_URL}${this.filename}`
        ).then((file) => {
          this.managerWorker.postMessage({
            cmd: 'CHECK_PROGRESS',
            data: file.filename,
          })
        })
        break
      case 'CHECKED_PROGRESS':
        if (data) {
          this.filePieces = data
        } else {
          this.setupFilePieces(this.file)
          this.managerWorker.postMessage({
            cmd: 'SAVE_PROGRESS',
            data: this.filePieces,
          })
        }
        this.currentFilePiece = this.filePieces.shift()
        break
      case 'SEGMENT_COMPLETE':
        this.currentFilePiece.downloadCount++
        this.checkDownloadStatus()
        if (this.isVideo) {
          this.mainCallback({ cmd: 'VIDEO_SEGMENT', data })
        }
        break
      case 'COMPLETE_FILE':
        let script: Blob = undefined
        if (this.filePieces.length <= 0) {
          script = new Blob(
            [
              `#!/bin/bash\ncat ${this.currentFilePiece.filename}-*.${this.currentFilePiece.extension} > file.${this.currentFilePiece.extension}`,
            ],
            {
              type: 'application/x-shellscript',
            }
          )
        }
        this.mainCallback({
          cmd: 'COMPLETE_FILE',
          data: {
            url: data.url,
            script: script ? URL.createObjectURL(script) : null,
            filename: this.currentFilePiece.filename,
            filepiece: this.currentFilePiece.filepiece,
          },
        })
        if (this.filePieces.length > 0) {
          this.managerWorker.postMessage({
            cmd: 'SAVE_PROGRESS',
            data: this.filePieces,
          })
          this.currentFilePiece = this.filePieces.shift()
        } else {
          this.downloadState = 'stop'
        }
      default:
        break
    }
  }

  setupFilePieces = (file) => {
    let filesize = file.size
    const createFilePiece = () => {
      this.filePieces.push({
        filepiece: this.filePieces.length,
        filename: file.filename,
        extension: file.extension,
        size: this.MAX_FILE_SIZE,
        parts: Math.ceil(this.MAX_FILE_SIZE / this.chunksize),
        chunksize: this.chunksize,
        downloadCount: 0,
        startOffset: 0,
        downloadOffset:
          this.filePieces.length > 0
            ? this.filePieces.length * this.MAX_FILE_SIZE
            : 0,
        mimetype: this.file.mimetype,
      })
    }

    while (filesize >= this.MAX_FILE_SIZE) {
      createFilePiece()
      filesize -= this.MAX_FILE_SIZE
    }
    if (filesize < this.MAX_FILE_SIZE) {
      createFilePiece()
    }
  }

  fetchFileInformation = (url: string) => {
    return fetch(url)
      .then((res) => {
        return res.json()
      })
      .then((file) => {
        this.file = file
        return file
      })
  }

  pushQueue = () => {
    return setInterval(() => {
      if (this.downloadState === 'start') {
        if (this.downloadQueue.length < 20) {
          if (
            this.currentFilePiece.downloadCount < this.currentFilePiece.parts
          ) {
            this.downloadQueue.push(<downloadQueue>{
              filename: this.currentFilePiece.filename,
              extension: this.currentFilePiece.extension,
              startOffset: this.currentFilePiece.startOffset,
              downloadOffset: this.currentFilePiece.downloadOffset,
              chunksize: this.chunksize,
            })
            this.log(this.downloadQueue)
            this.currentFilePiece.downloadOffset =
              this.currentFilePiece.downloadOffset +
              this.currentFilePiece.chunksize
            this.currentFilePiece.startOffset =
              this.currentFilePiece.startOffset +
              this.currentFilePiece.chunksize
          }
        }
      }
    }, 1000)
  }

  consumeQueue = () => {
    return setInterval(() => {
      if (this.downloadState === 'start') {
        if (this.downloadQueue.length > 0) {
          const file = this.downloadQueue.shift()
          const message: managerMessage = {
            cmd: 'REQUEST DOWNLOAD',
            data: file,
          }
          this.managerWorker.postMessage(message)
        }
      }
    }, 1000)
  }

  checkDownloadStatus = () => {
    if (this.currentFilePiece.downloadCount >= this.currentFilePiece.parts) {
      if (this.assemblyWorker === null) {
        this.assemblyWorker = new AssemblyWorker().getWorker()
        this.assemblyWorker.onmessage = this.messageChannel
        this.assemblyWorker.postMessage({
          cmd: 'START',
          data: this.currentFilePiece,
        })
      } else {
        this.assemblyWorker.postMessage({
          cmd: 'NEXT',
          data: this.currentFilePiece,
        })
      }
    }
  }

  start = () => {
    this.downloadState = 'start'
  }

  shuffle = (array): Array<downloadQueue> => {
    let counter = array.length

    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      let index = Math.floor(Math.random() * counter)

      // Decrease counter by 1
      counter--

      // And swap the last element with it
      let temp = array[counter]
      array[counter] = array[index]
      array[index] = temp
    }
    return array
  }
}
