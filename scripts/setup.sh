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

# Install dependencies
docker pull redis
docker pull ghcr.io/lhoupert/scc:master
