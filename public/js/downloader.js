var Downloader = /** @class */ (function () {
    function Downloader(maxWorkers, chunksize, baseurl, uuid) {
        var _this = this;
        this.init = function () {
            _this.databaseManager = new Worker('./databaseWorker.js');
            _this.workerManager = new Worker('./workerManager.js');
            _this.workerManager.addEventListener('message', _this.messageHandler);
            _this.workerManager.postMessage({
                cmd: 'initialize',
                data: {
                    maxDownloadWorkers: _this.MAX_DL_WORKERS,
                    chunkSize: _this.CHUNKSIZE,
                    baseURL: _this.BASE_URL,
                    uuid: _this.UUID
                }
            });
        };
        this.messageHandler = function (e) {
            console.log(e);
        };
        this.MAX_DL_WORKERS = maxWorkers;
        this.CHUNKSIZE = chunksize;
        this.BASE_URL = baseurl;
        this.UUID = uuid;
    }
    return Downloader;
}());
