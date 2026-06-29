# AI Webtoon Story Explainer API

A comprehensive API for creating AI-powered webtoon explanations with voice synthesis. This system automatically extracts comic panels, generates explanatory scripts, and creates voice narrations.

## 🚀 Features

- **Automatic Comic Processing**: Upload comic archives (ZIP/RAR) and automatically extract chapters and panels
- **AI-Powered Script Generation**: Generate engaging explanations using advanced AI models
- **Voice Synthesis**: Create voice narrations using sample voice profiles
- **Real-time Progress Tracking**: Monitor processing status through WebSocket-like updates
- **RESTful API**: Clean, well-documented endpoints with comprehensive error handling

## 📋 Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [API Overview](#api-overview)
4. [Complete Workflow](#complete-workflow)
5. [API Endpoints](#api-endpoints)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Development](#development)

## 🛠 Installation

### Prerequisites

- Node.js 18+ 
- MongoDB
- RabbitMQ (for background processing)
- Ollama (for AI processing)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd aivideo/backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
# - MongoDB connection string
# - RabbitMQ connection details
# - Ollama service URL
# - JWT secret

# Start the development server
npm run dev
```

## 🎯 Quick Start

```bash
# 1. Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "testuser"
  }'

# 2. Login to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 3. Upload webtoon for AI explanation
curl -X POST http://localhost:5000/api/webtoon-explainer/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "archive=@your-comic-file.zip" \
  -F "title=My Awesome Webtoon" \
  -F "description=A great story about..." \
  -F "author=Your Name" \
  -F "genres=action,adventure"

# 4. Check processing status
curl -X GET http://localhost:5000/api/webtoon-explainer/{webtoonId}/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Get generated explanation
curl -X GET http://localhost:5000/api/webtoon-explainer/{webtoonId}/explanation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔄 Complete Workflow

### Step 1: User Authentication
```http
POST /api/auth/register
POST /api/auth/login
```

### Step 2: Webtoon Upload & Processing
```http
POST /api/webtoon-explainer/upload
```
**What happens behind the scenes:**
1. File validation and storage
2. Archive extraction (ZIP/RAR)
3. Chapter detection and creation
4. Panel extraction and metadata generation
5. AI panel analysis
6. Script generation
7. Status updates throughout the process

### Step 3: Monitor Processing Status
```http
GET /api/webtoon-explainer/{webtoonId}/status
```

### Step 4: Retrieve Generated Content
```http
GET /api/webtoon-explainer/{webtoonId}/explanation
```

### Step 5: Generate Voice Explanation
```http
POST /api/webtoon-explainer/{webtoonId}/voice
```

## 📊 Detailed Workflow Breakdown

### 1. Webtoon Creation Process

#### Upload Phase
```http
POST /api/webtoon-explainer/upload
Content-Type: multipart/form-data

Request Body:
- archive: File (ZIP/RAR containing comic images)
- title: string (required)
- description: string (optional)
- author: string (optional)
- genres: string[] (optional)
```

**Processing Pipeline:**
1. **File Validation**: Check file type, size, and integrity
2. **Archive Extraction**: Extract images to temporary directory
3. **Chapter Detection**: Automatically detect chapter boundaries
4. **Panel Creation**: Extract individual panels from comic pages
5. **Metadata Generation**: Generate thumbnails, extract image metadata
6. **Database Storage**: Save webtoon, chapters, and panels to MongoDB

#### Response Example:
```json
{
  "success": true,
  "message": "Webtoon uploaded successfully. Explanation workflow started.",
  "data": {
    "webtoonId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "My Awesome Webtoon",
    "processingStatus": "uploading",
    "processingProgress": 0
  }
}
```

### 2. Chapter Creation Process

**Automatic Chapter Detection:**
- Analyzes folder structure in uploaded archive
- Detects chapter boundaries based on:
  - Folder names (Chapter 1, Chapter 2, etc.)
  - File naming patterns
  - Sequential image numbering

**Chapter Data Structure:**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
  "webtoonId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "chapterNumber": 1,
  "title": "Chapter 1: The Beginning",
  "panelCount": 12,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 3. Panel Creation Process

**Panel Extraction:**
- Each image is processed as a panel
- Automatic thumbnail generation (200x200px)
- Image metadata extraction (dimensions, file size, format)
- AI-powered panel analysis for content understanding

**Panel Data Structure:**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
  "webtoonId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "chapterId": "64f8a1b2c3d4e5f6a7b8c9d1",
  "panelNumber": 1,
  "sequence": 1,
  "imagePath": "/uploads/webtoons/64f8a1b2c3d4e5f6a7b8c9d0/panel_001.jpg",
  "imageUrl": "https://your-domain.com/api/webtoons/64f8a1b2c3d4e5f6a7b8c9d0/panels/1",
  "metadata": {
    "width": 1200,
    "height": 800,
    "fileSize": 245760,
    "format": "jpeg",
    "aspectRatio": 1.5
  }
}
```

### 4. Script Generation Process

**AI Script Generation Pipeline:**
1. **Panel Analysis**: Each panel is analyzed using AI vision models
2. **Story Understanding**: AI comprehends the narrative flow
3. **Script Generation**: Creates engaging explanation with:
   - Hook (attention-grabbing opening)
   - Summary (brief overview)
   - Detailed explanation (panel-by-panel narration)
   - Ending (conclusion with call-to-action)

**Generated Script Structure:**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
  "webtoonId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "title": "My Awesome Webtoon - AI Explanation",
  "hook": "Have you ever wondered what happens when...",
  "summary": "This incredible webtoon takes us on a journey...",
  "detailedExplanation": "Let's break down this amazing story panel by panel...",
  "ending": "And that's why this webtoon is absolutely worth reading!",
  "scriptSegments": [
    {
      "panelId": "64f8a1b2c3d4e5f6a7b8c9d2",
      "panelNumber": 1,
      "narration": "In our first panel, we see...",
      "duration": 5.0,
      "startTime": 0.0,
      "endTime": 5.0
    }
  ],
  "characters": [
    {
      "name": "Hero",
      "description": "The main protagonist of our story",
      "appearances": [1, 2, 3, 4, 5]
    }
  ],
  "keyEvents": [
    {
      "event": "Hero discovers the secret",
      "panelNumbers": [3, 4],
      "importance": "high"
    }
  ],
  "emotions": [
    {
      "emotion": "excitement",
      "intensity": 8,
      "panelNumbers": [2, 3]
    }
  ],
  "metadata": {
    "totalDuration": 120.5,
    "wordCount": 850,
    "estimatedVideoLength": 125.0,
    "tone": "engaging",
    "style": "narrative"
  }
}
```

### 5. Video Generation Process

**Current Implementation:**
- Script generation is complete
- Voice synthesis is implemented
- Video rendering is planned for future enhancement

**Future Video Pipeline:**
1. **Panel Animation**: Create smooth transitions between panels
2. **Voice Synchronization**: Sync narration with panel timing
3. **Background Music**: Add appropriate background music
4. **Effects**: Add visual effects and transitions
5. **Final Render**: Export as MP4 video

## 🛠 API Endpoints

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/profile
```

### Webtoon Management
```http
GET    /api/webtoons                    # List user's webtoons
POST   /api/webtoons                    # Create new webtoon
GET    /api/webtoons/:id                # Get webtoon details
PUT    /api/webtoons/:id                # Update webtoon
DELETE /api/webtoons/:id                # Delete webtoon
```

### AI Webtoon Explainer
```http
POST /api/webtoon-explainer/upload              # Upload & start processing
GET  /api/webtoon-explainer/:id/status          # Check processing status
GET  /api/webtoon-explainer/:id/explanation     # Get generated explanation
POST /api/webtoon-explainer/:id/voice           # Generate voice explanation
GET  /api/webtoon-explainer/voice-samples       # Get available voice samples
GET  /api/webtoon-explainer/:id/recommended-voice # Get recommended voice
GET  /api/webtoon-explainer/:id/narration       # Generate narration script
```

## 📝 Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* Response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error information"
  }
}
```

### Processing Status Response
```json
{
  "success": true,
  "data": {
    "webtoonId": "64f8a1b2c3d4e5f6a7b8c9d0",
    "title": "My Awesome Webtoon",
    "processingStatus": "processing",
    "processingProgress": 75,
    "totalChapters": 5,
    "totalPanels": 48,
    "errorMessage": null,
    "generatedScript": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  }
}
```

## 🚨 Error Handling

### Common Error Codes
- `AUTH_REQUIRED`: Authentication token missing or invalid
- `PERMISSION_DENIED`: User doesn't have permission for the resource
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `VALIDATION_ERROR`: Request data validation failed
- `PROCESSING_ERROR`: Background processing failed
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `UNSUPPORTED_FORMAT`: File format not supported

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `413` - Payload Too Large
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## 🔧 Development

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/webtoon-explainer

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Ollama AI Service
OLLAMA_BASE_URL=http://localhost:11434

# File Upload
MAX_FILE_SIZE=500000000
UPLOAD_DIR=./uploads

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=webtoon-files

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Project Structure
```
src/
├── config/
│   ├── database.ts
│   ├── rabbitmq/
│   │   ├── consumers.ts
│   │   ├── producers.ts
│   │   └── constants.ts
│   └── logger.ts
├── controllers/
│   ├── authController.ts
│   ├── webtoonController.ts
│   └── webtoonExplainerController.ts
├── models/
│   ├── User.ts
│   ├── Webtoon.ts
│   ├── Chapter.ts
│   ├── Panel.ts
│   └── GeneratedScript.ts
├── routes/
│   ├── auth.ts
│   ├── webtoons.ts
│   └── webtoonExplainer.ts
├── services/
│   ├── OllamaService.ts
│   ├── VoiceSampleService.ts
│   └── ArchiveService.ts
├── middlewares/
│   ├── auth.ts
│   ├── upload.ts
│   └── errorHandler.ts
└── server.ts
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:5000/api-docs`
- **Health Check**: `http://localhost:5000/health`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the error messages for detailed information

---

**Note**: This API is designed to handle webtoon processing asynchronously. Upload operations return immediately with a processing status, and the actual processing happens in the background using RabbitMQ message queues.
