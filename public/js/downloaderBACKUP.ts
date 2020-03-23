const file_input = document.getElementById('fileInput')
const filecreate = document.getElementById('filecreate')
const detailsBox = document.getElementById('details')
const progressBar = document.getElementById('fileprogress')
const progressMsg = document.getElementById('progressMsg')

// // In the following line, you should include the prefixes of implementations you want to test.
// window.indexedDB =
//   window.indexedDB ||
//   window.mozIndexedDB ||
//   window.webkitIndexedDB ||
//   window.msIndexedDB
// // DON'T use "var indexedDB = ..." if you're not in a function.
// // Moreover, you may need references to some window.IDB* objects:
// window.IDBTransaction = window.IDBTransaction ||
//   window.webkitIDBTransaction ||
//   window.msIDBTransaction || { READ_WRITE: 'readwrite' } // This line should only be needed if it is needed to support the object's constants for older browsers
// window.IDBKeyRange =
//   window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange
// // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*)

// const DB_VERSION = 3
// let db: IDBDatabase = null
// let transaction: IDBTransaction = null
// const TEST_UUID = '756822e9-1e07-482c-b640-72199e169f98'
// let totalSize: number = null
// let totalParts: number = 200

progressBar.max = totalParts
progressBar.value = 0

if (!window.indexedDB) {
  console.log(
    "Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available."
  )
}

const request: IDBOpenDBRequest = window.indexedDB.open(
  'kloak-download',
  DB_VERSION
)

request.onerror = e => {
  console.log(e)
}

request.onupgradeneeded = e => {
  db = e.target.result
  let fileStore = db.createObjectStore(TEST_UUID, { keyPath: 'offset' })
}

request.onsuccess = e => {
  db = e.target.result
  console.log('success', db)
}

function shuffle(array): Array<Blob> {
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

function fileSlice(blob: Blob) {
  totalSize = blob.size
  console.log(totalSize)
  let blobs = []
  let chunkSize = Math.floor(blob.size / totalParts)
  console.log(chunkSize)
  let start = 0
  for (i = 0; i < totalParts; i++) {
    let end = start + chunkSize + 1
    let tempBlob = blob.slice(start, end)
    blobs.push({ offset: start, blob: tempBlob })
    start += chunkSize + 1
  }
  blobs = shuffle(blobs)
  console.log(blobs)
  fileStoring(blobs)
  // console.log(blobs)
}

function fileStoring(blobs) {
  progressMsg.textContent = 'Storing into IndexedDB...'
  function storeToDB(uint8part, offset) {
    // uint8.set(uint8part, offset)
    // console.log(fileStore)
    transaction = db.transaction([TEST_UUID], 'readwrite')
    const base64 = Buffer.from(uint8part).toString('base64')
    let addTransaction = transaction.objectStore(TEST_UUID)
    addTransaction.add({ offset: offset, data: base64 })
    progressBar.value++
    if (progressBar.value === totalParts) {
      progressMsg.textContent = 'All file parts stored in IndexedDB.'
    }
    // let request = fileStore.add({ offset: offset, data: base64 })
    // request.onsuccess = e => {
    //   console.log(e.target.result)
    // }
    // console.log(uint8)
    // counter--
    // if (counter <= 0) {
    //   outputFile()
    // }
  }

  function fetchBlob(blob, offset, fn) {
    fetch(URL.createObjectURL(blob))
      .then(res => {
        return res.arrayBuffer()
      })
      .then(buff => {
        // progressMsg.textContent = `${Math.random()}`
        fn(new Uint8Array(buff), offset)
      })
  }

  blobs.map(blob => {
    fetchBlob(blob.blob, blob.offset, storeToDB)
  })
  // let file = new Blob([blobs], { type: 'application/pdf' })
  // console.log(file)
  // const blob = new Blob([blobs], { type: 'application/pdf' })
  // const file = new File(blobs, 'test.mp4', { type: 'video/mp4' })
  // console.log(file)
  // document.getElementById('dl').href = URL.createObjectURL(file)
}

function fileCombine() {
  const uint8 = new Uint8Array(totalSize)
  const fileStore = db.transaction(TEST_UUID).objectStore(TEST_UUID)
  progressMsg.textContent = 'Combining file...'
  progressBar.value = 0
  fileStore.openCursor().onsuccess = e => {
    let cursor = e.target.result
    if (cursor) {
      progressBar.max = totalParts
      uint8.set(Buffer.from(cursor.value.data, 'base64'), cursor.value.offset)
      progressBar.value++
      console.log(cursor.value.offset, cursor.value.data)
      cursor.continue()
    } else {
      const blob = new Blob([uint8.buffer], { type: 'application/zip' })
      document.getElementById('dl').href = URL.createObjectURL(blob)
      progressMsg.textContent = 'File ready!'
      // console.log(uint8.buffer, uint8.byteLength)
    }
    // console.log(e.target.result)
  }
  console.log(fileStore)
}

filecreate.addEventListener('click', () => {
  fileCombine()
})

file_input.addEventListener('change', e => {
  fileSlice(e.target.files[0])
})
