var DatabaseWorker = /** @class */ (function () {
    function DatabaseWorker() {
        var _this = this;
        this.init = function () {
            var workerURL = URL.createObjectURL(new Blob(["(" + _this.workerFn.toString() + ")()"], { type: 'text/javascript' }));
            _this.worker = new Worker(workerURL);
            URL.revokeObjectURL(workerURL);
        };
        this.workerFn = function () {
            importScripts(self.location.origin + "/js/jimp.min.js");
            var db = null;
            var tx = null;
            var fileStore = null;
            var databaseWorkerChannel = null;
            function saveToDatabase(db, data) {
                var base64 = Buffer.from(data.buffer).toString('base64');
                var tx = db.transaction(data.filename, 'readwrite');
                var store = tx.objectStore(data.filename);
                store.add({ offset: data.startOffset, data: base64 }, data.startOffset);
            }
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        databaseWorkerChannel = data.channel;
                        var req = indexedDB.open(data.filename, 1);
                        req.onupgradeneeded = function (e) {
                            db = e.target.result;
                            db.createObjectStore(data.filename);
                        };
                        req.onsuccess = function (e) {
                            db = e.target.result;
                            if (e.target.readyState === 'done') {
                                data.channel.postMessage({
                                    cmd: 'DATABASE_READY',
                                    data: { message: 'Database and filestore ready.' }
                                });
                            }
                        };
                        req.onerror = function (e) {
                            data.channel.postMessage({
                                cmd: 'DATABASE_ERROR',
                                data: { message: 'Database error.' }
                            });
                        };
                        break;
                    case 'CHECK_PROGRESS':
                        fileStore = db
                            .transaction(data.filename, 'readonly')
                            .objectStore(data.filename);
                        fileStore.get('status').onsuccess = function (e) {
                            databaseWorkerChannel.postMessage({
                                cmd: 'CHECKED_PROGRESS',
                                data: e.target.result
                            });
                        };
                        break;
                    case 'SAVE_PROGRESS':
                        fileStore = db
                            .transaction(data[0].filename, 'readwrite')
                            .objectStore(data[0].filename);
                        fileStore.add(data, 'status');
                        break;
                    case 'REQUEST_FILE_PIECES':
                        fileStore = db
                            .transaction(data.filename, 'readonly')
                            .objectStore(data.filename);
                        fileStore.openCursor().onsuccess = function (e) {
                            var cursor = e.target.result;
                            if (cursor) {
                                if (cursor.key !== 'status') {
                                    databaseWorkerChannel.postMessage({
                                        cmd: 'REQUESTED_FILE_PIECE',
                                        data: cursor.value
                                    });
                                }
                                cursor["continue"]();
                            }
                            else {
                                databaseWorkerChannel.postMessage({
                                    cmd: 'REQUESTED_FILE_COMPLETE',
                                    data: data
                                });
                            }
                        };
                        break;
                    case 'SEGMENT_COMPLETE':
                        saveToDatabase(db, data);
                        databaseWorkerChannel.postMessage({
                            cmd: 'SAVED_TO_DATABASE',
                            data: data
                        }, [data.buffer]);
                        break;
                    case 'CLEAR_FILESTORE':
                        tx = db.transaction(data.filename, 'readwrite');
                        fileStore = tx.objectStore(data.filename);
                        fileStore.clear().onsuccess = function (e) { };
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
