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
     * @param channelOpts
     * @param {string} data
     */
    send = (channelOpts, data) => {
        if (!this.channels[channelOpts.channelName]) {
            throw new Error(`Send Error. There is no channel ${channelOpts.channelName}`);
        }
        if (typeof data !== 'string' || data instanceof String) {
            throw new Error(`Send Error. Data is not String`);
        }

        const channel = this.channels[channelOpts.channelName];

        if (channelOpts.exchange) {
            const exchange = channelOpts.exchange.name;
            const exchangeType = channelOpts.exchange.type || 'fanout';

            const routingKey = channelOpts.exchange.routingKey || '';
            channel.assertExchange(exchange, exchangeType, {durable: false}, (err, ok) => {
                if (err) {
                    throw new Error(`Assert exchange failed`);
                }
            });
            channel.publish(exchange, routingKey, new Buffer.from(data));
            if (this.config.verbose) {
                console.log(" [x] Sent %s", data);
            }
        } else {
            channel.assertQueue(channelOpts.channelName, {durable: false}, (err, q) => {
                if (err) {
                    throw new Error(`Assert queue failed`);
                }
            });
            channel.sendToQueue(channelOpts.channelName, new Buffer.from(data));
        }
    };

    /**
     * listen method - subscribing to channels
     * @param channelOpts
     */
    listen = (channelOpts) => {
        if (!this.channels[channelOpts.channelName]) {
            throw new Error(`Listen Error. There is no channel ${channelOpts.channelName}`);
        }
        const channel = this.channels[channelOpts.channelName];

        if (channelOpts.exchange) {
            const exchange = channelOpts.exchange.name;
            const exchangeType = channelOpts.exchange.type || 'fanout';
            const routingKey = channelOpts.exchange.routingKey || '';

            channel.assertExchange(exchange, exchangeType, {durable: false}, (err, ok) => {
                if (err) {
                    throw new Error(`Assert exchange failed`);
                }
            });
            channel.assertQueue(routingKey, {durable: false}, (err, q) => {
                if (err) {
                    throw new Error(`Assert queue failed`);
                }

                if (this.config.verbose) {
                    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                }

                channel.bindQueue(q.queue, exchange, routingKey);
                channel.consume(q.queue, (msg) => {
                    if (msg.content && this.config.verbose) {
                        console.log(" [x] %s", msg.content.toString());
                    }

                    this.emit(`${channelOpts.channelName}_${exchange}_${routingKey}`, msg.content.toString());

                }, {noAck: true});
            });
        } else {
            channel.assertQueue(channelOpts.channelName, {durable: false}, (err, q) => {
                if (err) {
                    throw new Error(`Assert queue failed`);
                }
            });
            channel.consume(channelOpts.channelName, (msg) => {
                if (this.config.verbose) {
                    console.log(" [x] Received %s", msg.content.toString());
                }

                this.emit(channelOpts.channelName, msg.content.toString());

            }, {noAck: true});
        }


    };

}

module.exports = RabbitEE;
