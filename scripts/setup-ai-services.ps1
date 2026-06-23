# AI Services Setup Script for Windows PowerShell
# This script sets up all necessary services for the AI Webtoon Story Explainer

Write-Host "🚀 Setting up AI Services for Webtoon Story Explainer..." -ForegroundColor Green

# Check if Docker is running
Write-Host "🐳 Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker is running" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Docker is not installed or not running. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Navigate to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot
Write-Host "📁 Working directory: $projectRoot" -ForegroundColor Cyan

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Build and start services
Write-Host "🔨 Building and starting Docker services..." -ForegroundColor Yellow
docker-compose up -d --build

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
$services = @("redis:6379", "rabbitmq:5672", "ollama:11434", "minio:9000")
$maxWaitTime = 300  # 5 minutes
$startTime = Get-Date

foreach ($service in $services) {
    $serviceReady = $false
    $serviceHost, $servicePort = $service.Split(':')
    
    while (-not $serviceReady -and ((Get-Date) - $startTime).TotalSeconds -lt $maxWaitTime) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $tcpClient.Connect($serviceHost, [int]$servicePort)
            $serviceReady = $true
            $tcpClient.Close()
            Write-Host "✅ $service is ready" -ForegroundColor Green
        }
        catch {
            Write-Host "Waiting for $service..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
    
    if (-not $serviceReady) {
        Write-Host "❌ $service failed to start within timeout" -ForegroundColor Red
    }
}

# Setup Redis
Write-Host "📦 Setting up Redis..." -ForegroundColor Yellow
try {
    $redisTest = docker exec webtoon-redis redis-cli ping
    if ($redisTest -match "PONG") {
        Write-Host "✅ Redis is working" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Redis test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed to test Redis" -ForegroundColor Red
}

# Setup RabbitMQ
Write-Host "🐰 Setting up RabbitMQ..." -ForegroundColor Yellow
try {
    $rabbitmqTest = docker exec webtoon-rabbitmq rabbitmqctl status
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ RabbitMQ is working" -ForegroundColor Green
    }
    else {
        Write-Host "❌ RabbitMQ test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed to test RabbitMQ" -ForegroundColor Red
}

# Setup Ollama models
Write-Host "🤖 Setting up Ollama models..." -ForegroundColor Yellow
$ollamaSetupScript = Join-Path $projectRoot "scripts\setup-ollama-models.ps1"
if (Test-Path $ollamaSetupScript) {
    Write-Host "Running Ollama model setup script..." -ForegroundColor Cyan
    & $ollamaSetupScript
}
else {
    Write-Host "⚠️ Ollama setup script not found. Please run it manually." -ForegroundColor Yellow
}

# Setup MinIO
Write-Host "🪣 Setting up MinIO..." -ForegroundColor Yellow
try {
    $minioTest = docker exec webtoon-minio mc alias set local http://localhost:9000 minioadmin minioadmin123
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MinIO is working" -ForegroundColor Green
        
        # Create buckets
        $buckets = @("webtoons", "videos", "voice-samples", "temp")
        foreach ($bucket in $buckets) {
            docker exec webtoon-minio mc mb local/$bucket 2>$null
            Write-Host "📁 Created bucket: $bucket" -ForegroundColor Cyan
        }
    }
    else {
        Write-Host "❌ MinIO test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed to setup MinIO" -ForegroundColor Red
}

# Install Node.js dependencies
Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "backend")
npm install

# Install Python dependencies if needed
if (Test-Path "requirements.txt") {
    Write-Host "🐍 Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Create environment files if they don't exist
Write-Host "⚙️ Setting up environment files..." -ForegroundColor Yellow

$envFile = Join-Path $projectRoot "backend\.env"
if (-not (Test-Path $envFile)) {
    @"
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/webtoon_explainer
REDIS_URL=redis://localhost:6379

# AI Services Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:8b
OLLAMA_VISION_MODEL=llava:7b

# Message Queue Configuration
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/webtoon

# Object Storage Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=webtoons

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# AI Model Configuration
MAX_CONCURRENT_MODELS=2
MODEL_UNLOAD_TIMEOUT=300000
MEMORY_THRESHOLD_GB=16

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log
"@ | Out-File -FilePath $envFile -Encoding utf8
    Write-Host "✅ Created .env file" -ForegroundColor Green
}

# Create logs directory
$logsDir = Join-Path $projectRoot "backend\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force
    Write-Host "📁 Created logs directory" -ForegroundColor Green
}

# Test backend API
Write-Host "🔍 Testing backend API..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "backend")
try {
    # Start the backend server in background
    $serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
    
    # Wait for server to start
    Start-Sleep -Seconds 10
    
    # Test health endpoint
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5
        if ($response.success) {
            Write-Host "✅ Backend API is working" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️ Backend API test failed, but this might be normal if the server is still starting" -ForegroundColor Yellow
    }
    
    # Stop the test server
    $serverProcess | Stop-Process -Force
}
catch {
    Write-Host "❌ Failed to start backend server" -ForegroundColor Red
}

# Display service URLs
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "  API Documentation: http://localhost:5000/api-docs" -ForegroundColor White
Write-Host "  MinIO Console: http://localhost:9001" -ForegroundColor White
Write-Host "  RabbitMQ Management: http://localhost:15672" -ForegroundColor White
Write-Host "  Ollama API: http://localhost:11434" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Default Credentials:" -ForegroundColor Cyan
Write-Host "  MinIO: minioadmin / minioadmin123" -ForegroundColor White
Write-Host "  RabbitMQ: admin / admin123" -ForegroundColor White
Write-Host ""

Write-Host "🎉 AI Services setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start the backend server: cd backend && npm run dev" -ForegroundColor White
Write-Host "  2. Start the frontend server (if applicable)" -ForegroundColor White
Write-Host "  3. Test the API endpoints" -ForegroundColor White
Write-Host "  4. Check the API documentation at /api-docs" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Use llama3:8b for complex text generation" -ForegroundColor White
Write-Host "  - Use phi3:mini for quick responses" -ForegroundColor White
Write-Host "  - Use llava:7b for image analysis" -ForegroundColor White
Write-Host "  - Monitor resource usage with docker stats" -ForegroundColor White
Write-Host "  - Check logs with docker-compose logs -f [service-name]" -ForegroundColor White
