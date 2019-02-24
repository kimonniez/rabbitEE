#RabbitEE
The simplest EventBased wrapper for RabbitMQ

###Disclamer
This is pre-pre-pre alpha version :)
So use it at one's own risk.

###Usage 

HINT: use `--harmony` flag for node. E.G.:
```
node --harmony sender.js
```

So, first off all need to create `sender.js`


```
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
```

After that create `consumer.js`

```
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
```

If you need to use exchanges try to check `/examples` dir

Maybe in future disconnects handling, sending acknowledgement handling etc. will appear :)
