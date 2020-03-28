// import DownloadWorker from './DownloadWorker.js';
export default class ManagerWorker {
  private worker: Worker;
  constructor() {
    this.log('ManagerWorker created.');
    this.init();
  }

  log(message: string) {
    console.log(`<${new Date().toLocaleString()}> ${message}`);
  }

  getWorker(): Worker {
    return this.worker;
  }

  init = () => {
    const workerURL = URL.createObjectURL(
      new Blob([`(${this.workerFn.toString()})()`], { type: 'text/javascript' })
    );
    this.worker = new Worker(workerURL);
    URL.revokeObjectURL(workerURL);
  };

  workerFn = () => {
    importScripts(`${self.location.origin}/js/DownloadWorker.js`);
    importScripts(`${self.location.origin}/js/DatabaseWorker.js`);
    const downloadWorkers: Array<downloadWorker> = [];

    const log = (message: string) => {
      console.log(`<${new Date().toLocaleString()}> ${message}`);
    };

    const databaseWorker = {
      worker: new DatabaseWorker().getWorker(),
      channel: new MessageChannel()
    };

    const messageChannel = e => {
      const cmd = e.data.cmd;
      const data = e.data.data;
      switch (cmd) {
        case 'CHECKED_FILE':
          if (!data.fileExists) {
            downloadFile(data.file);
          }
          break;
        case 'CHECKED_FILE_PROGRESS':
          self.postMessage({ cmd: 'CHECKED_FILE_PROGRESS', data });
          break;
        case 'SAVE_TO_DATABASE':
          databaseWorker.worker.postMessage({
            cmd,
            data
          });
          downloadWorkers[data.downloadWorkerID].state = 'IDLE';
          break;
        case 'SAVED_TO_DATABASE':
          self.postMessage({
            cmd: 'SEGMENT_COMPLETE',
            data: { filename: data.filename, offset: data.offset }
          });
          log(data.message);
          break;
        case 'DATABASE_READY':
          self.postMessage({
            cmd: 'SYSTEM_READY',
            data: {}
          });
          log(data.message);
          break;
        case 'DATABASE_ERROR':
          self.postMessage({
            cmd: 'SYSTEM_ERROR',
            data: {}
          });
          log(data.message);
          break;
        default:
          break;
      }
    };

    databaseWorker.channel.port1.onmessage = messageChannel;

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    const createNewWorker = (): downloadWorker => {
      const downloadWorker: downloadWorker = {
        worker: new DownloadWorker().getWorker(),
        channel: new MessageChannel(),
        state: 'IDLE'
      };
      downloadWorker.channel.port1.onmessage = messageChannel;
      downloadWorker.worker.postMessage(
        {
          cmd: 'START',
          data: {
            id: downloadWorkers.length,
            channel: downloadWorker.channel.port2
          }
        },
        [downloadWorker.channel.port2]
      );
      downloadWorkers.push(downloadWorker);
      return downloadWorker;
    };

    const checkFileExistence = (file: downloadQueue) => {
      databaseWorker.worker.postMessage({ cmd: 'CHECK_FILE', data: file });
    };

    const downloadFile = (file: downloadQueue) => {
      if (downloadWorkers.length < 5) {
        const downloadWorker = createNewWorker();
        downloadWorker.worker.postMessage({
          cmd: 'DOWNLOAD',
          data: {
            filename: file.filename,
            extension: file.extension,
            offset: file.offset,
            chunksize: file.chunksize
          }
        });
        downloadWorker.state = 'DOWNLOADING';
      } else {
        let requested = false;
        for (let i = 0; i < downloadWorkers.length; i++) {
          if (downloadWorkers[i].state === 'IDLE') {
            downloadWorkers[i].worker.postMessage({
              cmd: 'DOWNLOAD',
              data: {
                filename: file.filename,
                extension: file.extension,
                offset: file.offset,
                chunksize: file.chunksize
              }
            });
            requested = true;
            return;
          }
        }
        if (!requested) {
          sleep(2000).then(() => {
            downloadFile(file);
          });
        }
      }
    };

    self.addEventListener('message', e => {
      const cmd = e.data.cmd;
      const data = e.data.data;
      switch (cmd) {
        case 'START':
          databaseWorker.worker.postMessage(
            {
              cmd: 'START',
              data: {
                channel: databaseWorker.channel.port2,
                fileInformation: data
              }
            },
            [databaseWorker.channel.port2]
          );
          break;
        case 'CHECK_FILE_PROGRESS':
          databaseWorker.worker.postMessage({
            cmd: 'CHECK_FILE_PROGRESS',
            data
          });
          break;
        case 'REQUEST DOWNLOAD':
          checkFileExistence(data);
          break;
        default:
          break;
      }
    });
  };
}
