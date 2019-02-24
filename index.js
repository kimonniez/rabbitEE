const EventEmitter = require('events');
const amqp = require('amqplib/callback_api');

/**
 * Usage:
 *
 * file publisher.js
 * const RabbitEE = require('./eer.js');
 *
 * const config = {
 *     url: 'amqp://localhost',
 * };
 *
 * const ree = new RabbitEE(config);
 * (async()=> {
 *      await ree.connect();
 *      await ree.createChannel('test');
 *
 *      ree.send('test', 'Some data string');
 * })
 *
 * file consumer.js *
 * const RabbitEE = require('./eer.js');
 *
 * const config = {
 *     url: 'amqp://localhost',
 * };
 *
 * const ree = new RabbitEE(config);
 *
 * (async()=> {
 *   await ree.connect();
 *   await ree.createChannel('test');
 *
 *   ree.listen('test');
 *   ree.on('test', (val) => {
 *       console.log(val);
 *   });
 *
 *  })();
 */

class RabbitEE extends EventEmitter {
    /**
     * config - config object
     * @type {boolean}
     */
    config = false;

    /**
     * connection - established connection with Rabbit
     * @type {boolean}
     */
    connection = false;

    /**
     * channel - list of created channels
     * @type {{}}
     */
    channels = {};

    /**
     * constructor method
     * @param config
     */
    constructor(config){
        super();
        this.config = config;
    }

    /**
     * listen method - subscribing to channels
     * @param channelName
     */
    listen = (channelName) => {
        if (!this.channels[channelName]) {
            throw new Error(`Listen Error. There is no channel ${channelName}`);
        }
        const channel = this.channels[channelName];

        channel.assertQueue(channelName, {durable: false});
        channel.consume(channelName, (msg) => {
            console.log(" [x] Received %s", msg.content.toString());
            this.emit(channelName, msg.content.toString());
        }, {noAck: true});
    };

    /**
     * Async method getConnect for connection
     * @returns {Promise<*>}
     */
    getConnect = async () => {
        return new Promise((resolve, reject) => {
            amqp.connect(this.config.url, async function(err, conn) {
                    if (err) {
                        reject(err);
                    }
                    resolve(conn);
            })
        })
    };

    /**
     * Connect method which establish connection to Rabbit
     * @returns {Promise<void>}
     */
    connect = async () => {
        this.connection = await this.getConnect();
    };

    /**
     * Create  channel by name
     * @param channelName
     * @returns {Promise<*>}
     */
    createChannel = async (channelName) => {
        if (!this.connection) {
            throw new Error('Create channel Error. There is no Rabbit Connection');
        }
        return new Promise((resolve, reject) => {
            this.connection.createChannel((err, channel) => {
                if (err) {
                    reject(err);
                }
                resolve(this.channels[channelName] = channel);
            })
        });
    };

    /**
     * Send @data to channel by @channelName
     * @param channelName
     * @param data
     */
    send = (channelName, data) => {
        if (!this.channels[channelName]) {
            throw new Error(`Send Error. There is no channel ${channelName}`);
        }
        if (typeof data !== 'string' || data instanceof String) {
            throw new Error(`Send Error. Data is not String`);
        }
        const channel = this.channels[channelName];

        channel.assertQueue(channelName, {durable: false});
        channel.sendToQueue(channelName, new Buffer.from(data));
    };

}

module.exports = RabbitEE;
