var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import Downloader from './Downloader.js';
var videoWrapper = document.getElementById('videoWrapper');
var video = document.getElementById('video');
var ms = null;
var videoSourceBuffer = null;
var hiddendl = document.getElementById('hiddendl');
var files = document.querySelectorAll('.item');
var downloads = [];
var videoSegments = [];
var hasInit = false;
console.log(files);
var log = function (message) {
    console.log("<" + new Date().toLocaleString() + "> " + message);
};
var callback = function (e) { return __awaiter(void 0, void 0, void 0, function () {
    var cmd, data, blob;
    return __generator(this, function (_a) {
        cmd = e.cmd;
        data = e.data;
        switch (cmd) {
            case 'SYSTEM_READY':
                log('Downloader ready.');
                data.self.start();
                break;
            case 'FILE_INFORMATION':
                downloads[data.filename] = data;
                break;
            case 'SEGMENT_COMPLETE':
                break;
            case 'DOWNLOAD_FINISHED':
                console.log('DOWNLOAD FINISHED');
                downloads[data.filename]['finished'] = true;
                break;
            case 'VIDEO_SEGMENT':
                blob = new Blob([data.buffer]);
                new Response(blob).arrayBuffer().then(function (buff) {
                    videoSourceBuffer.appendBuffer(buff);
                });
                break;
            case 'COMPLETE_FILE':
                console.log(data);
                hiddendl.href = data.url;
                hiddendl.download = data.filename + "-" + data.filepiece;
                hiddendl.click();
                if (data.script) {
                    hiddendl.href = data.script;
                    hiddendl.download = data.filename + "-assembler";
                    hiddendl.click();
                }
            default:
                break;
        }
        return [2 /*return*/];
    });
}); };
function fetchAndAppend(blob, sb) {
    new Response(blob).arrayBuffer().then(function (buff) {
        sb.appendBuffer(buff);
    });
}
function setupMediasource() {
    ms = new MediaSource();
    video.src = URL.createObjectURL(ms);
    console.log(MediaSource.isTypeSupported('video/mp4; codecs="avc1.4D401F"'));
    ms.addEventListener('sourceopen', function () {
        videoSourceBuffer = ms.addSourceBuffer('video/mp4; codecs="avc1.4D401F"');
        var video = videoSegments.shift();
        fetchAndAppend(video, videoSourceBuffer);
        // videoSourceBuffer.addEventListener('updateend', () => {
        //   // console.log('wtf')
        //   // let video = videoSegments.shift()
        //   // console.log(videoSegments)
        //   // fetchAndAppend(video, videoSourceBuffer)
        // })
        // if (video) {
        //   fetchAndAppend(video, videoSourceBuffer)
        // }
        // videoSourceBuffer.addEventListener('updateend', () => {
        //   video = videoSegments.shift()
        //   if (video) {
        //     fetchAndAppend(video, videoSourceBuffer)
        //   }
        // })
    });
}
files.forEach(function (file) {
    file.addEventListener('click', function (e) {
        console.log(e.target.dataset);
        var isVideo = e.target.dataset.isvideo ? true : false;
        console.log(isVideo);
        if (isVideo) {
            videoWrapper.classList.remove('hide');
            setupMediasource();
            downloads.push(new Downloader(e.target.dataset['filename'], isVideo, callback));
            return;
        }
        downloads.push(new Downloader(e.target.dataset['filename'], false, callback));
    });
});
