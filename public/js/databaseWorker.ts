const DB_VERSION = 3
let db = null
let dbPromise: IDBDatabase = null
let transaction: IDBTransaction = null

async function saveToDatabase(db: IDBDatabase, data, upgrade?: boolean) {
  let fileStore = null
  if (upgrade) {
    fileStore = await db.createObjectStore(data.filename, { keyPath: 'offset' })
  } else {
    let tx = await db.transaction(data.filename, 'readwrite')
    tx.oncomplete = () => {
      console.log('Added data')
    }
    let txAdd = tx.objectStore(data.filename)
    txAdd.add({ offset: data.offset, data: data.base64 })
  }
}

self.addEventListener('message', e => {
  const cmd = e.data.cmd
  const data = e.data.data
  switch (cmd) {
    case 'start':
      break
    case 'saveToDB':
      db = indexedDB.open('kloak-idb', DB_VERSION)
      db.onupgradeneeded = e => {
        saveToDatabase(e.target.result, data, true)
      }
      db.onsuccess = e => {
        saveToDatabase(e.target.result, data, false)
      }
      console.log(db)
      // console.log(db)
      // transaction = db.transaction(data.filename, 'readwrite')
      // let addTransaction = transaction.objectStore(data.filename)
      // addTransaction.add({ offset: data.offset, data: data.base64 })
      break
    default:
      break
  }
})
