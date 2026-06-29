import amqplib, { Channel } from 'amqplib';
import dotenv from 'dotenv';
import RabbitQueuesExchangesSetup from './RabbitQueuesExchangesSetup';

// Load environment variables
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: any | null = null;
  private channel: Channel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly reconnectInterval = 5000; // 5 seconds
  private consumerSetups: Array<{ queue: string, handler: (message: any, routingKey: string, exchange: string) => Promise<void> }> = [];
  private isReconnecting: boolean = false;

  private constructor() {}

  static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isReconnecting) {
      console.log('⏳ Reconnection already in progress, skipping...');
      return;
    }

    try {
      // this.connection = await amqplib.connect('amqp://guest:guest@localhost:5672');
      this.connection = await amqplib.connect(RABBITMQ_URL as string);
      this.channel = await this.connection.createChannel();

      // Add channel error listener
      if (this.channel) {
        this.channel.on('error', this.handleChannelError.bind(this));
        this.channel.on('close', this.handleChannelClose.bind(this));
      }

      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

      await RabbitQueuesExchangesSetup.setupExchanges(this.channel as Channel);
      await RabbitQueuesExchangesSetup.setupQueues(this.channel as Channel);

      console.log('✅ RabbitMQ connected and initialized successfully');

      // Re-establish consumers after successful reconnection
      if (this.consumerSetups.length > 0) {
        console.log('🔄 Re-establishing consumers...');
        for (const consumerSetup of this.consumerSetups) {
          await this.consumeMessages(consumerSetup.queue, consumerSetup.handler);
        }
        console.log('✅ All consumers re-established');
      }
    } catch (error) {
      console.error('❌ Failed to initialize RabbitMQ:', error);
      this.scheduleReconnect();
    }
  }
  private handleConnectionError(error: Error): void {
    console.error('RabbitMQ connection error:', error);
    this.scheduleReconnect();
  }

  private handleConnectionClose(): void {
    console.warn('RabbitMQ connection closed');
    this.scheduleReconnect();
  }

  private handleChannelError(error: Error): void {
    console.error('RabbitMQ channel error:', error);
    this.channel = null;
    this.scheduleReconnect();
  }

  private handleChannelClose(): void {
    console.warn('RabbitMQ channel closed');
    this.channel = null;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.isReconnecting = true;
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect to RabbitMQ...');
      this.isReconnecting = false;
      this.initialize();
    }, this.reconnectInterval);
  }
  //  Produce  Message  via Publish
  async produceMessage(exchange: string, routingKey: string, message: any): Promise<boolean> {
    try {
      if (!this.channel || !this.channel.connection) {
        console.warn('⚠️ Channel not available, reinitializing...');
        await this.initialize();
      }

      if (this.channel && this.channel.connection) {
        return this.channel.publish(
          exchange,
          routingKey,
          Buffer.from(JSON.stringify(message)),
          { persistent: true }
        );
      }
      return false;
    } catch (error) {
      console.error('Failed to publish message:', error);
      // If channel is dead, trigger reconnection
      this.channel = null;
      this.scheduleReconnect();
      return false;
    }
  }
//  consume messages via consume
 async consumeMessages(queue: string, handler: (message: any, routingKey: string,exchange: string) => Promise<void>): Promise<void> {
  console.log(`🔄 [RabbitMQ] Setting up consumer for queue: ${queue}`);

  if (!this.channel || !this.channel.connection) {
    console.log('⚙️ [RabbitMQ] Channel not found, initializing...');
    await this.initialize();
  }

  if (!this.channel || !this.channel.connection) {
    console.error('❌ [RabbitMQ] Failed to initialize channel for consumer.');
    return;
  }

  // Store consumer setup for reconnection
  const existingSetup = this.consumerSetups.find(s => s.queue === queue);
  if (!existingSetup) {
    this.consumerSetups.push({ queue, handler });
    console.log(`💾 [RabbitMQ] Consumer setup stored for queue: ${queue}`);
  }

  // Limit to 1 unacknowledged message per consumer
  await this.channel.prefetch(1);
  console.log(`🎯 [RabbitMQ] Prefetch set to 1 for queue: ${queue}`);

  // Start consuming
  await this.channel.consume(queue, async (msg) => {
    if (!msg) {
      console.warn(`⚠️ [RabbitMQ] Received null message in queue: ${queue}`);
      return;
    }

    console.log(`📨 [RabbitMQ] Message received from queue: ${queue}`);
    console.log('📦 Raw message:', msg.content.toString());

    try {
      const content = JSON.parse(msg.content.toString());
      console.log('✅ [RabbitMQ] Message parsed successfully:', content);

      // Run the handler you provided
      console.log('🚀 [RabbitMQ] Executing message handler...');
      await handler(content,msg.fields.routingKey,msg.fields.exchange);
      console.log('🟢 [RabbitMQ] Handler executed successfully');

      // Acknowledge success
      this.channel!.ack(msg);
      console.log('✅ [RabbitMQ] Message acknowledged (ACK)');
    } catch (error) {
      console.error(`❌ [RabbitMQ] Error processing message from queue ${queue}:`, error);

      // Reject and requeue
      this.channel!.nack(msg, false, true);
      console.log('🔁 [RabbitMQ] Message requeued (NACK)');
    }
  });

  console.log(`👂 [RabbitMQ] Consumer started for queue: ${queue}`);
}


  async closeConnection(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

export const rabbitMQService = RabbitMQService.getInstance();
