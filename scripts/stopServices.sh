#!/usr/bin/env bash

echo "Stopping services..."

# Stop the Redis container
docker stop myredis


# prune all stopped containers, if the optional argument -p is provided, all containers will be removed
if [ "$1" == "-p" ]; then
    docker container prune -f
fi

