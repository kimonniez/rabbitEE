const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
    verbose: false
};

const ree = new RabbitEE(config);

(async()=> {
    await ree.connect();
    await ree.createChannel('test');

    const sendOptions = {
        channelName: 'test',
        exchange: {
            name: 'myExchange',
            type: 'fanout',
            routingKey: 'queue' //routingKey is queue name
        }
    };

    try {
        ree.send(sendOptions, 'Data to queue');
    } catch (e) {
        console.log(e);
    }
})();
