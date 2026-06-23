# Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
# Navigate to backend
cd backend
npm install

# Navigate to frontend
cd ../frontend
npm install
```

### Step 2: Start Docker Services

```bash
# From root directory
docker-compose up -d mongodb redis rabbitmq minio ollama
```

Wait for services to be ready (check with `docker-compose ps`)

### Step 3: Configure Environment

```bash
# Copy environment file
cp .env.example .env
```

The default values in `.env.example` are pre-configured for local development.

### Step 4: Pull AI Models

```bash
# Pull Ollama models (this may take a few minutes)
docker exec -it webtoon-ollama ollama pull llama3.2:latest
docker exec -it webtoon-ollama ollama pull llava
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Workers (Optional for testing):**
```bash
cd backend
npm run worker
```

### Step 6: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/health
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **RabbitMQ Management**: http://localhost:15672 (admin / admin123)

## 📋 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | - |
| Backend API | http://localhost:5000 | - |
| MongoDB | mongodb://localhost:27017 | admin / admin123 |
| Redis | localhost:6379 | redis123 |
| RabbitMQ | localhost:5672 | admin / admin123 |
| RabbitMQ UI | http://localhost:15672 | admin / admin123 |
| MinIO | http://localhost:9000 | minioadmin / minioadmin123 |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123 |
| Ollama | http://localhost:11434 | - |

## 🔧 Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Check what's using the port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                  # Mac/Linux

# Change ports in .env file
PORT=5001
```

### Docker Services Not Starting

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: This deletes data)
docker-compose down -v

# Restart
docker-compose up -d
```

### Ollama Models Not Loading

```bash
# Check Ollama is running
docker ps | grep ollama

# Check logs
docker logs webtoon-ollama

# Manually pull models
docker exec -it webtoon-ollama ollama pull llama3.2:latest
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
docker ps | grep mongodb

# Check logs
docker logs webtoon-mongodb

# Test connection
docker exec -it webtoon-mongodb mongosh -u admin -p admin123
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it webtoon-redis redis-cli -a redis123 ping
```

## 📦 Production Deployment

### Using Docker Compose

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Deployment

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist folder with nginx or any static server
```

## 🧪 Testing the Application

### 1. Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the returned token for authenticated requests.

### 3. Upload a Webtoon Archive

Use the frontend at http://localhost:3000 or use curl:

```bash
curl -X POST http://localhost:5000/api/webtoons/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "archive=@/path/to/your/comic.cbz" \
  -F "title=My Webtoon" \
  -F "description=Test webtoon"
```

## 📝 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit files in `backend/src` or `frontend/src`

### 3. Test Changes

```bash
# Backend
cd backend
npm run lint
npm test

# Frontend
cd frontend
npm run lint
npm test
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

## 🔍 Monitoring

### Check Service Health

```bash
# Backend health
curl http://localhost:5000/health

# Ollama health
curl http://localhost:11434/api/tags

# Redis health
docker exec -it webtoon-redis redis-cli -a redis123 ping
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Backend application logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
```

### Monitor Queue Jobs

Access RabbitMQ Management UI at http://localhost:15672

- Username: admin
- Password: admin123

## 🎯 Next Steps

1. **Customize the UI**: Edit files in `frontend/src/components`
2. **Add API Endpoints**: Create controllers in `backend/src/controllers`
3. **Modify Database Schema**: Edit models in `backend/src/models`
4. **Add Video Effects**: Extend Remotion compositions
5. **Configure Voice Cloning**: Set up XTTS-v2 service
6. **Add Background Music**: Upload music files to MinIO

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/docs/)
- [Ollama Documentation](https://ollama.ai/docs/)
- [Remotion Documentation](https://www.remotion.dev/)
- [Material-UI Documentation](https://mui.com/)

## 💡 Tips

1. **Use nodemon**: Backend auto-restarts on file changes
2. **Use Vite HMR**: Frontend hot-reloads instantly
3. **Check logs**: Always check logs when debugging
4. **Use Redis CLI**: Test cache operations directly
5. **Monitor queues**: Watch job processing in RabbitMQ UI
6. **Test with Postman**: Import API collection for testing

## ⚠️ Common Issues

### "Cannot find module" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Rebuild TypeScript
npm run build
```

### Docker disk space issues
```bash
# Clean up Docker
docker system prune -a
```

### Port conflicts
```bash
# Kill process on port (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port (Mac/Linux)
lsof -ti:5000 | xargs kill -9
```

## 🎉 Success!

If everything is working:
- ✅ Frontend loads at http://localhost:3000
- ✅ Backend responds at http://localhost:5000/health
- ✅ You can register and login
- ✅ You can upload a comic archive
- ✅ Jobs are processing in the queue

You're ready to start building amazing webtoon explanation videos! 🚀
