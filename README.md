Basic Agentic Code Review Service


## Requirements

- Node.js (project developed on v21)
- Docker
- Ollama (local or accessible via URL endpoint)

## Setup

> mv .env_example .env        # Review and update to match actuals 
> ./scripts/setup.sh                # pull docker images
> npm install                           # install dependencies
> ./scripts/runServices.sh      # start docker service(s) as background processes

## Commands

> npm run dev                       # start in dev mode (colorful debug level logging)
>
> npm run start                     # start in "production" mode (info level logging)
> 
> npm run test                      # run tests
> 
> npm run clean && npm run build    # clean and build the project
> 
> ./scripts/stopServices.sh             # stop docker service(s)

## References

- [Ollama API doc](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [SCC](https://github.com/boyter/scc?tab=readme-ov-file#usage)
- [IORedis](https://github.com/redis/ioredis)
- [BullMQ](https://docs.bullmq.io/readme-1)

## LICENSE

GPL v3. See LICENSE file for more information.
```