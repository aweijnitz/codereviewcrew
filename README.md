# Basic Agentic Code Review Service

## Token Consumption Warning

This service was developed using a self-hosted Ollama instance.
For paid LLM services, it might consume a non-trivial amount of tokens and __incur non-trivial costs__.

## Requirements

- Node.js (project developed on v21)
- Docker
- Ollama (local or accessible via URL endpoint)

Developed on MacOSX (Intel Mac). Should work on *nix too without modifications.

## Installation and setup

> mv .env_example .env            # Edit and update to match your local 
> ./scripts/setup.sh                    # Check for Docker and pre-pull docker images
> npm install                               # install dependencies
> ./scripts/startServices.sh       # start docker service(s) as background processes

## Commands

> ./scripts/startServices.sh    # Start background services (redis and BullMQ monitor)
> npm run dev                       # start in dev mode (colorful debug level logging)
>
> npm run start                     # start in "production" mode (info level logging)
> 
> npm run test                      # run tests
> 
> npm run clean && npm run build    # clean and build the project
> 
> ./scripts/stopServices.sh                 # stop docker service(s)
> ./scripts/stopServices.sh  -p           # stop docker service(s) and delete containers and data volumes

### Recover from any inconsistent state during development (full data reset)

> ./scripts/stopServices.sh  -p
> rm -rf data/sqlite/reports.db

### Monitor BullMQ

The queues can be monitored and inspected using [Bull Monitor](https://hub.docker.com/r/ejhayes/nodejs-bull-monitor).

[http://localhost:3000/queues/](http://localhost:3000/queues/)


## References

- [Ollama API doc](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [SCC](https://github.com/boyter/scc?tab=readme-ov-file#usage)
- [IORedis](https://github.com/redis/ioredis)
- [BullMQ](https://docs.bullmq.io/readme-1)

## LICENSE

GPL v3. See LICENSE file for more information.
```