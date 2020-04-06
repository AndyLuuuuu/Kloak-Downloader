import ManagerWorker from './ManagerWorker.js';
import AssemblyWorker from './AssemblyWorker.js';
var Downloader = /** @class */ (function () {
    function Downloader(url, callback) {
        var _this = this;
        this.DEBUG = false;
        this.MAX_FILE_SIZE = 314572800;
        this.FIVE_MB = 52428800;
        this.filePieces = [];
        this.currentFilePiece = null;
        this.assemblyWorker = null;
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
                    break;
                // case 'CHECKED_FILE_PROGRESS':
                //   this.fileInformation.downloadCount = data.downloadCount
                //   this.mainCallback({
                //     cmd: 'FILE_INFORMATION',
                //     data: this.fileInformation
                //   })
                //   break
                case 'SEGMENT_COMPLETE':
                    _this.currentFilePiece.downloadCount++;
                    _this.checkDownloadStatus();
                    break;
                // case 'ASSEMBLER_READY':
                // // this.assemblyWorker.postMessage({
                // //   cmd: 'REQUEST_FILE',
                // //   data: data
                // // })
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
                    mimetype: _this.fileInformation.mimetype
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
                    mimetype: _this.fileInformation.mimetype
                });
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
                    mimetype: file.mimetype
                };
                _this.setupFilePieces(file);
                //console.log(file.size);
            });
        };
        this.pushQueue = function () {
            return setInterval(function () {
                console.log(_this.downloadState);
                if (_this.downloadState === 'start') {
                    if (_this.downloadQueue.length < 20) {
                        //console.log(this.fileInformation.startOffset);
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
            }, 500);
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
            }, 500);
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
        //   postMessage = e => {
        //     const cmd = e.cmd
        //     const data: fileInformation = e.data
        //     switch (cmd) {
        //       case 'REQUEST_FILE':
        //         this.assemblyWorker = new AssemblyWorker().getWorker()
        //         this.assemblyWorker.onmessage = this.messageChannel
        //         this.assemblyWorker.postMessage({
        //           cmd: 'START',
        //           data
        //         })
        //         break
        //       default:
        //         break
        //     }
        //   }
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
        this.fetchFileInformation(url).then(function () {
            console.log(_this.filePieces);
            // this.log(this.fileInformation)
            _this.managerWorker = new ManagerWorker().getWorker();
            _this.currentFilePiece = _this.filePieces.shift();
            _this.managerWorker.postMessage({
                cmd: 'START',
                data: _this.currentFilePiece
            });
            _this.managerWorker.onmessage = _this.messageChannel;
        });
        this.mainCallback = callback;
    }
    Downloader.JS_FOLDER_URL = "http://localhost:3000/js/";
    return Downloader;
}());
export default Downloader;
