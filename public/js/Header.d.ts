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
  downloadOffset: number
  mimetype: string
}

interface managerMessage {
  cmd: 'REQUEST DOWNLOAD'
  data: {
    filename: string
    extension: string
    startOffset: number
    chunksize: number
  }
}

interface downloadWorkerMessage {
  cmd: 'SEGMENT_COMPLETE'
  data: {
    downloadWorkerID: number
    filename: string
    extension: string
    buffer: Buffer
    startOffset: number
    downloadOffset: number
  }
}

interface downloadQueue {
  filename: string
  extension: string
  startOffset: number
  downloadOffset: number
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
