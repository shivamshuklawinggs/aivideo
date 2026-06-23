# AI Model Setup Script for 4GB RAM Systems
# This script downloads and configures lightweight AI models suitable for systems with 4GB RAM

Write-Host "🚀 Setting up AI models for 4GB RAM system..." -ForegroundColor Green

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

# Models optimized for 4GB RAM
$models = @(
    "phi3:mini",           # 3.8GB RAM, 2.2GB disk - Main text model
    "bakllava:1b",         # 2GB RAM, 1.2GB disk - Vision model
    "all-minilm"           # 0.5GB RAM, 0.4GB disk - Embedding model (local)
)

Write-Host "📥 Downloading AI models optimized for 4GB RAM..." -ForegroundColor Cyan

foreach ($model in $models) {
    if ($model -eq "all-minilm") {
        Write-Host "⚠️ Skipping $model (will be installed locally)" -ForegroundColor Yellow
        continue
    }
    
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
Write-Host "Testing text generation with phi3:mini..." -ForegroundColor White
try {
    $response = ollama run phi3:mini "Hello, how are you?" 2>$null
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
Write-Host "🎉 4GB RAM model setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Model Summary:" -ForegroundColor Cyan
Write-Host "  - phi3:mini: Main text generation model (3.8GB RAM)" -ForegroundColor White
Write-Host "  - bakllava:1b: Lightweight vision model (2GB RAM)" -ForegroundColor White
Write-Host "  - all-minilm: Embedding model (0.5GB RAM, local)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Usage Tips for 4GB RAM:" -ForegroundColor Yellow
Write-Host "  - Use phi3:mini for all text generation tasks" -ForegroundColor White
Write-Host "  - Use bakllava:1b for quick image analysis" -ForegroundColor White
Write-Host "  - Run only 1 model at a time to avoid memory issues" -ForegroundColor White
Write-Host "  - Models will auto-unload after 3 minutes of inactivity" -ForegroundColor White
Write-Host ""
Write-Host "🏗️  Memory Usage:" -ForegroundColor Yellow
Write-Host "  - Total estimated RAM usage: 6.3GB (but models are loaded on-demand)" -ForegroundColor White
Write-Host "  - Maximum concurrent models: 1" -ForegroundColor White
Write-Host "  - Memory threshold: 80%" -ForegroundColor White
Write-Host ""

# Create configuration file
Write-Host "📄 Creating 4GB RAM configuration..." -ForegroundColor Yellow
$configPath = "$env:TEMP\ai-config-4gb.json"
$config = @{
    system_ram_gb = 4
    tier = "Low RAM (≤4GB)"
    available_models = @("phi3:mini", "bakllava:1b")
    default_models = @{
        text_generation = "phi3:mini"
        vision_analysis = "bakllava:1b"
        quick_response = "phi3:mini"
        script_generation = "phi3:mini"
        dialogue = "phi3:mini"
    }
    resource_limits = @{
        max_concurrent_models = 1
        memory_threshold = 0.8
        model_unload_timeout_minutes = 3
    }
    performance_tips = @(
        "Run only 1 model at a time",
        "Use phi3:mini for all text tasks",
        "Use bakllava:1b for quick image analysis",
        "Monitor memory usage closely"
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
Write-Host "🚀 Your 4GB RAM AI system is ready!" -ForegroundColor Green
