#!/usr/bin/env bash

echo "Starting services described in scripts/docker-compose.yml"
docker compose -f ./scripts/docker-compose.yml up -d
