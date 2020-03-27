import ManagerWorker from './ManagerWorker.js';
export default class Downloader {
  static JS_FOLDER_URL = `http://localhost:3000/js/`;
  private DEBUG = false;
  private fileInformation: fileInformation;
  private managerWorker: Worker;
  private downloadQueue: Array<downloadQueue> = [];
  private queueInterval;
  private queueConsume;
  private downloadState: 'start' | 'pause' | 'stop' = 'stop';
  private systemState: 'ready' | 'waiting' = 'waiting';
  private chunksize: number = 1048576;
  private mainCallback: Function;
  constructor(url: string, callback: Function) {
    if (!window.indexedDB) {
      alert(
        "Your browser doesn't support a stable version of IndexedDB.\nWe recommend you use the Chrome browser."
      );
    }
    this.fetchFileInformation(url).then(() => {
      this.log(this.fileInformation);
      this.managerWorker = new ManagerWorker().getWorker();
      this.managerWorker.postMessage({
        cmd: 'START',
        data: this.fileInformation
      });
      this.managerWorker.onmessage = this.messageChannel;
      callback({
        cmd: 'FILE_INFORMATION',
        data: {
          filename: this.fileInformation.filename,
          extension: this.fileInformation.extension,
          parts: this.fileInformation.parts,
          chunksize: this.fileInformation.chunksize
        }
      });
    });
    this.mainCallback = callback;
  }

  log = (message: any) => {
    if (this.DEBUG) {
      console.log(message);
    }
  };

  messageChannel = e => {
    const cmd = e.data.cmd;
    switch (cmd) {
      case 'SYSTEM_READY':
        this.mainCallback(e.data);
        this.systemState = 'ready';
        this.queueInterval = this.pushQueue();
        this.queueConsume = this.consumeQueue();
        break;
      case 'SEGMENT_COMPLETE':
        this.mainCallback(e.data);
        break;
      default:
        break;
    }
  };

  fetchFileInformation = (url: string) => {
    return fetch(url)
      .then(res => {
        return res.json();
      })
      .then(file => {
        this.fileInformation = {
          filename: file.filename,
          extension: file.extension,
          totalsize: file.size,
          parts: Math.ceil(file.size / this.chunksize),
          chunksize: 1048576,
          downloadCount: 0,
          startOffset: 0
        };
        console.log(file.size);
      });
  };

  requestDownload = (file: downloadQueue) => {
    const message: managerMessage = {
      cmd: 'REQUEST DOWNLOAD',
      data: file
    };
    this.managerWorker.postMessage(message);
  };

  pushQueue = () => {
    return setInterval(() => {
      if (this.downloadState === 'start') {
        if (this.downloadQueue.length < 20) {
          this.log('Adding to queue!');
          console.log(this.fileInformation.startOffset);
          if (
            this.fileInformation.startOffset <= this.fileInformation.totalsize
          ) {
            this.downloadQueue.push(<downloadQueue>{
              filename: this.fileInformation.filename,
              extension: this.fileInformation.extension,
              offset: this.fileInformation.startOffset,
              chunksize: this.chunksize
            });
            this.log(this.downloadQueue);
            this.fileInformation.startOffset =
              this.fileInformation.startOffset + this.fileInformation.chunksize;
          }
        }
      }
    }, 200);
  };

  shuffle = (array): Array<downloadQueue> => {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
      // Pick a random index
      let index = Math.floor(Math.random() * counter);

      // Decrease counter by 1
      counter--;

      // And swap the last element with it
      let temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
    }
    return array;
  };

  consumeQueue = () => {
    return setInterval(() => {
      if (this.downloadState === 'start') {
        this.log('Consuming a queue!');
        this.log(this.downloadQueue);
        if (this.downloadQueue.length > 0) {
          const file = this.shuffle(this.downloadQueue).shift();
          this.log(file);
          this.requestDownload(file);
        }
      }
    }, 200);
  };

  start = () => {
    this.downloadState = 'start';
  };
}
