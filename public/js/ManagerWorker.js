// import DownloadWorker from './DownloadWorker.js';
var ManagerWorker = /** @class */ (function () {
    function ManagerWorker() {
        var _this = this;
        this.init = function () {
            var workerURL = URL.createObjectURL(new Blob(["(" + _this.workerFn.toString() + ")()"], { type: 'text/javascript' }));
            _this.worker = new Worker(workerURL);
            URL.revokeObjectURL(workerURL);
        };
        this.workerFn = function () {
            importScripts(self.location.origin + "/js/DownloadWorker.js");
            importScripts(self.location.origin + "/js/DatabaseWorker.js");
            var downloadWorkers = [];
            var log = function (message) {
                console.log("<" + new Date().toLocaleString() + "> " + message);
            };
            var databaseWorker = {
                worker: new DatabaseWorker().getWorker(),
                channel: new MessageChannel()
            };
            var messageChannel = function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'CHECKED_PROGRESS':
                        self.postMessage({ cmd: 'CHECKED_PROGRESS', data: data });
                        break;
                    case 'SAVE_TO_DATABASE':
                        databaseWorker.worker.postMessage({
                            cmd: cmd,
                            data: data
                        });
                        downloadWorkers[data.downloadWorkerID].state = 'IDLE';
                        break;
                    case 'SAVED_TO_DATABASE':
                        self.postMessage({
                            cmd: 'SEGMENT_COMPLETE',
                            data: { filename: data.filename, offset: data.offset }
                        });
                        log(data.message);
                        break;
                    case 'DATABASE_READY':
                        self.postMessage({
                            cmd: 'SYSTEM_READY',
                            data: {}
                        });
                        log(data.message);
                        break;
                    case 'DATABASE_ERROR':
                        self.postMessage({
                            cmd: 'SYSTEM_ERROR',
                            data: {}
                        });
                        log(data.message);
                        break;
                    default:
                        break;
                }
            };
            databaseWorker.channel.port1.onmessage = messageChannel;
            function sleep(ms) {
                return new Promise(function (resolve) { return setTimeout(resolve, ms); });
            }
            var createNewWorker = function () {
                var downloadWorker = {
                    worker: new DownloadWorker().getWorker(),
                    channel: new MessageChannel(),
                    state: 'IDLE'
                };
                downloadWorker.channel.port1.onmessage = messageChannel;
                downloadWorker.worker.postMessage({
                    cmd: 'START',
                    data: {
                        id: downloadWorkers.length,
                        channel: downloadWorker.channel.port2
                    }
                }, [downloadWorker.channel.port2]);
                downloadWorkers.push(downloadWorker);
                return downloadWorker;
            };
            var downloadFile = function (file) {
                if (downloadWorkers.length < 5) {
                    var downloadWorker = createNewWorker();
                    downloadWorker.worker.postMessage({
                        cmd: 'DOWNLOAD',
                        data: {
                            filename: file.filename,
                            extension: file.extension,
                            startOffset: file.startOffset,
                            downloadOffset: file.downloadOffset,
                            chunksize: file.chunksize
                        }
                    });
                    downloadWorker.state = 'DOWNLOADING';
                }
                else {
                    var requested = false;
                    for (var i = 0; i < downloadWorkers.length; i++) {
                        if (downloadWorkers[i].state === 'IDLE') {
                            downloadWorkers[i].worker.postMessage({
                                cmd: 'DOWNLOAD',
                                data: {
                                    filename: file.filename,
                                    extension: file.extension,
                                    startOffset: file.startOffset,
                                    downloadOffset: file.downloadOffset,
                                    chunksize: file.chunksize
                                }
                            });
                            requested = true;
                            return;
                        }
                    }
                    if (!requested) {
                        sleep(2000).then(function () {
                            downloadFile(file);
                        });
                    }
                }
            };
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        databaseWorker.worker.postMessage({
                            cmd: 'START',
                            data: {
                                channel: databaseWorker.channel.port2,
                                filename: data
                            }
                        }, [databaseWorker.channel.port2]);
                        break;
                    case 'CHECK_PROGRESS':
                        databaseWorker.worker.postMessage({
                            cmd: 'CHECK_PROGRESS',
                            data: { filename: data }
                        });
                        break;
                    case 'SAVE_PROGRESS':
                        databaseWorker.worker.postMessage({
                            cmd: 'SAVE_PROGRESS',
                            data: data
                        });
                        break;
                    case 'REQUEST DOWNLOAD':
                        downloadFile(data);
                        break;
                    default:
                        break;
                }
            });
        };
        this.log('ManagerWorker created.');
        this.init();
    }
    ManagerWorker.prototype.log = function (message) {
        console.log("<" + new Date().toLocaleString() + "> " + message);
    };
    ManagerWorker.prototype.getWorker = function () {
        return this.worker;
    };
    return ManagerWorker;
}());
export default ManagerWorker;
