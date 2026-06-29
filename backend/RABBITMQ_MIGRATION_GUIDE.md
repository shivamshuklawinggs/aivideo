# RabbitMQ Migration Guide

This document outlines the migration from BullMQ (Redis-based) to RabbitMQ for background job processing.

## Overview

The backend has been migrated from BullMQ to RabbitMQ to leverage RabbitMQ's advanced message routing, durability, and clustering capabilities.

## Files Changed

### New Files Created
- `src/queues/RabbitMQQueueManager.ts` - New RabbitMQ-based queue manager
- `src/workers/RabbitMQAIWorker.ts` - New RabbitMQ-based AI worker
- `src/workers/RabbitMQExtractComicWorker.ts` - New RabbitMQ-based comic extraction worker

### Files Updated
- `src/config/rabbitmq/constants.ts` - Added AI video processing queues and exchanges
- `src/config/rabbitmq/RabbitQueuesExchangesSetup.ts` - Added AI video processing queue bindings
- `src/controllers/webtoonController.ts` - Updated to use RabbitMQ QueueManager
- `src/controllers/voiceController.ts` - Updated to use RabbitMQ QueueManager
- `src/controllers/videoController.ts` - Updated to use RabbitMQ QueueManager

### Legacy Files (Can be removed after testing)
- `src/queues/QueueManager.ts` - Old BullMQ QueueManager
- `src/workers/aiWorker.ts` - Old BullMQ AI worker
- `src/workers/extractComicWorker.ts` - Old BullMQ comic extraction worker

## Key Changes

### 1. Queue Management
- **Before**: BullMQ with Redis backend
- **After**: RabbitMQ with topic exchanges

### 2. Job Processing
- **Before**: BullMQ workers with automatic retries
- **After**: RabbitMQ consumers with manual acknowledgment

### 3. Job Status Tracking
- **Before**: Built-in BullMQ job status
- **After**: Custom job status tracking using in-memory Map

## Configuration

### Environment Variables
Ensure you have the following RabbitMQ environment variables set:
```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

### RabbitMQ Setup
The system automatically creates the following exchanges and queues:

#### Exchanges
- `ai-video-exchange` - For AI video processing jobs
- `ai-worker-exchange` - For AI worker tasks

#### Queues
- `upload-archive` - Archive upload processing
- `extract-comic` - Comic extraction
- `process-panels` - Panel processing
- `generate-script` - Script generation
- `generate-voice` - Voice generation
- `generate-subtitles` - Subtitle generation
- `generate-video` - Video generation
- `render-video` - Video rendering
- `ai-text-generation` - AI text generation
- `ai-image-analysis` - AI image analysis
- `ai-script-generation` - AI script generation
- `ai-voice-synthesis` - AI voice synthesis
- `ai-panel-analysis` - AI panel analysis
- `ai-batch-processing` - AI batch processing

## Usage

### Import New QueueManager
```typescript
import { rabbitMQQueueManager } from '../queues/RabbitMQQueueManager';
```

### Adding Jobs
```typescript
// Add extract comic job
await rabbitMQQueueManager.addExtractComicJob({
  webtoonId: 'webtoon-id',
  archivePath: '/path/to/archive',
  userId: 'user-id'
});

// Add generate script job
await rabbitMQQueueManager.addGenerateScriptJob({
  webtoonId: 'webtoon-id',
  chapterId: 'chapter-id',
  voiceProfileId: 'voice-profile-id',
  options: {},
  userId: 'user-id'
});
```

### Getting Job Status
```typescript
const jobStatus = await rabbitMQQueueManager.getJobStatus('extract-comic', 'job-id');
```

### Queue Statistics
```typescript
const stats = rabbitMQQueueManager.getQueueStats();
```

## Benefits of RabbitMQ

1. **Better Message Routing**: Topic exchanges allow flexible routing patterns
2. **Durability**: Messages persist on disk until consumed
3. **Clustering**: Better support for horizontal scaling
4. **Acknowledgments**: Reliable message delivery with manual ACK/NACK
5. **Dead Letter Queues**: Built-in support for failed message handling

## Migration Checklist

- [ ] Update all controllers to use RabbitMQ QueueManager
- [ ] Test all job types (extract comic, generate script, generate voice, etc.)
- [ ] Verify RabbitMQ server is running and accessible
- [ ] Update deployment scripts to include RabbitMQ
- [ ] Remove BullMQ dependencies from package.json (optional)
- [ ] Remove old BullMQ worker files (optional)

## Monitoring

RabbitMQ provides a management UI at `http://localhost:15672` (default credentials: guest/guest) where you can:
- Monitor queue status
- View message rates
- Check consumer connections
- Inspect messages

## Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure RabbitMQ server is running and RABBITMQ_URL is correct
2. **Queue Not Found**: Check that RabbitQueuesExchangesSetup has run
3. **Messages Not Consumed**: Verify consumers are properly initialized
4. **Memory Leaks**: Monitor job status Map size in RabbitMQQueueManager

### Debug Logging

Enable debug logging by setting:
```env
DEBUG=rabbitmq*
```

## Performance Considerations

1. **Prefetch Count**: Currently set to 1 for reliability
2. **Job Status Tracking**: Uses in-memory Map, consider Redis for distributed systems
3. **Connection Pooling**: Single connection per service instance
4. **Message Persistence**: All messages are persistent by default

## Future Enhancements

1. **Distributed Job Status**: Use Redis for job status tracking
2. **Dead Letter Queues**: Implement for failed jobs
3. **Job Priorities**: Implement priority queues
4. **Batch Processing**: Optimize for bulk operations
5. **Metrics**: Add Prometheus/Grafana monitoring
