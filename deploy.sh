#!/bin/bash
echo "=== Starting Store Management VPS Deployment ==="

# Step 1: Build & Start Containers
echo "Building and starting Docker containers..."
docker-compose up -d --build

# Step 2: Pull Ollama AI Model
echo "Pulling AI Model (llama3.2)..."
docker exec -it store_management_ollama ollama pull llama3.2

echo "=== Deployment Complete! ==="
echo "Access your app at: http://<YOUR-SERVER-IP>:8080"
