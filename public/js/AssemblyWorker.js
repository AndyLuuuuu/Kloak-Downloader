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
            var fileInformation = null;
            var assembledFile = null;
            var messageChannel = function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'DATABASE_READY':
                        console.log(fileInformation);
                        assembledFile = new Uint8Array(fileInformation.size);
                        databaseWorker.worker.postMessage({
                            cmd: 'REQUEST_FILE_PIECES',
                            data: fileInformation
                        });
                        break;
                    case 'REQUESTED_FILE_PIECE':
                        assembledFile.set(Buffer.from(data.data, 'base64'), data.offset);
                        console.log(assembledFile);
                        console.log(data);
                        break;
                    case 'REQUESTED_FILE_COMPLETE':
                        var file = new Blob([assembledFile.buffer], {
                            type: data.mimetype
                        });
                        console.log(data);
                        var fileURL = URL.createObjectURL(file);
                        self.postMessage({ cmd: 'COMPLETE_FILE', data: { url: fileURL } });
                        databaseWorker.worker.postMessage({ cmd: "CLEAR_FILESTORE", data: fileInformation });
                        // databaseWorker.worker.terminate()
                        // self.close()
                        console.log(file);
                        break;
                    default:
                        break;
                }
            };
            var databaseWorker = {
                worker: new DatabaseWorker().getWorker(),
                channel: new MessageChannel()
            };
            databaseWorker.channel.port1.onmessage = messageChannel;
            databaseWorker.worker.postMessage({
                cmd: 'START',
                data: {
                    channel: databaseWorker.channel.port2
                }
            }, [databaseWorker.channel.port2]);
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        fileInformation = data;
                        console.log(data);
                        break;
                    case 'NEXT':
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
export default AssemblyWorker;
