#!/usr/bin/env bash

echo "Stopping services..."
docker compose -f ./scripts/docker-compose.yml stop

# prune all stopped containers, if the optional argument -p is provided, all containers will be removed
if [ "$1" == "-p" ]; then
    docker compose -f ./scripts/docker-compose.yml rm -f -v
fi
