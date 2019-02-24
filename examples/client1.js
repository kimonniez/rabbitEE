const RabbitEE = require('../index.js');
const readline = require('readline');

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
const config = {
    url: 'amqp://localhost',
};

const ree = new RabbitEE(config);

(async()=> {
    await ree.connect();
    await ree.createChannel('test');
    await ree.createChannel('test1');
    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        } else {
            try {
                ree.send('test', str);
            } catch (e) {

            }

            if (str == 'a') {

            }
            if (str == 'f') {
                ree.send('test1', str);
            }
            console.log(`You pressed the "${str}" key`);
            console.log();
            console.log(key);
            console.log();
        }
    });

})();


