const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const phones = [];
const controllers = [];

wss.on('connection', (client) => {
  client.on('message', (message) => {
    console.log('Received: %s', message);

    try {
      const msgObj = JSON.parse(message);

      if (msgObj.command === 'register') {
        if (msgObj.type === 'phone') {
          console.log('Registered new phone');
          phones.push(client);
        } else if (msgObj.type === 'controller') {
          console.log('Registered new controller');
          controllers.push(client);
        }
      } else if (msgObj.command === 'buzz') {
        console.log(`Buzzing everybody with intensity ${msgObj.intensity} and duration ${msgObj.duration}ms`);
        phones.forEach(phone => phone.send(JSON.stringify(msgObj)));
      } else if (msgObj.command === 'notify') {
        controllers.forEach(controller => controller.send(JSON.stringify(msgObj)));
      }
    } catch (e) {
      console.error(e);
    }
  });
});
