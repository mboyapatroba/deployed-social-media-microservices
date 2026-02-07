const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook-events";

// connect to RabbitMq
async function connectRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Succcessfully connected to RabbitMq");
  } catch (error) {
    logger.error("Error connecting to RabbitMq");
  }
}

// publish event
async function publishEvent(routingKey, message) {
  if (!channel) {
    connectRabbitMq();
  }
  // send message to an exchange
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
  );
  logger.info(`Event Published ${routingKey}`);
}

// consume an event
async function consumeEvent(routingKey, callback) {
  if (!channel) {
    connectRabbitMq();
  }
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  channel.consume(q.queue, (entireMessageObject) => {
    if (entireMessageObject !== null) {
      const messageFromPublisher = JSON.parse(
        entireMessageObject.content.toString(),
      );
      callback(messageFromPublisher);
      channel.ack(entireMessageObject);
    }
  });
  logger.info(`Subscribed to event: ${routingKey}`);
}

module.exports = { connectRabbitMq, consumeEvent };
