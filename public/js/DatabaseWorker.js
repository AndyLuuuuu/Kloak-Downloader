var DatabaseWorker = /** @class */ (function () {
    function DatabaseWorker() {
        var _this = this;
        this.init = function () {
            var workerURL = URL.createObjectURL(new Blob(["(" + _this.workerFn.toString() + ")()"], { type: 'text/javascript' }));
            _this.worker = new Worker(workerURL);
            URL.revokeObjectURL(workerURL);
        };
        this.workerFn = function () {
            var db = null;
            var tx = null;
            var fileStore = null;
            var databaseWorkerChannel = null;
            function saveToDatabase(db, data) {
                // // console.log(db);
                var tx = db.transaction(data.filename, 'readwrite');
                var store = tx.objectStore(data.filename);
                store.add({ offset: data.startOffset, data: data.base64 }, data.startOffset);
            }
            function checkFileExistence(db, data) {
                // console.log(data)
                tx = db.transaction(data.filename, 'readonly');
                fileStore = tx.objectStore(data.filename);
                fileStore.getKey(data.offset).onsuccess = function (e) {
                    // console.log(Boolean(e.target.result))
                    databaseWorkerChannel.postMessage({
                        cmd: 'CHECKED_FILE',
                        data: { fileExists: Boolean(e.target.result), file: data }
                    });
                };
            }
            function checkFileProgress(db, data) {
                tx = db.transaction(data.filename, 'readonly');
                fileStore = tx.objectStore(data.filename);
                fileStore.count().onsuccess = function (e) {
                    // console.log(e.target.result)
                    databaseWorkerChannel.postMessage({
                        cmd: 'CHECKED_FILE_PROGRESS',
                        data: {
                            downloadCount: e.target.result
                        }
                    });
                };
            }
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                console.log('DATABASE', data);
                switch (cmd) {
                    case 'START':
                        databaseWorkerChannel = data.channel;
                        var req = indexedDB.open(data.fileInformation.filename, 1);
                        console.log(data);
                        req.onupgradeneeded = function (e) {
                            db = e.target.result;
                            var fileStore = db.createObjectStore(data.fileInformation.filename, {
                                autoIncrement: true
                            });
                        };
                        req.onsuccess = function (e) {
                            db = e.target.result;
                            if (e.target.readyState === 'done') {
                                data.channel.postMessage({
                                    cmd: 'DATABASE_READY',
                                    data: { message: 'Database and filestore ready.' }
                                });
                            }
                            // console.log(db)
                        };
                        req.onerror = function (e) {
                            data.channel.postMessage({
                                cmd: 'DATABASE_ERROR',
                                data: { message: 'Database error.' }
                            });
                        };
                        break;
                    case 'REQUEST_FILE_PIECES':
                        fileStore = db
                            .transaction(data.filename, 'readonly')
                            .objectStore(data.filename);
                        fileStore.openCursor().onsuccess = function (e) {
                            var cursor = e.target.result;
                            if (cursor) {
                                databaseWorkerChannel.postMessage({
                                    cmd: 'REQUESTED_FILE_PIECE',
                                    data: cursor.value
                                });
                                cursor["continue"]();
                            }
                            else {
                                databaseWorkerChannel.postMessage({
                                    cmd: 'REQUESTED_FILE_COMPLETE',
                                    data: data
                                });
                            }
                        };
                        // console.log(data)
                        break;
                    case 'CHECK_FILE':
                        checkFileExistence(db, data);
                        break;
                    case 'SAVE_TO_DATABASE':
                        saveToDatabase(db, data);
                        // console.log('DATABASEWORKER', data)
                        databaseWorkerChannel.postMessage({
                            cmd: 'SAVED_TO_DATABASE',
                            data: {
                                filename: data.filename,
                                offset: data.offset,
                                message: 'Successfully saved to database.'
                            }
                        });
                    case 'CHECK_FILE_PROGRESS':
                        // console.log(data)
                        checkFileProgress(db, data);
                        break;
                    case 'CLEAR_FILESTORE':
                        console.log('I SHOULD CLEAR FILESTORE');
                        tx = db.transaction(data.filename, 'readwrite');
                        fileStore = tx.objectStore(data.filename);
                        fileStore.clear().onsuccess = function (e) {
                            console.log('CLEARED');
                        };
                        break;
                    default:
                        break;
                }
            });
        };
        this.log("DatabaseWorker created.");
        this.init();
    }
    DatabaseWorker.prototype.log = function (message) {
        // console.log(`<${new Date().toLocaleString()}> ${message}`)
    };
    DatabaseWorker.prototype.getWorker = function () {
        return this.worker;
    };
    return DatabaseWorker;
}());
