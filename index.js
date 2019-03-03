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

/**
 * Class RabbitEE is EventEmitter wrapper for amqp/callback_api
 * which handle reconnet logic in case of crush of Rabbit
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
     * createdChannels - list of created channels
     * @type {{}}
     */
    createdChannels = {};

    /**
     * channelList - list of channels for case of reconnect
     * @type {{}}
     */
    channelList = [];

    /**
     * listenersList - list of listeners for case of reconnect
     */
    listenersList = [];

    /**
     * onnectionTimer - timer before reconnect try
     * @type {number}
     */
    reconnectionTimer = 5000;

    /**
     * constructor method
     * @param config
     */
    constructor(config){
        super();
        if (!config.url) {
            throw new Error('Config URL required');
        }
        this.config = config;
    }

    /**
     * Config getter
     * @returns {*}
     */
    get config() {
        return this._config;
    }

    /**
     * Config setter
     * @param val
     */
    set config(val) {
        //TODO config validation
        this._config = val;
    }

    /**
     * Getter for connetion
     * @returns {*}
     */
    get connection() {
        return this._connection;
    }

    /**
     * Setter for connection
     * @param val
     */
    set connection(val) {
        this._connection = val;
    }

    /**
     * Async method getConnect for connection
     * @returns {Promise<*>}
     */
    getConnect = async () => {
        return new Promise((resolve, reject) => {
            amqp.connect(this.config.url, async (err, conn) => {
                if (err) {
                    reject(err);
                }
                resolve(conn);
            })
        })
    };

    /**
     * Add channel to list of reconnection channels
     * @param channel
     */
    addChannelToList = (channel) => {
        this.channelList.push(channel);
    };

    /**
     * Add listeners to list of reconnection listeners
     * @param listenOptions
     */
    addListenersToList = (listenOptions) => {
        this.listenersList.push(listenOptions);
    };

    /**
     * Reconnection logic
     * @returns {Promise<void>}
     */
    reconnect = async () => {
        try {
            this.connection = null;
            this.createdChannels = {};
            this.connection = await this.getConnect();
            if (this.channelList.length && this.listenersList) {
                this.channelList.map(async channel => {
                    await this.createChannel(channel);
                    this.listenersList.map(async listenerOpts => {
                        //Try..catch inside try..catch. Looks great :)
                        //But looks like exceptions inside .map scope cause unhanded exception
                        try {
                            await this.listen(listenerOpts);
                        } catch (error) {}
                    });
                });
                this.bindEventsToConnetion();
                //Remove channel for reconnection
                this.channels = [];
                if (this.config.verbose) {
                    console.log('Reconnected');
                }
            }
        } catch (error) {
            if (this.config.verbose) {
                console.log('Reconnection error. Try again');
            }
            this.tryReconnect();
        }
    };

    /**
     * Do reconnection attempt
     */
    tryReconnect = () => {
        setTimeout(async () => {
            try {
                this.reconnect()
            } catch (error) {}
        }, this.reconnectionTimer);
    };

    /**
     * Connect method which establish connection to Rabbit
     * @returns {Promise<void>}
     */
    connect = async () => {
        try {
            this.connection = await this.getConnect();
            this.bindEventsToConnetion();
        } catch (error) {
            if (this.config.verbose) {
                console.error("Connections error. Try to reconnect.");
            }
            this.tryReconnect();
            //throw new Error('Connection failed');
        }
    };

    /**
     * Bind events to connection for handling disconnect
     */
    bindEventsToConnetion = () => {
        this.connection.on("error", (err) => {
            if (err.message !== "Connection closing") {
                if (this.config.verbose) {
                    console.error("[AMQP] conn error", err.message);
                }
            }
        });
        this.connection.on("close", async () => {
            if (this.config.verbose) {
                console.error("[AMQP] reconnecting");
            }
            this.tryReconnect();
        });
    };

    /**
     * Create  channel by name
     * @param channelName
     * @returns {Promise<*>}
     */
    createChannel = async (channelName) => {
        this.addChannelToList(channelName);
        if (!this.connection) {
            throw new Error('Create channel Error. There is no Rabbit Connection');
        }
        return new Promise((resolve, reject) => {
            this.connection.createChannel((err, channel) => {
                if (err) {
                    if (this.config.verbose) {
                        console.log('Create channel error');
                    }
                    reject(err);
                }
                resolve(this.createdChannels[channelName] = channel);
            })
        });
    };


    /**
     * Send @data to channel by @channelName
     * @param channelOpts
     * @param {string} data
     */
    send = (channelOpts, data) => {
        if (!this.createdChannels[channelOpts.channelName]) {
            throw new Error(`Send Error. There is no channel ${channelOpts.channelName}`);
        }
        if (typeof data !== 'string' || data instanceof String) {
            throw new Error(`Send Error. Data is not String`);
        }

        const channel = this.createdChannels[channelOpts.channelName];

        if (channelOpts.exchange) {
            const exchange = channelOpts.exchange.name;
            const exchangeType = channelOpts.exchange.type || 'fanout';

            const routingKey = channelOpts.exchange.routingKey || '';
            channel.assertExchange(exchange, exchangeType, {durable: true}, (err, ok) => {
                if (err) {
                    throw new Error(`Assert exchange failed`);
                }
            });
            channel.publish(exchange, routingKey, new Buffer.from(data));
            if (this.config.verbose) {
                console.log(" [x] Sent %s", data);
            }
        } else {
            channel.assertQueue(channelOpts.channelName, {durable: true}, (err, q) => {
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
        this.addListenersToList(channelOpts);
        if (!this.createdChannels[channelOpts.channelName]) {
            throw new Error(`Listen Error. There is no channel ${channelOpts.channelName}`);
        }
        const channel = this.createdChannels[channelOpts.channelName];

        if (channelOpts.exchange) {
            const exchange = channelOpts.exchange.name;
            const exchangeType = channelOpts.exchange.type || 'fanout';
            const routingKey = channelOpts.exchange.routingKey || '';

            channel.assertExchange(exchange, exchangeType, {durable: true}, (err, ok) => {
                if (err) {
                    throw new Error(`Assert exchange failed`);
                }
            });
            channel.assertQueue(routingKey, {durable: true}, (err, q) => {
                if (err) {
                    throw new Error(`Assert queue failed`);
                }

                if (this.config.verbose) {
                    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                }

                channel.bindQueue(q.queue, exchange, routingKey);
                channel.consume(q.queue, (msg) => {
                    if (msg.content && this.config.verbose) {
                        console.log(" [x] Received %s", msg.content.toString());
                    }
                    this.emit(`${channelOpts.channelName}_${exchange}_${routingKey}`, msg.content.toString());
                }, {noAck: true});
            });
        } else {
            channel.assertQueue(channelOpts.channelName, {durable: true}, (err, q) => {
                if (err) {
                    throw new Error(`Assert queue failed`);
                }
            });
            channel.consume(channelOpts.channelName, (msg) => {
                if (msg.content && this.config.verbose) {
                    console.log(" [x] Received %s", msg.content.toString());
                }
                this.emit(channelOpts.channelName, msg.content.toString());

            }, {noAck: true});
        }

    };

}

module.exports = RabbitEE;
