const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
};

const ree = new RabbitEE(config);

(async()=> {
    try {
        await ree.connect();
        await ree.createChannel('test');
        await ree.createChannel('test1');
        ree.listen('test');
        ree.listen('test1');
        ree.on('test', (val) => {
            console.log(val);
        });
        ree.on('test1', (val) => {
            console.log(val);
        });
    } catch (e) {
        //console.log(e);
    }

})();


