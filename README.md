# AI Webtoon Story Explainer

A production-grade MERN stack application for generating YouTube-style Webtoon/Manga explanation videos using AI voice cloning and automated video generation.

## 🚀 Features

### Core Features
- **Comic Archive Upload**: Support for `.cbz`, `.cbr`, and `.zip` formats
- **Automatic Chapter Detection**: Intelligently detects and organizes chapters
- **Panel Extraction**: Automatically extracts and sequences panels
- **AI Story Analysis**: Uses Ollama + Llama 3 for story understanding
- **Voice Cloning**: XTTS-v2 powered voice cloning from audio samples
- **Script Generation**: AI-generated YouTube-style narration scripts
- **Video Generation**: Remotion-based video composition with animations
- **Subtitle System**: Auto-generated karaoke-style subtitles
- **Background Music**: Categorized music library integration
- **Video Editor**: Drag-and-drop timeline editor
- **Export Options**: 1080p, 1440p, 4K in MP4/MOV formats

### Technical Features
- **Queue System**: BullMQ for async job processing
- **Storage**: MinIO (S3-compatible) for media files
- **Caching**: Redis for performance optimization
- **Message Queue**: RabbitMQ for inter-service communication
- **Authentication**: JWT-based auth with refresh tokens
- **Rate Limiting**: Redis-backed rate limiting
- **File Validation**: Comprehensive upload validation
- **Error Handling**: Centralized error management
- **Logging**: Winston-based structured logging
- **Docker Support**: Full containerization

## 📁 Project Structure

```
aivideo/
├── backend/                    # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/            # Database, Redis, MinIO, Logger
│   │   ├── models/            # Mongoose schemas
│   │   ├── controllers/       # Route controllers
│   │   ├── services/          # Business logic
│   │   ├── middlewares/       # Auth, validation, upload, rate limiting
│   │   ├── queues/            # BullMQ queue management
│   │   ├── workers/           # Background job processors
│   │   ├── utils/             # Helper functions
│   │   ├── types/             # TypeScript types
│   │   └── server.ts          # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux Toolkit store
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Helper functions
│   │   ├── types/             # TypeScript types
│   │   └── main.tsx           # Application entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml          # Multi-container orchestration
├── .env.example               # Environment variables template
├── package.json               # Root package.json
└── README.md                  # This file
```

## 🗄️ Database Models

### User
- Authentication and authorization
- Subscription management
- Usage tracking
- Preferences

### VoiceProfile
- Voice sample storage
- Embedding files
- Voice characteristics
- Usage statistics

### Webtoon
- Archive metadata
- Processing status
- Chapter organization
- Tags and genres

### Chapter
- Chapter information
- Panel count
- Folder paths
- Processing status

### Panel
- Image URLs
- Metadata (dimensions, format)
- AI analysis results
- Sequence information

### GeneratedScript
- Story summary
- Detailed narration
- Character information
- Key events and emotions
- Script segments with timing

### GeneratedVideo
- Video configuration
- Scene composition
- Audio settings
- Subtitle configuration
- Render status

### RenderJob
- Job type and status
- Progress tracking
- Error handling
- Retry logic

### Subtitle
- Segment information
- Word-level timing
- Style configuration
- Format support (SRT, VTT, ASS, JSON)

### MediaAsset
- File storage
- Asset categorization
- Usage tracking
- Storage provider info

## 🔧 Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB 7.0
- **Cache**: Redis 7.2
- **Queue**: BullMQ
- **Message Broker**: RabbitMQ 3.12
- **Storage**: MinIO (S3-compatible)
- **AI**: Ollama (Llama 3, LLaVA)
- **Voice**: XTTS-v2
- **Video**: FFmpeg
- **Image Processing**: Sharp

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **Data Fetching**: React Query
- **Routing**: React Router v6
- **UI Library**: Material-UI v5
- **Animations**: Framer Motion
- **Drag & Drop**: React Beautiful DnD

### Video Generation
- **Remotion**: React-based video composition
- **FFmpeg**: Video encoding and processing
- **React Player**: Video preview
- **Web Audio API**: Audio manipulation

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Web Server**: Nginx
- **Process Manager**: PM2 (optional)

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- 16GB+ RAM recommended
- GPU for Ollama (optional but recommended)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd aivideo
```

2. **Copy environment variables**
```bash
cp .env.example .env
```

3. **Configure environment variables**
Edit `.env` with your settings:
- Database credentials
- Redis password
- MinIO keys
- JWT secrets
- API endpoints

4. **Start services with Docker**
```bash
docker-compose up -d
```

This will start:
- MongoDB (port 27017)
- Redis (port 6379)
- RabbitMQ (port 5672, management 15672)
- MinIO (port 9000, console 9001)
- Ollama (port 11434)
- Backend API (port 5000)
- Frontend (port 3000)

5. **Install dependencies (for local development)**
```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

6. **Pull Ollama models**
```bash
docker exec -it webtoon-ollama ollama pull llama3.2:latest
docker exec -it webtoon-ollama ollama pull llava
```

### Development

**Backend**
```bash
cd backend
npm run dev
```

**Frontend**
```bash
cd frontend
npm run dev
```

**Workers**
```bash
cd backend
npm run worker
```

### Building for Production

```bash
# Build all
npm run build

# Build backend only
cd backend
npm run build

# Build frontend only
cd frontend
npm run build
```

### Docker Production Build

```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

## 📊 Queue System

### Queue Types

1. **upload-archive**: Handles archive file uploads
2. **extract-comic**: Extracts and processes comic archives
3. **process-panels**: Processes individual panels
4. **generate-script**: Generates AI narration scripts
5. **generate-voice**: Creates voice narration
6. **generate-subtitles**: Generates subtitle files
7. **generate-video**: Composes video scenes
8. **render-video**: Final video rendering

### Queue Flow

```
Upload Archive → Extract Comic → Process Panels → Generate Script
                                                        ↓
                                                  Generate Voice
                                                        ↓
                                                Generate Subtitles
                                                        ↓
                                                  Generate Video
                                                        ↓
                                                   Render Video
```

## 🎨 Video Animation Types

- **Zoom In**: Gradual zoom into panel
- **Zoom Out**: Gradual zoom out from panel
- **Pan Left/Right**: Horizontal camera movement
- **Character Focus**: Zoom to character
- **Camera Shake**: Action emphasis
- **Blur Transition**: Smooth scene transition
- **Fade Transition**: Fade in/out effects
- **Slide Transition**: Sliding animations
- **Motion Blur**: Dynamic movement effect
- **Ken Burns Effect**: Pan and zoom combination
- **Slow Motion**: Time manipulation
- **Flash Effects**: Quick visual emphasis

## 🔐 API Authentication

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Routes
Include JWT token in Authorization header:
```http
Authorization: Bearer <token>
```

## 📝 Environment Variables

See `.env.example` for all available environment variables.

### Critical Variables
- `MONGODB_URI`: MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: Authentication secrets
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: Storage credentials
- `OLLAMA_BASE_URL`: AI model server URL
- `XTTS_API_URL`: Voice cloning service URL

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Monitoring

### Service Health Checks

- **Backend**: http://localhost:5000/health
- **MongoDB**: Check connection in logs
- **Redis**: Check connection in logs
- **RabbitMQ Management**: http://localhost:15672
- **MinIO Console**: http://localhost:9001
- **Ollama**: http://localhost:11434/api/tags

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend

# Backend application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Input validation and sanitization
- File type and size validation
- CORS configuration
- Helmet security headers
- SQL injection prevention (NoSQL)
- XSS protection

## 🚀 Performance Optimization

- Redis caching
- Database indexing
- Connection pooling
- Gzip compression
- Image optimization with Sharp
- Lazy loading
- Code splitting
- CDN-ready architecture

## 📦 Deployment

### Production Checklist

- [ ] Set strong JWT secrets
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up backup strategy
- [ ] Configure monitoring (Sentry, etc.)
- [ ] Set up log aggregation
- [ ] Configure CDN for static assets
- [ ] Set up auto-scaling (if needed)
- [ ] Configure domain and DNS

### Deployment Platforms

- **Docker**: Use provided docker-compose.yml
- **Kubernetes**: Create K8s manifests
- **AWS**: EC2, ECS, or EKS
- **Google Cloud**: GKE or Compute Engine
- **Azure**: AKS or Virtual Machines
- **DigitalOcean**: Droplets or Kubernetes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Ollama for AI models
- XTTS-v2 for voice cloning
- Remotion for video generation
- Material-UI for UI components
- All open-source contributors

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Wiki]
- Email: support@example.com

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Real-time collaboration
- [ ] Advanced video effects
- [ ] Mobile app
- [ ] API rate limiting tiers
- [ ] Payment integration
- [ ] Analytics dashboard
- [ ] Social media integration
- [ ] Template library
- [ ] Batch processing

---

**Built with ❤️ for the manga and webtoon community**
