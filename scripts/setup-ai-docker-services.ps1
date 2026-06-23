# Setup AI Docker Services Script
# This script sets up Docker-based AI services for local development

Write-Host "🚀 Setting up AI Docker Services..." -ForegroundColor Green

# Check if Docker is running
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is running: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating directories for AI services..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "local-models" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts\cohere-mock" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts\embedding-service" | Out-Null
New-Item -ItemType Directory -Force -Path "scripts\xtts-service" | Out-Null

# Create Cohere mock service
Write-Host "📝 Creating Cohere mock service..." -ForegroundColor Yellow
@"
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

@app.route('/v1/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '')
    
    # Simple mock response
    response = {
        'generations': [{
            'text': f'Mock Cohere response to: {prompt[:100]}...'
        }]
    }
    
    return jsonify(response)

@app.route('/v1/embed', methods=['POST'])
def embed():
    data = request.json
    texts = data.get('texts', [])
    
    # Simple mock embedding (random values)
    response = {
        'embeddings': [[0.1] * 768 for _ in texts]
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=15001, debug=True)
"@ | Out-File -FilePath "scripts\cohere-mock\app.py" -Encoding utf8

# Create requirements.txt for Cohere mock
@"
Flask==2.3.3
"@ | Out-File -FilePath "scripts\cohere-mock\requirements.txt" -Encoding utf8

# Create embedding service
Write-Host "📝 Creating embedding service..." -ForegroundColor Yellow
@"
from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

@app.route('/embed', methods=['POST'])
def embed():
    data = request.json
    texts = data.get('texts', [])
    
    # Simple mock embedding (random values)
    embeddings = []
    for text in texts:
        # Generate random 768-dimensional embedding
        embedding = np.random.random(768).tolist()
        embeddings.append(embedding)
    
    response = {
        'embeddings': embeddings
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=15002, debug=True)
"@ | Out-File -FilePath "scripts\embedding-service\app.py" -Encoding utf8

# Create requirements.txt for embedding service
@"
Flask==2.3.3
numpy==1.24.3
"@ | Out-File -FilePath "scripts\embedding-service\requirements.txt" -Encoding utf8

# Create XTTS service
Write-Host "📝 Creating XTTS service..." -ForegroundColor Yellow
@"
from flask import Flask, request, jsonify
import os
import base64

app = Flask(__name__)

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data.get('text', '')
    voice = data.get('voice', 'default')
    
    # Mock audio response (base64 encoded silence)
    mock_audio = base64.b64encode(b'\x00' * 1000).decode('utf-8')
    
    response = {
        'audio_data': mock_audio,
        'format': 'wav',
        'sample_rate': 22050
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8002, debug=True)
"@ | Out-File -FilePath "scripts\xtts-service\app.py" -Encoding utf8

# Create requirements.txt for XTTS service
@"
Flask==2.3.3
"@ | Out-File -FilePath "scripts\xtts-service\requirements.txt" -Encoding utf8

# Start AI services
Write-Host "🚀 Starting AI Docker services..." -ForegroundColor Yellow
Write-Host "This will start: Ollama, HuggingFace Inference, and mock services" -ForegroundColor Cyan

# Start Docker services
docker-compose -f docker-compose.ai-services.yml up -d

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow

# Check Ollama
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 5
    Write-Host "✅ Ollama is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama is not responding" -ForegroundColor Red
}

# Check HuggingFace
try {
    $hfResponse = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5
    Write-Host "✅ HuggingFace Inference is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  HuggingFace Inference may not be running (this is optional)" -ForegroundColor Yellow
}

# Check Cohere mock
try {
    $cohereResponse = Invoke-RestMethod -Uri "http://localhost:15001/v1/embed" -Method POST -Body '{"texts": ["test"]}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Cohere mock service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Cohere mock service is not responding" -ForegroundColor Red
}

# Check embedding service
try {
    $embedResponse = Invoke-RestMethod -Uri "http://localhost:15002/embed" -Method POST -Body '{"texts": ["test"]}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ Embedding service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Embedding service is not responding" -ForegroundColor Red
}

# Check XTTS service
try {
    $ttsResponse = Invoke-RestMethod -Uri "http://localhost:8002/tts" -Method POST -Body '{"text": "test"}' -ContentType "application/json" -TimeoutSec 5
    Write-Host "✅ XTTS service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ XTTS service is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 AI Docker Services Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "  - Ollama: http://localhost:11434" -ForegroundColor White
Write-Host "  - HuggingFace: http://localhost:8080" -ForegroundColor White
Write-Host "  - Cohere Mock: http://localhost:15001" -ForegroundColor White
Write-Host "  - Embedding Service: http://localhost:15002" -ForegroundColor White
Write-Host "  - XTTS Service: http://localhost:8002" -ForegroundColor White
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install Ollama models: docker exec -it ollama ollama pull phi3:mini" -ForegroundColor White
Write-Host "  2. Test the backend: npm run dev" -ForegroundColor White
Write-Host "  3. Check AI service health: curl http://localhost:5000/api/models/system" -ForegroundColor White
Write-Host ""
Write-Host "🔧 To stop services: docker-compose -f docker-compose.ai-services.yml down" -ForegroundColor Gray
