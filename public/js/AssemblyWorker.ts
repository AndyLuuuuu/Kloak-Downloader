export default class AssemblyWorker {
  private worker: Worker;
  constructor() {
    this.log(`AssemblyWorker created.`);
    this.init();
  }

  init = () => {
    const workerURL = URL.createObjectURL(
      new Blob([`(${this.workerFn.toString()})()`], { type: 'text/javascript' })
    );
    this.worker = new Worker(workerURL);
    URL.revokeObjectURL(workerURL);
  };

  log(message: string) {
    console.log(`<${new Date().toLocaleString()}> ${message}`);
  }

  getWorker(): Worker {
    return this.worker;
  }

  workerFn = () => {
    importScripts(`${self.location.origin}/js/DatabaseWorker.js`);
    importScripts(`${self.location.origin}/js/jimp.min.js`);

    let fileInformation = null;

    let assembledFile = null;

    const assembleFile = () => {};

    const messageChannel = e => {
      const cmd = e.data.cmd;
      const data = e.data.data;
      switch (cmd) {
        case 'DATABASE_READY':
          console.log(fileInformation);
          assembledFile = new Uint8Array(fileInformation.totalsize);
          databaseWorker.worker.postMessage({
            cmd: 'REQUEST_FILE_PIECES',
            data: fileInformation
          });
          break;
        case 'REQUESTED_FILE_PIECE':
          assembledFile.set(Buffer.from(data.data, 'base64'), data.offset);
          console.log(assembledFile);
          console.log(data);
          break;
        case 'REQUESTED_FILE_COMPLETE':
          const file = new Blob([assembledFile.buffer], {
            type: data.mimetype
          });
          const fileURL = URL.createObjectURL(file)
          self.postMessage({ cmd: 'COMPLETE_FILE', data: {url: fileURL});
          console.log(data);
          break;
        default:
          break;
      }
    };

    const databaseWorker = {
      worker: new DatabaseWorker().getWorker(),
      channel: new MessageChannel()
    };

    databaseWorker.channel.port1.onmessage = messageChannel;

    databaseWorker.worker.postMessage(
      {
        cmd: 'START',
        data: {
          channel: databaseWorker.channel.port2
        }
      },
      [databaseWorker.channel.port2]
    );

    self.addEventListener('message', e => {
      const cmd = e.data.cmd;
      const data = e.data.data;
      switch (cmd) {
        case 'START':
          fileInformation = data;
          break;
        default:
          break;
      }
    });
  };
}
