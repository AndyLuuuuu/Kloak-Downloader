class DatabaseWorker {
  private worker: Worker
  constructor() {
    this.log(`DatabaseWorker created.`)
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
    // console.log(`<${new Date().toLocaleString()}> ${message}`)
  }

  getWorker(): Worker {
    return this.worker
  }

  workerFn = () => {
    importScripts(`${self.location.origin}/js/jimp.min.js`)
    let db: IDBDatabase = null
    let tx: IDBTransaction = null
    let fileStore: IDBObjectStore = null
    let databaseWorkerChannel: MessagePort = null

    function saveToDatabase(db: IDBDatabase, data) {
      const base64 = Buffer.from(data.buffer).toString('base64')
      let tx = db.transaction(data.filename, 'readwrite')
      let store = tx.objectStore(data.filename)
      store.add({ offset: data.startOffset, data: base64 }, data.startOffset)
    }

    self.addEventListener('message', (e) => {
      const cmd = e.data.cmd
      const data = e.data.data
      switch (cmd) {
        case 'START':
          databaseWorkerChannel = data.channel
          const req = indexedDB.open(data.filename, 1)
          req.onupgradeneeded = (e) => {
            db = e.target.result
            db.createObjectStore(data.filename)
          }
          req.onsuccess = (e) => {
            db = e.target.result
            if (e.target.readyState === 'done') {
              data.channel.postMessage({
                cmd: 'DATABASE_READY',
                data: { message: 'Database and filestore ready.' },
              })
            }
          }
          req.onerror = (e) => {
            data.channel.postMessage({
              cmd: 'DATABASE_ERROR',
              data: { message: 'Database error.' },
            })
          }
          break
        case 'CHECK_PROGRESS':
          fileStore = db
            .transaction(data.filename, 'readonly')
            .objectStore(data.filename)
          fileStore.get('status').onsuccess = (e) => {
            databaseWorkerChannel.postMessage({
              cmd: 'CHECKED_PROGRESS',
              data: e.target.result,
            })
          }
          break
        case 'SAVE_PROGRESS':
          fileStore = db
            .transaction(data[0].filename, 'readwrite')
            .objectStore(data[0].filename)
          fileStore.add(data, 'status')
          break
        case 'REQUEST_FILE_PIECES':
          fileStore = db
            .transaction(data.filename, 'readonly')
            .objectStore(data.filename)
          fileStore.openCursor().onsuccess = (e) => {
            let cursor = e.target.result
            if (cursor) {
              databaseWorkerChannel.postMessage({
                cmd: 'REQUESTED_FILE_PIECE',
                data: cursor.value,
              })
              cursor.continue()
            } else {
              databaseWorkerChannel.postMessage({
                cmd: 'REQUESTED_FILE_COMPLETE',
                data,
              })
            }
          }
          break
        case 'SAVE_TO_DATABASE':
          saveToDatabase(db, data)
          databaseWorkerChannel.postMessage({
            cmd: 'SAVED_TO_DATABASE',
            data: {
              filename: data.filename,
              offset: data.offset,
              message: 'Successfully saved to database.',
            },
          })
          break
        case 'CLEAR_FILESTORE':
          tx = db.transaction(data.filename, 'readwrite')
          fileStore = tx.objectStore(data.filename)
          fileStore.clear().onsuccess = (e) => {}
          break
        default:
          break
      }
    })
  }
}
