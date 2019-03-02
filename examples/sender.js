const RabbitEE = require('../index.js');

const config = {
    url: 'amqp://localhost',
    verbose: false
};

const ree = new RabbitEE(config);

(async()=> {

    try {
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
    } catch (error) {
        console.log(error);
    }

})();


process.on('unhandledRejection', (reason, p) => {
    console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});
