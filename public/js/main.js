var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import Downloader from './Downloader.js';
var button = document.getElementById('dl');
var progressSegment = document.getElementById('progressSegment');
var progressMessage = document.getElementById('progressMessage');
var log = function (message) {
    console.log("<" + new Date().toLocaleString() + "> " + message);
};
var updateProgress = function (data) {
    var percent = Math.round((downloads[data.filename].downloadCount / downloads[data.filename].parts) *
        100) + "%";
    downloads[data.filename].downloadCount++;
    progressSegment.style.width = percent;
    progressMessage.textContent = percent;
};
var downloads = {};
var callback = function (e) {
    var cmd = e.cmd;
    var data = e.data;
    switch (cmd) {
        case 'SYSTEM_READY':
            log('Downloader ready.');
            break;
        case 'FILE_INFORMATION':
            downloads[data.filename] = __assign(__assign({}, data), { downloadCount: 0 });
            console.log(downloads);
            break;
        case 'SEGMENT_COMPLETE':
            updateProgress(data);
            break;
        default:
            break;
    }
};
var download = new Downloader("http://localhost:3000/requestfile?file=d82488b4-f1fc-4497-b5ac-c081a8955d75", callback);
button.addEventListener('click', function () {
    download.start();
});
