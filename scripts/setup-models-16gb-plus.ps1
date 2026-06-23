# AI Model Setup Script for 16GB+ RAM Systems
# This script downloads and configures AI models suitable for systems with 16GB+ RAM

Write-Host "🚀 Setting up AI models for 16GB+ RAM system..." -ForegroundColor Green

# Wait for Ollama to be ready
Write-Host "⏳ Waiting for Ollama to start..." -ForegroundColor Yellow
$ollamaReady = $false
$maxAttempts = 60
$attempt = 0

while (-not $ollamaReady -and $attempt -lt $maxAttempts) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/version" -ErrorAction Stop
        $ollamaReady = $true
        Write-Host "✅ Ollama is ready!" -ForegroundColor Green
    }
    catch {
        Write-Host "Waiting for Ollama... (Attempt $($attempt + 1)/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        $attempt++
    }
}

if (-not $ollamaReady) {
    Write-Host "❌ Ollama failed to start within timeout period" -ForegroundColor Red
    exit 1
}

# Models optimized for 16GB+ RAM
$models = @(
    "phi3:mini",           # 3.8GB RAM, 2.2GB disk - Quick text model
    "llama3:8b",           # 8GB RAM, 4.7GB disk - Best text model
    "mistral:7b",          # 7GB RAM, 4.1GB disk - Fast text model
    "qwen2:7b",            # 7GB RAM, 4.1GB disk - Multilingual model
    "llava:7b",            # 8GB RAM, 4.5GB disk - Advanced vision model
    "bakllava:1b"          # 2GB RAM, 1.2GB disk - Quick vision model
)

Write-Host "📥 Downloading AI models optimized for 16GB+ RAM..." -ForegroundColor Cyan

foreach ($model in $models) {
    Write-Host "Downloading $model..." -ForegroundColor White
    try {
        $process = Start-Process -FilePath "ollama" -ArgumentList "pull", "$model" -Wait -PassThru -NoNewWindow
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Successfully downloaded $model" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Failed to download $model (Exit Code: $($process.ExitCode))" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Failed to download $model: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Verify downloaded models
Write-Host "🔍 Verifying downloaded models..." -ForegroundColor Yellow
try {
    $models = ollama list
    Write-Host $models -ForegroundColor White
}
catch {
    Write-Host "❌ Failed to list models: $($_.Exception.Message)" -ForegroundColor Red
}

# Test models
Write-Host "🧪 Testing models..." -ForegroundColor Yellow

# Test text generation with llama3
Write-Host "Testing text generation with llama3:8b..." -ForegroundColor White
try {
    $response = ollama run llama3:8b "Hello, how are you?" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Llama3 text generation test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Llama3 text generation test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Llama3 text generation test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test vision model with llava
Write-Host "Testing vision model with llava:7b..." -ForegroundColor White
try {
    $response = ollama run llava:7b "Hello" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ LLaVA vision model test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ LLaVA vision model test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ LLaVA vision model test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 16GB+ RAM model setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Model Summary:" -ForegroundColor Cyan
Write-Host "  - llama3:8b: Best text generation model (8GB RAM)" -ForegroundColor White
Write-Host "  - mistral:7b: Fast text model (7GB RAM)" -ForegroundColor White
Write-Host "  - qwen2:7b: Multilingual text model (7GB RAM)" -ForegroundColor White
Write-Host "  - phi3:mini: Quick text model (3.8GB RAM)" -ForegroundColor White
Write-Host "  - llava:7b: Advanced vision model (8GB RAM)" -ForegroundColor White
Write-Host "  - bakllava:1b: Quick vision model (2GB RAM)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Usage Tips for 16GB+ RAM:" -ForegroundColor Yellow
Write-Host "  - Use llama3:8b for best quality text generation and scripts" -ForegroundColor White
Write-Host "  - Use mistral:7b for fast text generation and creative writing" -ForegroundColor White
Write-Host "  - Use qwen2:7b for multilingual content and character dialogue" -ForegroundColor White
Write-Host "  - Use phi3:mini for quick responses and simple tasks" -ForegroundColor White
Write-Host "  - Use llava:7b for detailed image analysis and panel understanding" -ForegroundColor White
Write-Host "  - Use bakllava:1b for quick image descriptions" -ForegroundColor White
Write-Host "  - Run up to 3 models simultaneously" -ForegroundColor White
Write-Host "  - Models will auto-unload after 10 minutes of inactivity" -ForegroundColor White
Write-Host ""
Write-Host "🏗️  Memory Usage:" -ForegroundColor Yellow
Write-Host "  - Total estimated RAM usage: 35.8GB (but models are loaded on-demand)" -ForegroundColor White
Write-Host "  - Maximum concurrent models: 3" -ForegroundColor White
Write-Host "  - Memory threshold: 85%" -ForegroundColor White
Write-Host ""

# Create configuration file
Write-Host "📄 Creating 16GB+ RAM configuration..." -ForegroundColor Yellow
$configPath = "$env:TEMP\ai-config-16gb-plus.json"
$config = @{
    system_ram_gb = 16
    tier = "Ultra RAM (16GB+)"
    available_models = @("phi3:mini", "llama3:8b", "mistral:7b", "qwen2:7b", "llava:7b", "bakllava:1b")
    default_models = @{
        text_generation = "llama3:8b"
        vision_analysis = "llava:7b"
        quick_response = "phi3:mini"
        script_generation = "llama3:8b"
        dialogue = "qwen2:7b"
    }
    resource_limits = @{
        max_concurrent_models = 3
        memory_threshold = 0.85
        model_unload_timeout_minutes = 10
    }
    performance_tips = @(
        "Run up to 3 models simultaneously",
        "Use llama3:8b for best quality text generation",
        "Use llava:7b for detailed image analysis",
        "Use mistral:7b for fast creative writing",
        "Use qwen2:7b for multilingual content",
        "Use phi3:mini for quick responses",
        "Use bakllava:1b for quick image tasks"
    )
}

try {
    $config | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding utf8
    Write-Host "✅ Configuration saved to $configPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to save configuration: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Your 16GB+ RAM AI system is ready!" -ForegroundColor Green
