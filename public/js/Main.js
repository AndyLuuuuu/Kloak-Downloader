import Downloader from './Downloader.js';
var hiddendl = document.getElementById('hiddendl');
var files = document.querySelectorAll('.item');
var downloads = [];
console.log(files);
var log = function (message) {
    console.log("<" + new Date().toLocaleString() + "> " + message);
};
var callback = function (e) {
    var cmd = e.cmd;
    var data = e.data;
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
        case 'COMPLETE_FILE':
            console.log(data);
            hiddendl.href = data.url;
            hiddendl.download = data.filename;
            hiddendl.click();
        default:
            break;
    }
};
files.forEach(function (file) {
    file.addEventListener('click', function (e) {
        console.log(e.target.dataset['filename']);
        downloads.push(new Downloader(e.target.dataset['filename'], callback));
    });
});
