#!/bin/bash
echo "=== Starting Store Management VPS Deployment ==="

# Step 1: Detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Step 2: Build & Start Containers
echo "Building and starting Docker containers using $DOCKER_COMPOSE..."
$DOCKER_COMPOSE up -d --build

# Step 3: Wait for Ollama container to start
echo "Waiting for Ollama container..."
sleep 5

# Step 4: Pull Ollama AI Model
echo "Pulling AI Model (llama3.2)..."
docker exec store_management_ollama ollama pull llama3.2

echo "=== Deployment Complete! ==="
