const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

// Defines the name of the exchange in RabbitMQ.
// An exchange is where messages are sent first before routing to queues.
const EXCHANGE_NAME = "facebook-events";

async function connectRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbitMq");
  } catch (error) {
    logger.error("Error connecting to rabbitMq", error);
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectRabbitMq();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
  );
  logger.info(`Event Published: ${routingKey}`);
}

module.exports = { connectRabbitMq, publishEvent };

// assertExchange(...) → Declares an exchange in RabbitMQ. If it already exists, it does nothing.
// "topic" → Type of exchange. Topic exchanges allow messages to be routed using patterns (like "user.*.created").
// durable: false → Exchange won’t survive a RabbitMQ restart.
// Producers send messages to an exchange
// Exchanges route messages to queues
// Producers never send messages directly to queues
