import ManagerWorker from './ManagerWorker.js'
import AssemblyWorker from './AssemblyWorker.js'
export default class Downloader {
  static JS_FOLDER_URL = `http://localhost:3000/js/`
  private DEBUG = false
  private MAX_FILE_SIZE = 314572800
  private FIVE_MB = 52428800
  private fileInformation: fileInformation
  private filePieces: Array<filePiece> = []
  private currentFilePiece: filePiece = null
  private managerWorker: Worker
  private assemblyWorker: Worker = null
  private downloadQueue: Array<downloadQueue> = []
  private queueInterval
  private queueConsumeInterval
  private checkDownloadInterval
  private downloadState: 'start' | 'pause' | 'stop' = 'stop'
  private systemState: 'ready' | 'waiting' = 'waiting'
  private chunksize: number = 1048576
  private mainCallback: Function
  constructor(url: string, callback: Function) {
    if (!window.indexedDB) {
      alert(
        "Your browser doesn't support a stable version of IndexedDB.\nWe recommend you use the Chrome browser."
      )
    }
    this.fetchFileInformation(url).then(() => {
      console.log(this.filePieces)
      // this.log(this.fileInformation)
      this.managerWorker = new ManagerWorker().getWorker()
      this.currentFilePiece = this.filePieces.shift()
      this.managerWorker.postMessage({
        cmd: 'START',
        data: this.currentFilePiece,
      })
      this.managerWorker.onmessage = this.messageChannel
    })
    this.mainCallback = callback
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
        this.mainCallback(e.data)
        this.systemState = 'ready'
        this.queueInterval = this.pushQueue()
        this.queueConsumeInterval = this.consumeQueue()
        break
      // case 'CHECKED_FILE_PROGRESS':
      //   this.fileInformation.downloadCount = data.downloadCount
      //   this.mainCallback({
      //     cmd: 'FILE_INFORMATION',
      //     data: this.fileInformation
      //   })
      //   break
      case 'SEGMENT_COMPLETE':
        this.currentFilePiece.downloadCount++
        this.checkDownloadStatus()
        break
      // case 'ASSEMBLER_READY':
      // // this.assemblyWorker.postMessage({
      // //   cmd: 'REQUEST_FILE',
      // //   data: data
      // // })
      case 'COMPLETE_FILE':
        console.log('COMPLETE FILE')
        this.mainCallback({
          cmd: 'COMPLETE_FILE',
          data: {
            url: data.url,
            filename: `${this.currentFilePiece.filename}-${this.currentFilePiece.filepiece}`,
          },
        })
        if (this.filePieces.length > 0) {
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
    while (filesize >= this.MAX_FILE_SIZE) {
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
        mimetype: this.fileInformation.mimetype,
      })
      filesize -= this.MAX_FILE_SIZE
    }
    if (filesize < this.MAX_FILE_SIZE) {
      this.filePieces.push({
        filepiece: this.filePieces.length,
        filename: file.filename,
        extension: file.extension,
        size: filesize,
        parts: Math.ceil(filesize / this.chunksize),
        chunksize: this.chunksize,
        downloadCount: 0,
        startOffset: 0,
        downloadOffset:
          this.filePieces.length > 0
            ? this.filePieces.length * this.MAX_FILE_SIZE
            : 0,
        mimetype: this.fileInformation.mimetype,
      })
    }
  }

  fetchFileInformation = (url: string) => {
    return fetch(url)
      .then((res) => {
        return res.json()
      })
      .then((file) => {
        this.fileInformation = {
          filename: file.filename,
          extension: file.extension,
          totalsize: file.size,
          parts: Math.ceil(file.size / this.chunksize),
          mimetype: file.mimetype,
        }
        this.setupFilePieces(file)
        //console.log(file.size);
      })
  }

  pushQueue = () => {
    return setInterval(() => {
      console.log(this.downloadState)
      if (this.downloadState === 'start') {
        if (this.downloadQueue.length < 20) {
          //console.log(this.fileInformation.startOffset);
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
    }, 500)
  }

  consumeQueue = () => {
    return setInterval(() => {
      if (this.downloadState === 'start') {
        if (this.downloadQueue.length > 0) {
          const file = this.shuffle(this.downloadQueue).shift()
          const message: managerMessage = {
            cmd: 'REQUEST DOWNLOAD',
            data: file,
          }
          this.managerWorker.postMessage(message)
        }
      }
    }, 500)
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

  //   postMessage = e => {
  //     const cmd = e.cmd
  //     const data: fileInformation = e.data
  //     switch (cmd) {
  //       case 'REQUEST_FILE':
  //         this.assemblyWorker = new AssemblyWorker().getWorker()
  //         this.assemblyWorker.onmessage = this.messageChannel
  //         this.assemblyWorker.postMessage({
  //           cmd: 'START',
  //           data
  //         })
  //         break
  //       default:
  //         break
  //     }
  //   }

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
