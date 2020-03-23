self.importScripts('jimp.min.js');
var BASE_DL_URL = 'http://localhost:3000/download?';
var WORKER_INFO = {
    id: null,
    messagePort: null
};
function workerMessages(e) {
    console.log(e.data);
}
self.addEventListener('message', function (e) {
    var cmd = e.data.cmd;
    var data = e.data.data;
    console.log(e.data);
    switch (cmd) {
        case 'start':
            WORKER_INFO.id = data.id;
            WORKER_INFO.messagePort = data.channel;
            WORKER_INFO.messagePort.onmessage = workerMessages;
            console.log({
                message: 'downloadWorker',
                data: "Download worker ID: " + WORKER_INFO.id + " started up."
            });
            break;
        case 'download':
            console.log(data);
            fetch(BASE_DL_URL + "filename=" + data.filename + "&ext=" + data.ext + "&offset=" + data.offset + "&chunksize=" + data.chunksize)
                .then(function (res) {
                return res.arrayBuffer();
            })
                .then(function (buff) {
                WORKER_INFO.messagePort.postMessage({
                    cmd: 'saveToDB',
                    data: {
                        workerid: WORKER_INFO.id,
                        filename: data.filename,
                        ext: data.ext,
                        base64: Buffer.from(new Uint8Array(buff)).toString('base64'),
                        offset: data.offset
                    }
                });
            });
            break;
        default:
            break;
    }
});
