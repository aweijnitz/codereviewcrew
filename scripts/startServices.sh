#!/usr/bin/env bash

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

echo "Starting services..."

docker run --rm -d  -p ${REDIS_HOST}:${REDIS_PORT}:${REDIS_PORT} -v `pwd`/data/redis/conf:/usr/local/etc/redis --name myredis redis redis-server  /usr/local/etc/redis/redis.conf

# Wait for Redis to start
sleep 5

echo "Checking if Redis is running..."

# Check if Redis is running
if [ -z "$(docker ps | grep myredis)" ]; then
    echo "Redis failed to start"
    exit 1
fi

if ! nc -z localhost ${REDIS_PORT}; then
    echo "Redis is not listening on localhost:${REDIS_PORT}"
    exit 1
fi
