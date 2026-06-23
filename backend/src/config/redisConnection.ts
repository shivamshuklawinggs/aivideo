import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';

// Debug: Log Redis configuration (without password)
console.log('🔧 Redis Configuration:');
console.log(`  Host: ${REDIS_HOST}`);
console.log(`  Port: ${REDIS_PORT}`);
console.log(`  Username: ${REDIS_USERNAME}`);
console.log(`  Password: ${REDIS_PASSWORD ? '***SET***' : 'NOT SET'}`);

const redisClient = createClient({
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    connectTimeout: 5000,
    family: 4, // 👈 force IPv4
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 2000),
  },

});


redisClient.on('connect', () => {
  console.log('✅ Redis client connected successfully');
});

redisClient.on('error', (err: any) => {
  // Debug: Log Redis configuration (without password)
console.log('🔧 Redis Configuration:');
console.log(`  Host: ${REDIS_HOST}`);
console.log(`  Port: ${REDIS_PORT}`);
console.log(`  Username: ${REDIS_USERNAME}`);
console.log(`  Password: ${REDIS_PASSWORD ? '***SET***' : 'NOT SET'}`);

  console.error('❌ Redis Client Error:', err);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection failed:', error);
  }
}

// Export connection configuration for BullMQ
export const redisConnectionConfig = {
   password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    connectTimeout: 5000,
      family: 4, // 👈 force IPv4
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 2000),
  },
};

export { connectRedis }
export default redisClient;

