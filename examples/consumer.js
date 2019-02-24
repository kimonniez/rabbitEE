const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
    verbose: true
};

const ree = new RabbitEE(config);

(async()=> {
    await ree.connect();
    await ree.createChannel('test');

    const consumeOptions = {
        channelName: 'test'
    };

    ree.listen(consumeOptions);

    ree.on('test', (val) => {
        console.log(val);
    });
})();
