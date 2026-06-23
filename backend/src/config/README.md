# Redis Connection Management

This directory contains centralized Redis configuration and connection management for the backend application.

## Files

### `redis.ts`
- Contains the main Redis client singleton with connection pooling
- Provides separate client instances for main operations, publishing, and subscribing
- Includes comprehensive error handling and reconnection logic
- Used by services that need direct Redis access

### `redisConnection.ts`
- Provides centralized Redis connection configuration for BullMQ
- Shared across all queues, workers, and services
- Includes connection pooling and retry strategies
- Optimized for BullMQ performance with lazy connection

## Usage

### For BullMQ Queues and Workers
```typescript
import { getRedisConnection } from '../config/redisConnection';

const connection = getRedisConnection();
// Use with BullMQ Queue or Worker
```

### For Direct Redis Operations
```typescript
import redisClient from '../config/redis';

// Use the singleton Redis client
await redisClient.set('key', 'value');
const value = await redisClient.get('key');
```

## Benefits

1. **Single Connection Pool**: All Redis operations share the same connection configuration
2. **Consistent Configuration**: Unified retry strategies and error handling
3. **Resource Efficiency**: Reduced memory footprint and connection overhead
4. **Maintainability**: Centralized configuration makes updates easier
5. **Performance**: Optimized settings for both BullMQ and direct Redis access

## Connection Configuration

The Redis connection uses the following environment variables:
- `REDIS_HOST` (default: 'localhost')
- `REDIS_PORT` (default: 6379)
- `REDIS_PASSWORD` (optional)

## Features

- **Automatic Reconnection**: Handles network interruptions gracefully
- **Connection Pooling**: Optimizes performance for concurrent operations
- **Error Handling**: Comprehensive logging and error recovery
- **Lazy Connection**: BullMQ connections are established only when needed
- **Retry Strategy**: Exponential backoff for failed connections
