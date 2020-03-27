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
            var fileStore = null;
            var databaseWorkerChannel = null;
            function saveToDatabase(db, data) {
                // console.log(db);
                var tx = db.transaction(data.filename, 'readwrite');
                var store = tx.objectStore(data.filename);
                store.add({ offset: data.offset, data: data.base64 }, data.offset);
            }
            function checkFileExistence(db, data) {
                console.log(data);
                var tx = db.transaction(data.filename, 'readonly');
                var store = tx.objectStore(data.filename);
                store.count(data.offset).onsuccess = function (e) {
                    console.log(e.target.result);
                    databaseWorkerChannel.postMessage({
                        cmd: 'CHECKED_FILE',
                        data: { fileExists: Boolean(e.target.result), file: data }
                    });
                };
            }
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        databaseWorkerChannel = data.channel;
                        var req = indexedDB.open('kloak-files', 1);
                        req.onupgradeneeded = function (e) {
                            db = e.target.result;
                            fileStore = db.createObjectStore(data.fileInformation.filename, {
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
                            console.log(db);
                        };
                        req.onerror = function (e) {
                            data.channel.postMessage({
                                cmd: 'DATABASE_ERROR',
                                data: { message: 'Database error.' }
                            });
                        };
                        break;
                    case 'CHECK_FILE':
                        checkFileExistence(db, data);
                        // if (!res) {
                        //   console.log(res);
                        //   databaseWorkerChannel.postMessage({
                        //     cmd: 'CHECKED_FILE',
                        //     data: { fileExists: res, file: data }
                        //   });
                        // }
                        break;
                    case 'SAVE_TO_DATABASE':
                        saveToDatabase(db, data);
                        console.log('DATABASEWORKER', data);
                        databaseWorkerChannel.postMessage({
                            cmd: 'SAVED_TO_DATABASE',
                            data: {
                                filename: data.filename,
                                offset: data.offset,
                                message: 'Successfully saved to database.'
                            }
                        });
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
        console.log("<" + new Date().toLocaleString() + "> " + message);
    };
    DatabaseWorker.prototype.getWorker = function () {
        return this.worker;
    };
    return DatabaseWorker;
}());
