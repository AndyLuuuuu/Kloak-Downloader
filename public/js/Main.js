import Downloader from './Downloader.js';
var videoWrapper = document.getElementById('videoWrapper');
var video = document.getElementById('video');
var ms = null;
var videoSourceBuffer = null;
var hiddendl = document.getElementById('hiddendl');
var files = document.querySelectorAll('.item');
var downloads = [];
var videoSegments = [];
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
        case 'VIDEO_SEGMENT':
            videoSegments.push(URL.createObjectURL(new Blob([data.buffer])));
            console.log(videoSegments);
            break;
        case 'COMPLETE_FILE':
            console.log(data);
            if (data.script) {
                hiddendl.href = data.script;
                hiddendl.download = data.filename + "-assembler";
                hiddendl.click();
            }
            hiddendl.href = data.url;
            hiddendl.download = data.filename + "-" + data.filepiece;
            hiddendl.click();
        default:
            break;
    }
};
function fetchAndAppend(url, cb) {
    console.log(url);
    fetch(url)
        .then(function (res) {
        return res.arrayBuffer();
    })
        .then(function (buff) {
        cb(buff);
    });
}
function setupMediasource() {
    ms = new MediaSource();
    video.src = URL.createObjectURL(ms);
    console.log(MediaSource.isTypeSupported('video/mp4; codecs="avc1.4D401F"'));
    ms.addEventListener('sourceopen', function () {
        videoSourceBuffer = ms.addSourceBuffer('video/mp4; codecs="avc1.4D401F"');
        var video;
        function fetchSegment() {
            video = videoSegments.shift();
            if (video) {
                fetchAndAppend(video, function (buff) {
                    videoSourceBuffer.appendBuffer(buff);
                });
            }
            else {
                setTimeout(function () {
                    fetchSegment();
                }, 2000);
            }
        }
        fetchSegment();
        // let video = videoSegments.shift()
        // if (video) {
        //   fetchAndAppend(video, videoSourceBuffer)
        // }
        // videoSourceBuffer.addEventListener('update', () => {
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
        // const isVideo = e.target.dataset.isvideo ? true : false
        // console.log(isVideo)
        // if (isVideo) {
        //   videoWrapper.classList.remove('hide')
        //   setupMediasource()
        //   downloads.push(
        //     new Downloader(e.target.dataset['filename'], isVideo, callback)
        //   )
        //   return
        // }
        downloads.push(new Downloader(e.target.dataset['filename'], false, callback));
    });
});
