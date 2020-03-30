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
    console.log(`<${new Date().toLocaleString()}> ${message}`)
  }

  getWorker(): Worker {
    return this.worker
  }

  workerFn = () => {
    let db = null
    let tx = null
    let fileStore = null
    let databaseWorkerChannel: MessagePort = null
    let count = 0
    function saveToDatabase(db: IDBDatabase, data) {
      // console.log(db);
      let tx = db.transaction(data.filename, 'readwrite')
      let store = tx.objectStore(data.filename)
      store.add({ offset: data.offset, data: data.base64 }, data.offset)
    }

    function checkFileExistence(db: IDBDatabase, data) {
      console.log(data)
      tx = db.transaction(data.filename, 'readonly')
      fileStore = tx.objectStore(data.filename)
      fileStore.getKey(data.offset).onsuccess = e => {
        console.log(Boolean(e.target.result))
        databaseWorkerChannel.postMessage({
          cmd: 'CHECKED_FILE',
          data: { fileExists: Boolean(e.target.result), file: data }
        })
      }
    }

    function checkFileProgress(db: IDBDatabase, data) {
      tx = db.transaction(data.filename, 'readonly')
      fileStore = tx.objectStore(data.filename)
      fileStore.count().onsuccess = e => {
        console.log(e.target.result)
        databaseWorkerChannel.postMessage({
          cmd: 'CHECKED_FILE_PROGRESS',
          data: {
            downloadCount: e.target.result
          }
        })
      }
    }

    self.addEventListener('message', e => {
      const cmd = e.data.cmd
      const data = e.data.data
      switch (cmd) {
        case 'START':
          databaseWorkerChannel = data.channel
          var req = indexedDB.open('kloak-files', 1)
          req.onupgradeneeded = function(e) {
            db = e.target.result
            let fileStore = db.createObjectStore(
              data.fileInformation.filename,
              {
                autoIncrement: true
              }
            )
          }
          req.onsuccess = function(e) {
            db = e.target.result
            if (e.target.readyState === 'done') {
              data.channel.postMessage({
                cmd: 'DATABASE_READY',
                data: { message: 'Database and filestore ready.' }
              })
            }
            console.log(db)
          }
          req.onerror = function(e) {
            data.channel.postMessage({
              cmd: 'DATABASE_ERROR',
              data: { message: 'Database error.' }
            })
          }
          break
        case 'REQUEST_FILE_PIECES':
          fileStore = db
            .transaction(data.filename, 'readonly')
            .objectStore(data.filename)
          fileStore.openCursor().onsuccess = e => {
            let cursor = e.target.result
            if (cursor) {
              databaseWorkerChannel.postMessage({
                cmd: 'REQUESTED_FILE_PIECE',
                data: cursor.value
              })
              cursor.continue()
            } else {
              databaseWorkerChannel.postMessage({
                cmd: 'REQUESTED_FILE_COMPLETE',
                data
              })
            }
          }

          console.log(data)
          break
        case 'CHECK_FILE':
          checkFileExistence(db, data)
          break
        case 'SAVE_TO_DATABASE':
          saveToDatabase(db, data)
          console.log('DATABASEWORKER', data)
          databaseWorkerChannel.postMessage({
            cmd: 'SAVED_TO_DATABASE',
            data: {
              filename: data.filename,
              offset: data.offset,
              message: 'Successfully saved to database.'
            }
          })
        case 'CHECK_FILE_PROGRESS':
          console.log(data)
          checkFileProgress(db, data)
          break
        default:
          break
      }
    })
  }
}
