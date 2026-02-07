const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook-events";

async function connectRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMq");
  } catch (error) {
    logger.error("Error connecting to RabbitMq", error);
  }
}

async function publishEvent(routingKey, message) {
  try {
    if (!channel) {
      await connectRabbitMq();
    }
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message)),
    );
    logger.info(`Event published ${routingKey}`);
  } catch (error) {
    logger.error("Error publishing event");
  }
}

// consuming post delete event from post service
async function consumeEvent(routingKey, callback) {
  if (!channel) {
    connectRabbitMq();
  }
  const q = channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);

  channel.consume(q.queue, (entireMessageObjectFromAmqp) => {
    if (entireMessageObjectFromAmqp !== null) {
      const messageContentFromPublisher = JSON.parse(
        entireMessageObjectFromAmqp.content.toString(),
      );
      callback(messageContentFromPublisher); // we are calling this event handler function with the message content which are postId:  userId:  mediaIds
      channel.ack(entireMessageObjectFromAmqp);
    }
  });
  logger.info(`Subscribed to event ${routingKey}`);
}

module.exports = { connectRabbitMq, publishEvent, consumeEvent };

//const q = channel.assertQueue("", { exclusive: true });
// If the queue already exists → nothing happens
// If it doesn’t exist → RabbitMQ creates it
//When you pass an empty string as the queue name: you are telling rabbitMq to
// q.queue is the field name
// “Create a queue for me, and YOU choose the name.”
// entireMessageObjectFromAmqp.content is the raw binary payload of the message, and you must decode it (usually from JSON) to get usable data.
// Structure of msg

// A typical amqpmsg (entireMessageObjectFromAmqp) object looks like this (simplified):

// {
//   content: <Buffer ...>,
//   fields: {
//     deliveryTag: 1,
//     exchange: "facebook-events",
//     routingKey: "post.created",
//     redelivered: false
//   },
//   properties: {
//     contentType: "application/json",
//     headers: {},
//     timestamp: 1690000000
//   }
// }
