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
var mainScript = {
    isPlaying: ko.observable(false),
    video_volume: ko.observable(100),
    change_volume: function (self, e) {
        self.video_volume(e.target.value);
        video_player.volume = self.video_volume() / 100;
    }
};
// BASE MPD AND BASE URL FOR FILES
var BASE_URL = 'http://localhost:3000/file?path=';
var MPD_PATH = 'testvideo.mpd';
var userStarted = false;
var finished = false;
var blob = null;
// VIDEO PLAYER ELEMENTS
var video_player = document.querySelector('video');
var playpause_btn = document.getElementById('playpause_btn');
var video_seeker = document.getElementById('video_seeker');
var video_duration = document.getElementById('video_duration');
mainScript.video_volume(video_player.volume * 100);
// const fullscreen_btn = document.getElementById('fullscreen_btn')
var loader = document.querySelector('div#loader');
var mediaSource = new MediaSource();
// Attach media source to video element
video_player.src = URL.createObjectURL(mediaSource);
// Check that browser has support for media codec
var MIME_CODECS = {
    video: 'video/mp4; codecs="avc1.4D401F"',
    audio: 'audio/mp4; codecs="mp4a.40.2"'
};
console.log(MediaSource.isTypeSupported(MIME_CODECS.video));
console.log(MediaSource.isTypeSupported(MIME_CODECS.audio));
// Video/Audio buffer links
var allVideoData = new Map();
var allAudioData = new Map();
var videos = null;
var audios = null;
var videoInit = '';
var audioInit = '';
var minBufferTime = null;
var videoDuration = null;
var hasQueue = true;
// const sleep = milliseconds => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds))
// }
function base64ToBuffer(base64) {
    var uint8 = Buffer.from(base64, 'base64');
    return uint8.buffer;
}
function testAppend() {
    var blobs = [];
    var b = true;
    allVideoData.forEach(function (seg) {
        if (seg.blob) {
            blobs.push(seg.blob);
        }
        else {
            b = false;
            return;
        }
    });
    if (b) {
        var blob_1 = new Blob(blobs, { type: 'video/mp4' });
        var file = new File(blobs, 'test.mp4', { type: 'video/mp4' });
        console.log(file);
        document.getElementById('dl').href = URL.createObjectURL(file);
    }
}
function timeConverter(seconds) {
    var h = Math.floor(seconds / 3600);
    // console.log('h', h)
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hDisplay = h < 9 ? "0" + h : h;
    var mDisplay = m < 9 ? (h > 0 ? "0" + m : "" + m) : m;
    var sDisplay = s < 10 ? "0" + s : s;
    return hDisplay > 0
        ? hDisplay + ":" + mDisplay + ":" + sDisplay
        : mDisplay + ":" + sDisplay;
}
function getMPD(filename) {
    return fetch("" + BASE_URL + filename)
        .then(function (res) {
        return res.text();
    })
        .then(function (text) {
        var buffer = new Uint8Array(base64ToBuffer(text));
        var file = new File([buffer], 'mpd', { type: 'application/dash+xml' });
        return file;
    })
        .then(function (file) {
        return URL.createObjectURL(file);
    });
}
// PARSE MPD AND ASSIGN TO "STREAMS"
if (!sr.mpdParser) {
    console.error('missing sr.mpdParser');
}
else {
    getMPD(MPD_PATH).then(function (mpd) {
        sr.mpdParser(mpd)
            .then(function (mpd) {
            console.log(mpd);
            var streams = mpd.manifestInfo.periodInfos[0].streamSetInfos;
            minBufferTime = mpd.manifestInfo.minBufferTime;
            // console.log(mpd)
            // console.log(minBufferTime)
            return streams;
        })
            .then(function (streams) {
            videoInit = streams[0].streamInfos[0].segmentInitializationInfo;
            audioInit = streams[1].streamInfos[0].segmentInitializationInfo;
            videos = streams[0].streamInfos[0].segmentIndex.references_;
            audios = streams[1].streamInfos[0].segmentIndex.references_;
            allVideoData.set('videoInit', __assign(__assign({}, videoInit), { id: 'videoInit', blob: null, isLoaded: false }));
            allAudioData.set('audioInit', __assign(__assign({}, audioInit), { id: 'audioInit', blob: null, isLoaded: false }));
            videos.map(function (video) {
                allVideoData.set(video.id, __assign(__assign({}, video), { isLoaded: false, blob: null }));
            });
            audios.map(function (audio) {
                allAudioData.set(audio.id, __assign(__assign({}, audio), { isLoaded: false, blob: null }));
            });
        });
    });
}
// Wait for media source to be open
mediaSource.addEventListener('sourceopen', function () {
    // ADD SOURCE BUFFER USING MIME CODECS INTO MEDIASOURCE
    var videoSourceBuffer = mediaSource.addSourceBuffer(MIME_CODECS.video);
    var audioSourceBuffer = mediaSource.addSourceBuffer(MIME_CODECS.audio);
    var videoIterator = allVideoData.values();
    var audioIterator = allAudioData.values();
    // fullscreen_btn.addEventListener('click', () => {
    //   video_player.requestFullscreen()
    // })
    video_player.onwaiting = function () {
        loader.classList.remove('invisibleHide');
    };
    video_player.onplaying = function () {
        loader.classList.add('invisibleHide');
        switch_icon();
    };
    // STARTING QUEUES FOR VIDEOS TO LOAD
    var videoQueue = [];
    var audioQueue = [];
    var video = videoIterator.next().value;
    var audio = audioIterator.next().value;
    while (video !== undefined) {
        if (audio !== undefined) {
            videoQueue.push(video);
            audioQueue.push(audio);
            video = videoIterator.next().value;
            audio = audioIterator.next().value;
        }
        else {
            return;
        }
    }
    function createNewQueue(queue, dataMap) {
        dataMap.forEach(function (segment) {
            if (!segment.isLoaded) {
                queue.push(segment);
            }
        });
    }
    // INTERVAL TO AUTOMATICALLY APPEND TO QUEUE AS LONG AS
    // VIDEO IS OPEN BY THE CLIENT.
    var queueInterval = createQueueInterval();
    // FUNCTION TO BE USED FOR SEEKING ON THE VIDEO SCROLL SEEKER.
    function seekTime(seconds) {
        video_player.pause();
        clearInterval(queueInterval);
        var newVideoQueue = [];
        var newAudioQueue = [];
        createNewQueue(newVideoQueue, allVideoData);
        createNewQueue(newAudioQueue, allAudioData);
        var seekVideoQueue = newVideoQueue.filter(function (video) { return video.startTime >= seconds - 12; });
        var seekAudioQueue = newAudioQueue.filter(function (audio) { return audio.startTime >= seconds - 12; });
        videoQueue = seekVideoQueue;
        audioQueue = seekAudioQueue;
        hasQueue = true;
        video_player.currentTime = seconds;
        queueInterval = createQueueInterval();
        mainScript.isPlaying(true);
        video_player.play();
    }
    function createQueueInterval() {
        return setInterval(function () {
            if (!videoDuration) {
                videoDuration = mediaSource.duration;
                video_seeker.max = videoDuration;
            }
            if (videoQueue.length) {
                appendToQueue(videoSourceBuffer, audioSourceBuffer);
            }
            else {
                hasQueue = false;
                clearInterval(queueInterval);
            }
        }, (minBufferTime - minBufferTime / 2) * 500);
    }
    function appendToQueue(videoBuffer, audioBuffer) {
        if (!userStarted) {
            return;
        }
        var currVideo = videoQueue.shift();
        var currAudio = audioQueue.shift();
        if (currVideo === undefined) {
            return;
        }
        else {
            if (currVideo) {
                if (currAudio) {
                    fetchSegmentAndAppend(currVideo, videoBuffer, function (err) {
                        if (err) {
                            console.error(err);
                        }
                    });
                    fetchSegmentAndAppend(currAudio, audioBuffer, function (err) {
                        if (err) {
                            console.error(err);
                        }
                    });
                }
            }
            // }
            return;
        }
    }
    var updateVideoSeeker = setInterval(function () {
        var currentTimestamp = video_player.currentTime;
        // console.log(currentTimestamp, videoDuration)
        // console.log(video_player.ended)
        if (currentTimestamp === videoDuration) {
            loader.classList.add('invisibleHide');
            mainScript.isPlaying(false);
            finished = true;
            switch_icon();
        }
        if (!video_player.paused) {
            video_seeker.value = currentTimestamp;
        }
        else {
            return;
        }
        // console.log(timeConverter(currentTimestamp))
        video_duration.textContent =
            timeConverter(currentTimestamp) +
                ("/" + (videoDuration ? timeConverter(videoDuration) : "0:00"));
    }, 1000);
    var onQueueEmpty = setInterval(function () {
        if (!hasQueue) {
            // console.log('empty queue')
            var newVideoQueue = [];
            var newAudioQueue = [];
            createNewQueue(newVideoQueue, allVideoData);
            createNewQueue(newAudioQueue, allAudioData);
            if (newVideoQueue.length) {
                videoQueue = newVideoQueue;
                audioQueue = newAudioQueue;
                hasQueue = true;
                queueInterval = createQueueInterval();
            }
            else {
                clearInterval(onQueueEmpty);
            }
        }
    }, 500);
    video_seeker.addEventListener('change', function (e) {
        mainScript.isPlaying(false);
        seekTime(e.target.value);
    });
    playpause_btn.addEventListener('click', function () {
        mainScript.isPlaying() ? video_player.pause() : video_player.play();
        userStarted = true;
        mainScript.isPlaying(!mainScript.isPlaying());
        switch_icon();
    });
    function switch_icon() {
        if (!mainScript.isPlaying) {
            playpause_btn.innerHTML = "<i class=\"play inverted icon large\" style=\"margin: 0 0 1.5px 0\"></i>";
        }
        else {
            playpause_btn.innerHTML = "<i class=\"pause inverted icon large\" style=\"margin: 0 0 1.5px 0\"></i>";
        }
    }
});
function fetchSegmentAndAppend(segment, sourceBuffer, callback) {
    var path = segment.url.path_;
    // if (segment.isLoaded) {
    //   return
    // }
    fetchArrayBuffer(path, function (buf) {
        sourceBuffer.addEventListener('updateend', function (ev) {
            callback();
        });
        sourceBuffer.addEventListener('error', function (ev) {
            callback(ev);
        });
        allVideoData.get(segment.id)
            ? (allVideoData.get(segment.id).blob = new Blob([new Uint8Array(buf)]))
            : null;
        sourceBuffer.appendBuffer(buf);
        allVideoData.get(segment.id)
            ? (allVideoData.get(segment.id).isLoaded = true)
            : null;
        allAudioData.get(segment.id)
            ? (allAudioData.get(segment.id).isLoaded = true)
            : null;
        testAppend();
        console.log(segment);
    });
}
function getServerPath(filepath) {
    var temp = filepath.split('/');
    var paths = temp.slice(3, temp.length);
    return paths.join('/');
}
function fetchArrayBuffer(path, callback) {
    path = getServerPath(path);
    fetch("" + BASE_URL + path, { mode: 'cors' })
        .then(function (res) {
        if (!res.ok) {
            throw new Error('HTTP error, status = ' + res.status);
        }
        // Return as a text for Base64
        return res.text();
    })
        .then(function (text) {
        // Convert into Uint8array from base64
        var arrayBuffer = base64ToBuffer(text);
        callback(arrayBuffer);
    });
}
// var xhr = new XMLHttpRequest()
// xhr.open('get', url)
// xhr.responseType = 'arraybuffer'
// xhr.onload = function() {
//   callback(xhr.response)
// }
// xhr.send()
