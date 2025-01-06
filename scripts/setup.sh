#!/usr/bin/env bash

echo "Setting up the environment... pulling docker images"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install docker."
    exit 1
fi

# Check if docker is running
if ! docker info &> /dev/null; then
    echo "Docker is not running. Please start docker."
    exit 1
fi

# Check if ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama is not installed. Please install ollama."
    exit 1
fi

# Check if ollama is running (assuming ollama has a similar status check command)
if ! ollama -v &> /dev/null; then
    echo "Ollama is not running. Please start ollama."
    exit 1
fi

# Install dependencies
echo "Pulling docker images..."
docker pull redis
docker pull ghcr.io/lhoupert/scc:master
docker pull ejhayes/nodejs-bull-monitor:latest

echo "------------------------"
echo "Pulling ollama models..."
ollama pull nemotron-mini
ollama pull qwen2.5-coder:7b
ollama pull falcon
ollama pull llama3.2