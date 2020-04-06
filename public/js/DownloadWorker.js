var DownloadWorker = /** @class */ (function () {
    function DownloadWorker() {
        var _this = this;
        this.DEBUG = false;
        this.init = function () {
            var workerURL = URL.createObjectURL(new Blob(["(" + _this.workerFn.toString() + ")()"], { type: 'text/javascript' }));
            _this.worker = new Worker(workerURL);
            URL.revokeObjectURL(workerURL);
        };
        this.workerFn = function () {
            var BASE_URL = self.location.origin + "/download?";
            var downloadWorkerInfo = null;
            importScripts(self.location.origin + "/js/jimp.min.js");
            var query = function (data) {
                return Object.keys(data)
                    .map(function (key) { return (key = key + "=" + data[key]); })
                    .join('&');
            };
            self.addEventListener('message', function (e) {
                var cmd = e.data.cmd;
                var data = e.data.data;
                switch (cmd) {
                    case 'START':
                        console.log(data);
                        downloadWorkerInfo = data;
                        break;
                    case 'DOWNLOAD':
                        fetch("" + BASE_URL + query(data))
                            .then(function (res) {
                            return res.arrayBuffer();
                        })
                            .then(function (buffer) {
                            console.log(data);
                            downloadWorkerInfo.channel.postMessage({
                                cmd: 'SAVE_TO_DATABASE',
                                data: {
                                    downloadWorkerID: downloadWorkerInfo.id,
                                    filename: data.filename,
                                    extension: data.extension,
                                    startOffset: data.startOffset,
                                    downloadOffset: data.downloadOffset,
                                    base64: Buffer.from(new Uint8Array(buffer)).toString('base64')
                                }
                            });
                        });
                        break;
                    default:
                        break;
                }
            });
        };
        this.log("DownloadWorker created.");
        this.init();
    }
    DownloadWorker.prototype.log = function (message) {
        console.log("<" + new Date().toLocaleString() + "> " + message);
    };
    DownloadWorker.prototype.getWorker = function () {
        return this.worker;
    };
    return DownloadWorker;
}());
