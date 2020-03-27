import Downloader from './Downloader.js';

const button = document.getElementById('dl');
const progressSegment = document.getElementById('progressSegment');
const progressMessage = document.getElementById('progressMessage');

const log = (message: string) => {
  console.log(`<${new Date().toLocaleString()}> ${message}`);
};

const updateProgress = data => {
  const percent = `${Math.round(
    (downloads[data.filename].downloadCount / downloads[data.filename].parts) *
      100
  )}%`;
  downloads[data.filename].downloadCount++;
  progressSegment.style.width = percent;
  progressMessage.textContent = percent;
};

const downloads = {};

const callback = e => {
  const cmd = e.cmd;
  const data = e.data;
  switch (cmd) {
    case 'SYSTEM_READY':
      log('Downloader ready.');
      break;
    case 'FILE_INFORMATION':
      downloads[data.filename] = { ...data, downloadCount: 0 };
      console.log(downloads);
      break;
    case 'SEGMENT_COMPLETE':
      updateProgress(data);
      break;
    default:
      break;
  }
};

const download = new Downloader(
  `http://localhost:3000/requestfile?file=d82488b4-f1fc-4497-b5ac-c081a8955d75`,
  callback
);

button.addEventListener('click', () => {
  download.start();
});
