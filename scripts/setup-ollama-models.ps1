# Ollama Model Setup Script for 20GB RAM System (Windows PowerShell)
# This script will download and configure AI models suitable for systems with 20GB RAM

Write-Host "🚀 Setting up Ollama models for 20GB RAM system..." -ForegroundColor Green

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

# Models to download (optimized for 20GB RAM)
$models = @(
    "llama3:8b",           # 8GB RAM, 4.7GB disk - Best for text generation
    "mistral:7b",          # 7GB RAM, 4.1GB disk - Fast and efficient
    "qwen2:7b",            # 7GB RAM, 4.1GB disk - Multilingual support
    "phi3:mini",           # 3.8GB RAM, 2.2GB disk - Lightweight for quick tasks
    "llava:7b",            # 8GB RAM, 4.5GB disk - Vision-language model
    "bakllava:1b"          # 2GB RAM, 1.2GB disk - Lightweight vision model
)

# Download models in order of priority
Write-Host "📥 Downloading AI models..." -ForegroundColor Cyan

# Priority 1: Text Generation Models
Write-Host "📝 Downloading text generation models..." -ForegroundColor Cyan
foreach ($model in @("llama3:8b", "mistral:7b", "qwen2:7b", "phi3:mini")) {
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

# Priority 2: Vision Models
Write-Host "👁️ Downloading vision models..." -ForegroundColor Cyan
foreach ($model in @("llava:7b", "bakllava:1b")) {
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

# Test text generation
Write-Host "Testing text generation with llama3:8b..." -ForegroundColor White
try {
    $response = ollama run llama3:8b "Hello, how are you?" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Text generation test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Text generation test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Text generation test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test vision model
Write-Host "Testing vision model with llava:7b..." -ForegroundColor White
try {
    $response = ollama run llava:7b "Hello" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Vision model test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Vision model test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Vision model test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Ollama model setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Model Summary:" -ForegroundColor Cyan
Write-Host "  - llama3:8b: Best for text generation and storytelling" -ForegroundColor White
Write-Host "  - mistral:7b: Fast and efficient for general text tasks" -ForegroundColor White
Write-Host "  - qwen2:7b: Multilingual support" -ForegroundColor White
Write-Host "  - phi3:mini: Lightweight for quick tasks" -ForegroundColor White
Write-Host "  - llava:7b: Vision-language model for image analysis" -ForegroundColor White
Write-Host "  - bakllava:1b: Lightweight vision model" -ForegroundColor White
Write-Host ""
Write-Host "💡 Usage Tips:" -ForegroundColor Yellow
Write-Host "  - Use llama3:8b for complex story generation" -ForegroundColor White
Write-Host "  - Use phi3:mini for quick responses" -ForegroundColor White
Write-Host "  - Use llava:7b for webtoon panel analysis" -ForegroundColor White
Write-Host "  - Use bakllava:1b for quick image descriptions" -ForegroundColor White
Write-Host ""
Write-Host "🏗️  Memory Usage:" -ForegroundColor Yellow
Write-Host "  - Total estimated RAM usage: 27.8GB (but models are loaded on-demand)" -ForegroundColor White
Write-Host "  - Recommended to run 1-2 models simultaneously" -ForegroundColor White
Write-Host "  - Use model unloading when not in use" -ForegroundColor White
Write-Host ""

# Create model configuration file for the application
Write-Host "📄 Creating model configuration..." -ForegroundColor Yellow
$configPath = "$env:TEMP\ollama-config.json"
$config = @{
    available_models = @{
        text_generation = @("llama3:8b", "mistral:7b", "qwen2:7b", "phi3:mini")
        vision = @("llava:7b", "bakllava:1b")
        quick_tasks = @("phi3:mini", "bakllava:1b")
        complex_tasks = @("llama3:8b", "mistral:7b", "llava:7b")
    }
    default_models = @{
        story_generation = "llama3:8b"
        dialogue = "mistral:7b"
        panel_analysis = "llava:7b"
        quick_response = "phi3:mini"
    }
    resource_limits = @{
        max_concurrent_models = 2
        memory_threshold_gb = 16
        auto_unload_timeout_minutes = 5
    }
}

try {
    $config | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding utf8
    Write-Host "✅ Model configuration saved to $configPath" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to save configuration: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Your AI models are ready to use!" -ForegroundColor Green
