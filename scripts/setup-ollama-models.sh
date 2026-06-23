#!/bin/bash

# Ollama Model Setup Script for 20GB RAM System
# This script will download and configure AI models suitable for systems with 20GB RAM

echo "🚀 Setting up Ollama models for 20GB RAM system..."

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
until curl -s http://localhost:11434/api/version > /dev/null; do
    echo "Waiting for Ollama..."
    sleep 5
done
echo "✅ Ollama is ready!"

# Models to download (optimized for 20GB RAM)
MODELS=(
    "llama3:8b"           # 8GB RAM, 4.7GB disk - Best for text generation
    "mistral:7b"          # 7GB RAM, 4.1GB disk - Fast and efficient
    "qwen2:7b"            # 7GB RAM, 4.1GB disk - Multilingual support
    "phi3:mini"           # 3.8GB RAM, 2.2GB disk - Lightweight for quick tasks
    "llava:7b"            # 8GB RAM, 4.5GB disk - Vision-language model
    "bakllava:1b"         # 2GB RAM, 1.2GB disk - Lightweight vision model
)

# Download models in order of priority
echo "📥 Downloading AI models..."

# Priority 1: Text Generation Models
echo "📝 Downloading text generation models..."
for model in "llama3:8b" "mistral:7b" "qwen2:7b" "phi3:mini"; do
    echo "Downloading $model..."
    ollama pull "$model"
    if [ $? -eq 0 ]; then
        echo "✅ Successfully downloaded $model"
    else
        echo "❌ Failed to download $model"
    fi
    echo ""
done

# Priority 2: Vision Models
echo "👁️ Downloading vision models..."
for model in "llava:7b" "bakllava:1b"; do
    echo "Downloading $model..."
    ollama pull "$model"
    if [ $? -eq 0 ]; then
        echo "✅ Successfully downloaded $model"
    else
        echo "❌ Failed to download $model"
    fi
    echo ""
done

# Verify downloaded models
echo "🔍 Verifying downloaded models..."
ollama list

# Test models
echo "🧪 Testing models..."

# Test text generation
echo "Testing text generation with llama3:8b..."
response=$(ollama run llama3:8b "Hello, how are you?" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Text generation test passed"
else
    echo "❌ Text generation test failed"
fi

# Test vision model
echo "Testing vision model with llava:7b..."
# Note: Vision models require image input, so we'll just check if the model loads
ollama run llava:7b "Hello" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Vision model test passed"
else
    echo "❌ Vision model test failed"
fi

echo ""
echo "🎉 Ollama model setup completed!"
echo ""
echo "📊 Model Summary:"
echo "  - llama3:8b: Best for text generation and storytelling"
echo "  - mistral:7b: Fast and efficient for general text tasks"
echo "  - qwen2:7b: Multilingual support"
echo "  - phi3:mini: Lightweight for quick tasks"
echo "  - llava:7b: Vision-language model for image analysis"
echo "  - bakllava:1b: Lightweight vision model"
echo ""
echo "💡 Usage Tips:"
echo "  - Use llama3:8b for complex story generation"
echo "  - Use phi3:mini for quick responses"
echo "  - Use llava:7b for webtoon panel analysis"
echo "  - Use bakllava:1b for quick image descriptions"
echo ""
echo "🏗️  Memory Usage:"
echo "  - Total estimated RAM usage: 27.8GB (but models are loaded on-demand)"
echo "  - Recommended to run 1-2 models simultaneously"
echo "  - Use model unloading when not in use"
echo ""

# Create model configuration file for the application
echo "📄 Creating model configuration..."
cat > /tmp/ollama-config.json << EOF
{
  "available_models": {
    "text_generation": ["llama3:8b", "mistral:7b", "qwen2:7b", "phi3:mini"],
    "vision": ["llava:7b", "bakllava:1b"],
    "quick_tasks": ["phi3:mini", "bakllava:1b"],
    "complex_tasks": ["llama3:8b", "mistral:7b", "llava:7b"]
  },
  "default_models": {
    "story_generation": "llama3:8b",
    "dialogue": "mistral:7b",
    "panel_analysis": "llava:7b",
    "quick_response": "phi3:mini"
  },
  "resource_limits": {
    "max_concurrent_models": 2,
    "memory_threshold_gb": 16,
    "auto_unload_timeout_minutes": 5
  }
}
EOF

echo "✅ Model configuration saved to /tmp/ollama-config.json"
echo ""
echo "🚀 Your AI models are ready to use!"
