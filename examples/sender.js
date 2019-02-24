const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
    verbose: true
};

const ree = new RabbitEE(config);

(async()=> {
    await ree.connect();
    await ree.createChannel('test');

    const sendOptions = {
        channelName: 'test'
    };

    try {
        ree.send(sendOptions, 'Data to queue');
    } catch (e) {
        console.log(e);
    }
})();
