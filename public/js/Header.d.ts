declare function importScripts(...urls: string[]): void

interface fileInformation {
  filename: string
  extension: string
  totalsize: number
  parts: number | string
  mimetype: string
}

interface filePiece {
  filepiece: number
  filename: string
  extension: string
  size: number
  parts: number | string
  chunksize: number
  downloadCount: number
  startOffset: number
  endOffset: number
  mimetype: string
}

interface managerMessage {
  cmd: 'REQUEST DOWNLOAD'
  data: {
    filename: string
    extension: string
    offset: number
    chunksize: number
  }
}

interface downloadWorkerMessage {
  cmd: 'SAVE_TO_DATABASE'
  data: {
    downloadWorkerID: number
    filename: string
    extension: string
    base64: string
    offset: number
  }
}

interface downloadQueue {
  filename: string
  extension: string
  offset: number
  chunksize: number
}

interface downloadWorker {
  worker: Worker
  channel: MessageChannel
  state: 'IDLE' | 'DOWNLOADING'
}

interface downloadWorkerInfo {
  id: number
  channel: MessagePort
}
