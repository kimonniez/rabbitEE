const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
    verbose: false
};

const ree = new RabbitEE(config);

(async()=> {
    await ree.connect();
    await ree.createChannel('test');

    const consumeOptions = {
        channelName: 'test',
        exchange: {
            name: 'myExchange',
            type: 'fanout',
            routingKey: 'queue' //routingKey is queue name
        }
    };

    ree.listen(consumeOptions);
    //Event name is assembling from channelName, exchange.name and exchange.routingKey
    ree.on('test_myExchange_queue', (val) => {
        console.log(val);
    });
})();
