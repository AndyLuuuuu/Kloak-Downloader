import ManagerWorker from './ManagerWorker.js';
import AssemblyWorker from './AssemblyWorker.js';
var Downloader = /** @class */ (function () {
    function Downloader(filename, callback) {
        var _this = this;
        this.DOWNLOAD_BASE_URL = "http://192.168.0.12:3000/requestfile?file=";
        this.filename = '';
        this.DEBUG = false;
        this.MAX_FILE_SIZE = 314572800;
        this.filePieces = [];
        this.currentFilePiece = null;
        this.assemblyWorker = null;
        this.downloadQueue = [];
        this.downloadState = 'stop';
        this.chunksize = 2097152;
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
                    console.log('lol');
                    _this.mainCallback({
                        cmd: 'SYSTEM_READY',
                        data: { msg: data, self: _this }
                    });
                    _this.fetchFileInformation("" + _this.DOWNLOAD_BASE_URL + _this.filename).then(function (file) {
                        _this.managerWorker.postMessage({
                            cmd: 'CHECK_PROGRESS',
                            data: file.filename
                        });
                    });
                    break;
                case 'CHECKED_PROGRESS':
                    if (data) {
                        _this.filePieces = data;
                        console.log(data);
                        console.log(_this.filePieces);
                    }
                    else {
                        _this.setupFilePieces(_this.file);
                        _this.managerWorker.postMessage({
                            cmd: 'SAVE_PROGRESS',
                            data: _this.filePieces
                        });
                    }
                    _this.currentFilePiece = _this.filePieces.shift();
                    break;
                case 'SEGMENT_COMPLETE':
                    _this.currentFilePiece.downloadCount++;
                    _this.checkDownloadStatus();
                    break;
                case 'COMPLETE_FILE':
                    console.log('COMPLETE FILE');
                    _this.mainCallback({
                        cmd: 'COMPLETE_FILE',
                        data: {
                            url: data.url,
                            filename: _this.currentFilePiece.filename + "-" + _this.currentFilePiece.filepiece
                        }
                    });
                    if (_this.filePieces.length > 0) {
                        _this.managerWorker.postMessage({
                            cmd: 'SAVE_PROGRESS',
                            data: _this.filePieces
                        });
                        _this.currentFilePiece = _this.filePieces.shift();
                    }
                    else {
                        _this.downloadState = 'stop';
                    }
                default:
                    break;
            }
        };
        this.setupFilePieces = function (file) {
            var filesize = file.size;
            while (filesize >= _this.MAX_FILE_SIZE) {
                _this.filePieces.push({
                    filepiece: _this.filePieces.length,
                    filename: file.filename,
                    extension: file.extension,
                    size: _this.MAX_FILE_SIZE,
                    parts: Math.ceil(_this.MAX_FILE_SIZE / _this.chunksize),
                    chunksize: _this.chunksize,
                    downloadCount: 0,
                    startOffset: 0,
                    downloadOffset: _this.filePieces.length > 0
                        ? _this.filePieces.length * _this.MAX_FILE_SIZE
                        : 0,
                    mimetype: _this.file.mimetype
                });
                filesize -= _this.MAX_FILE_SIZE;
            }
            if (filesize < _this.MAX_FILE_SIZE) {
                _this.filePieces.push({
                    filepiece: _this.filePieces.length,
                    filename: file.filename,
                    extension: file.extension,
                    size: filesize,
                    parts: Math.ceil(filesize / _this.chunksize),
                    chunksize: _this.chunksize,
                    downloadCount: 0,
                    startOffset: 0,
                    downloadOffset: _this.filePieces.length > 0
                        ? _this.filePieces.length * _this.MAX_FILE_SIZE
                        : 0,
                    mimetype: _this.file.mimetype
                });
            }
        };
        this.fetchFileInformation = function (url) {
            return fetch(url)
                .then(function (res) {
                return res.json();
            })
                .then(function (file) {
                _this.file = file;
                return file;
            });
        };
        this.pushQueue = function () {
            return setInterval(function () {
                console.log(_this.downloadState);
                if (_this.downloadState === 'start') {
                    if (_this.downloadQueue.length < 20) {
                        if (_this.currentFilePiece.downloadCount < _this.currentFilePiece.parts) {
                            _this.downloadQueue.push({
                                filename: _this.currentFilePiece.filename,
                                extension: _this.currentFilePiece.extension,
                                startOffset: _this.currentFilePiece.startOffset,
                                downloadOffset: _this.currentFilePiece.downloadOffset,
                                chunksize: _this.chunksize
                            });
                            _this.log(_this.downloadQueue);
                            _this.currentFilePiece.downloadOffset =
                                _this.currentFilePiece.downloadOffset +
                                    _this.currentFilePiece.chunksize;
                            _this.currentFilePiece.startOffset =
                                _this.currentFilePiece.startOffset +
                                    _this.currentFilePiece.chunksize;
                        }
                    }
                }
            }, 1000);
        };
        this.consumeQueue = function () {
            return setInterval(function () {
                if (_this.downloadState === 'start') {
                    if (_this.downloadQueue.length > 0) {
                        var file = _this.shuffle(_this.downloadQueue).shift();
                        var message = {
                            cmd: 'REQUEST DOWNLOAD',
                            data: file
                        };
                        _this.managerWorker.postMessage(message);
                    }
                }
            }, 1000);
        };
        this.checkDownloadStatus = function () {
            if (_this.currentFilePiece.downloadCount >= _this.currentFilePiece.parts) {
                if (_this.assemblyWorker === null) {
                    _this.assemblyWorker = new AssemblyWorker().getWorker();
                    _this.assemblyWorker.onmessage = _this.messageChannel;
                    _this.assemblyWorker.postMessage({
                        cmd: 'START',
                        data: _this.currentFilePiece
                    });
                }
                else {
                    _this.assemblyWorker.postMessage({
                        cmd: 'NEXT',
                        data: _this.currentFilePiece
                    });
                }
            }
        };
        this.start = function () {
            _this.downloadState = 'start';
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
        if (!window.indexedDB) {
            alert("Your browser doesn't support a stable version of IndexedDB.\nWe recommend you use the Chrome browser.");
        }
        this.managerWorker = new ManagerWorker().getWorker();
        this.managerWorker.onmessage = this.messageChannel;
        this.managerWorker.postMessage({ cmd: 'START', data: filename });
        this.mainCallback = callback;
        this.filename = filename;
        this.queueInterval = this.pushQueue();
        this.queueConsumeInterval = this.consumeQueue();
    }
    Downloader.JS_FOLDER_URL = "http://192.168.0.12:3000/js/";
    return Downloader;
}());
export default Downloader;
