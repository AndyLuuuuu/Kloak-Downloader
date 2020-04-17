class AssemblyWorker {
  private worker: Worker
  constructor() {
    this.log(`AssemblyWorker created.`)
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
    importScripts(`${self.location.origin}/js/DatabaseWorker.js`)
    importScripts(`${self.location.origin}/js/jimp.min.js`)
    let databaseWorker = {
      worker: null,
      channel: null,
    }

    let assemblyWorkerChannel = null
    let fileInformation: filePiece = null
    let assembledFile = null

    const log = (message: string) => {
      console.log(`<${new Date().toLocaleString()}> ${message}`)
    }

    const messageChannel = (e) => {
      const cmd = e.data.cmd
      const data = e.data.data
      switch (cmd) {
        case 'DATABASE_READY':
          log(data.message)
          break
        case 'REQUESTED_FILE_PIECE':
          assembledFile.set(Buffer.from(data.data, 'base64'), data.offset)
          break
        case 'REQUESTED_FILE_COMPLETE':
          const file = new Blob([assembledFile.buffer], {
            type: 'application/octet-stream',
          })
          const fileURL = URL.createObjectURL(file)
          assemblyWorkerChannel.postMessage({
            cmd: 'COMPLETE_FILE',
            data: { url: fileURL },
          })
          databaseWorker.worker.postMessage({
            cmd: 'CLEAR_FILESTORE',
            data: fileInformation,
          })
          assembledFile = null
          break
        default:
          break
      }
    }

    const setupDatabaseWorker = (filename: string) => {
      databaseWorker = {
        worker: new DatabaseWorker().getWorker(),
        channel: new MessageChannel(),
      }
      databaseWorker.channel.port1.onmessage = messageChannel
      databaseWorker.worker.postMessage(
        {
          cmd: 'START',
          data: {
            filename,
            channel: databaseWorker.channel.port2,
          },
        },
        [databaseWorker.channel.port2]
      )
    }

    self.addEventListener('message', (e) => {
      const cmd = e.data.cmd
      const data = e.data.data
      switch (cmd) {
        case 'START':
          setupDatabaseWorker(data.filename)
          assemblyWorkerChannel = data.channel
          break
        case 'ASSEMBLE_FILE':
          fileInformation = data
          assembledFile = new Uint8Array(fileInformation.size)
          databaseWorker.worker.postMessage({
            cmd: 'REQUEST_FILE_PIECES',
            data: fileInformation,
          })
        default:
          break
      }
    })
  }
}
