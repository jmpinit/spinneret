const WebSocket = require('ws');

const SERVICE_COUNT = 3;

const ws = new WebSocket('ws://localhost:8080');

function notify() {
  ws.send(JSON.stringify({
    command: 'notify',
    service: Math.floor(SERVICE_COUNT * Math.random()),
  }));
}

function notifyLoop() {
  setTimeout(() => {
    notify();
    notifyLoop();
  }, 1000 + Math.random() * 9000);
}

ws.on('open', () => notifyLoop());

ws.on('message', data => console.log(`Received: ${data}`));

