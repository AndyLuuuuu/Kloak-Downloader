import ManagerWorker from './ManagerWorker.js';
import AssemblyWorker from './AssemblyWorker.js';
var Downloader = /** @class */ (function () {
    function Downloader(url, callback) {
        var _this = this;
        this.DEBUG = false;
        this.downloadQueue = [];
        this.downloadState = 'stop';
        this.systemState = 'waiting';
        this.chunksize = 1048576;
        this.log = function (message) {
            if (_this.DEBUG) {
                console.log(message);
            }
        };
        this.messageChannel = function (e) {
            var cmd = e.data.cmd;
            var data = e.data.data;
            switch (cmd) {
                case 'SYSTEM_READY':
                    _this.mainCallback(e.data);
                    _this.systemState = 'ready';
                    _this.queueInterval = _this.pushQueue();
                    _this.queueConsumeInterval = _this.consumeQueue();
                    _this.checkDownloadInterval = _this.checkDownloadStatus();
                    _this.managerWorker.postMessage({
                        cmd: 'CHECK_FILE_PROGRESS',
                        data: _this.fileInformation
                    });
                    break;
                case 'CHECKED_FILE_PROGRESS':
                    _this.fileInformation.downloadCount = data.downloadCount;
                    _this.mainCallback({
                        cmd: 'FILE_INFORMATION',
                        data: _this.fileInformation
                    });
                    break;
                case 'SEGMENT_COMPLETE':
                    _this.mainCallback(e.data);
                    break;
                case 'ASSEMBLER_READY':
                    _this.assemblyWorker.postMessage({
                        cmd: 'REQUEST_FILE',
                        data: data
                    });
                case 'COMPLETE_FILE':
                    _this.mainCallback({ cmd: 'COMPLETE_FILE', data: data });
                default:
                    break;
            }
        };
        this.fetchFileInformation = function (url) {
            return fetch(url)
                .then(function (res) {
                return res.json();
            })
                .then(function (file) {
                _this.fileInformation = {
                    filename: file.filename,
                    extension: file.extension,
                    totalsize: file.size,
                    parts: Math.ceil(file.size / _this.chunksize),
                    chunksize: _this.chunksize,
                    downloadCount: 0,
                    startOffset: 0,
                    mimetype: file.mimetype
                };
                //console.log(file.size);
            });
        };
        this.requestDownload = function (file) {
            var message = {
                cmd: 'REQUEST DOWNLOAD',
                data: file
            };
            _this.managerWorker.postMessage(message);
        };
        this.pushQueue = function () {
            return setInterval(function () {
                if (_this.downloadState === 'start') {
                    if (_this.downloadQueue.length < 20) {
                        _this.log('Adding to queue!');
                        //console.log(this.fileInformation.startOffset);
                        if (_this.fileInformation.startOffset <= _this.fileInformation.totalsize) {
                            _this.downloadQueue.push({
                                filename: _this.fileInformation.filename,
                                extension: _this.fileInformation.extension,
                                offset: _this.fileInformation.startOffset,
                                chunksize: _this.chunksize
                            });
                            _this.log(_this.downloadQueue);
                            _this.fileInformation.startOffset =
                                _this.fileInformation.startOffset + _this.fileInformation.chunksize;
                        }
                    }
                }
            }, 200);
        };
        this.shuffle = function (array) {
            var counter = array.length;
            // While there are elements in the array
            while (counter > 0) {
                // Pick a random index
                var index = Math.floor(Math.random() * counter);
                // Decrease counter by 1
                counter--;
                // And swap the last element with it
                var temp = array[counter];
                array[counter] = array[index];
                array[index] = temp;
            }
            return array;
        };
        this.consumeQueue = function () {
            return setInterval(function () {
                if (_this.downloadState === 'start') {
                    _this.log('Consuming a queue!');
                    _this.log(_this.downloadQueue);
                    if (_this.downloadQueue.length > 0) {
                        var file = _this.shuffle(_this.downloadQueue).shift();
                        _this.log(file);
                        _this.requestDownload(file);
                    }
                }
            }, 200);
        };
        this.checkDownloadStatus = function () {
            return setInterval(function () {
                //console.log(this.fileInformation.downloadCount);
                if (_this.fileInformation.downloadCount >= _this.fileInformation.parts) {
                    _this.mainCallback({
                        cmd: 'DOWNLOAD_FINISHED',
                        data: _this.fileInformation
                    });
                }
            }, 1000);
        };
        this.postMessage = function (e) {
            var cmd = e.cmd;
            var data = e.data;
            switch (cmd) {
                case 'REQUEST_FILE':
                    _this.assemblyWorker = new AssemblyWorker().getWorker();
                    _this.assemblyWorker.onmessage = _this.messageChannel;
                    _this.assemblyWorker.postMessage({
                        cmd: 'START',
                        data: data
                    });
                    break;
                default:
                    break;
            }
        };
        this.start = function () {
            _this.downloadState = 'start';
        };
        if (!window.indexedDB) {
            alert("Your browser doesn't support a stable version of IndexedDB.\nWe recommend you use the Chrome browser.");
        }
        this.fetchFileInformation(url).then(function () {
            _this.log(_this.fileInformation);
            _this.managerWorker = new ManagerWorker().getWorker();
            _this.managerWorker.postMessage({
                cmd: 'START',
                data: _this.fileInformation
            });
            _this.managerWorker.onmessage = _this.messageChannel;
        });
        this.mainCallback = callback;
    }
    Downloader.JS_FOLDER_URL = "http://localhost:3000/js/";
    return Downloader;
}());
export default Downloader;
