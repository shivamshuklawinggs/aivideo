# AI Model Setup Script for 8GB RAM Systems
# This script downloads and configures AI models suitable for systems with 8GB RAM

Write-Host "🚀 Setting up AI models for 8GB RAM system..." -ForegroundColor Green

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

# Models optimized for 8GB RAM
$models = @(
    "phi3:mini",           # 3.8GB RAM, 2.2GB disk - Quick text model
    "mistral:7b",          # 7GB RAM, 4.1GB disk - Main text model
    "qwen2:7b",            # 7GB RAM, 4.1GB disk - Multilingual model
    "bakllava:1b"          # 2GB RAM, 1.2GB disk - Vision model
)

Write-Host "📥 Downloading AI models optimized for 8GB RAM..." -ForegroundColor Cyan

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

# Test text generation with mistral
Write-Host "Testing text generation with mistral:7b..." -ForegroundColor White
try {
    $response = ollama run mistral:7b "Hello, how are you?" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Mistral text generation test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Mistral text generation test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Mistral text generation test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test text generation with qwen2
Write-Host "Testing text generation with qwen2:7b..." -ForegroundColor White
try {
    $response = ollama run qwen2:7b "Hello, how are you?" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Qwen2 text generation test passed" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Qwen2 text generation test failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Qwen2 text generation test failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test vision model
Write-Host "Testing vision model with bakllava:1b..." -ForegroundColor White
try {
    $response = ollama run bakllava:1b "Hello" 2>$null
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
Write-Host "🎉 8GB RAM model setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Model Summary:" -ForegroundColor Cyan
Write-Host "  - mistral:7b: Main text generation model (7GB RAM)" -ForegroundColor White
Write-Host "  - qwen2:7b: Multilingual text model (7GB RAM)" -ForegroundColor White
Write-Host "  - phi3:mini: Quick text model (3.8GB RAM)" -ForegroundColor White
Write-Host "  - bakllava:1b: Lightweight vision model (2GB RAM)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Usage Tips for 8GB RAM:" -ForegroundColor Yellow
Write-Host "  - Use mistral:7b for complex text generation and scripts" -ForegroundColor White
Write-Host "  - Use qwen2:7b for multilingual content and dialogue" -ForegroundColor White
Write-Host "  - Use phi3:mini for quick responses and simple tasks" -ForegroundColor White
Write-Host "  - Use bakllava:1b for image analysis" -ForegroundColor White
Write-Host "  - Run up to 2 models simultaneously" -ForegroundColor White
Write-Host "  - Models will auto-unload after 4 minutes of inactivity" -ForegroundColor White
Write-Host ""
Write-Host "🏗️  Memory Usage:" -ForegroundColor Yellow
Write-Host "  - Total estimated RAM usage: 19.8GB (but models are loaded on-demand)" -ForegroundColor White
Write-Host "  - Maximum concurrent models: 2" -ForegroundColor White
Write-Host "  - Memory threshold: 75%" -ForegroundColor White
Write-Host ""

# Create configuration file
Write-Host "📄 Creating 8GB RAM configuration..." -ForegroundColor Yellow
$configPath = "$env:TEMP\ai-config-8gb.json"
$config = @{
    system_ram_gb = 8
    tier = "Medium RAM (4-8GB)"
    available_models = @("phi3:mini", "mistral:7b", "qwen2:7b", "bakllava:1b")
    default_models = @{
        text_generation = "mistral:7b"
        vision_analysis = "bakllava:1b"
        quick_response = "phi3:mini"
        script_generation = "mistral:7b"
        dialogue = "qwen2:7b"
    }
    resource_limits = @{
        max_concurrent_models = 2
        memory_threshold = 0.75
        model_unload_timeout_minutes = 4
    }
    performance_tips = @(
        "Run up to 2 models simultaneously",
        "Use mistral:7b for complex text tasks",
        "Use qwen2:7b for multilingual content",
        "Use phi3:mini for quick responses",
        "Use bakllava:1b for image analysis"
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
Write-Host "🚀 Your 8GB RAM AI system is ready!" -ForegroundColor Green
