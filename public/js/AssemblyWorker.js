var AssemblyWorker = /** @class */ (function () {
    function AssemblyWorker() {
        var _this = this;
        this.init = function () {
            var workerURL = URL.createObjectURL(new Blob(["(" + _this.workerFn.toString() + ")()"], { type: 'text/javascript' }));
            _this.worker = new Worker(workerURL);
            URL.revokeObjectURL(workerURL);
        };
        this.workerFn = function () {
            importScripts(self.location.origin + "/js/DatabaseWorker.js");
            importScripts(self.location.origin + "/js/jimp.min.js");
            var databaseWorker = {
                worker: null,
                channel: null
            };
            var assemblyWorkerChannel = null;
            var fileInformation = null;
            var assembledFile = null;
            var log = function (message) {
                console.log("<" + new Date().toLocaleString() + "> " + message);
            };
            var messageChannel = function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'DATABASE_READY':
                        log(data.message);
                        break;
                    case 'REQUESTED_FILE_PIECE':
                        assembledFile.set(Buffer.from(data.data, 'base64'), data.offset);
                        break;
                    case 'REQUESTED_FILE_COMPLETE':
                        var file = new Blob([assembledFile.buffer], {
                            type: 'application/octet-stream'
                        });
                        var fileURL = URL.createObjectURL(file);
                        assemblyWorkerChannel.postMessage({
                            cmd: 'COMPLETE_FILE',
                            data: { url: fileURL }
                        });
                        databaseWorker.worker.postMessage({
                            cmd: 'CLEAR_FILESTORE',
                            data: fileInformation
                        });
                        assembledFile = null;
                        break;
                    default:
                        break;
                }
            };
            var setupDatabaseWorker = function (filename) {
                databaseWorker = {
                    worker: new DatabaseWorker().getWorker(),
                    channel: new MessageChannel()
                };
                databaseWorker.channel.port1.onmessage = messageChannel;
                databaseWorker.worker.postMessage({
                    cmd: 'START',
                    data: {
                        filename: filename,
                        channel: databaseWorker.channel.port2
                    }
                }, [databaseWorker.channel.port2]);
            };
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        setupDatabaseWorker(data.filename);
                        assemblyWorkerChannel = data.channel;
                        break;
                    case 'ASSEMBLE_FILE':
                        fileInformation = data;
                        assembledFile = new Uint8Array(fileInformation.size);
                        databaseWorker.worker.postMessage({
                            cmd: 'REQUEST_FILE_PIECES',
                            data: fileInformation
                        });
                    default:
                        break;
                }
            });
        };
        this.log("AssemblyWorker created.");
        this.init();
    }
    AssemblyWorker.prototype.log = function (message) {
        console.log("<" + new Date().toLocaleString() + "> " + message);
    };
    AssemblyWorker.prototype.getWorker = function () {
        return this.worker;
    };
    return AssemblyWorker;
}());
