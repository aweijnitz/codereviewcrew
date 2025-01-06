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
> ollama pull <your_model_name>  # Pull the models you want to use. See .env_example for defaults and alternatives
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

## Architecture and approach

## Development tips

### Prevent your Mac from sleeping

Jobs take a long time to run and your Mac might decide to go to bed. 

> caffeinate 

### Recover from any inconsistent state during development (full data reset)

The code has data cleanup built-in, including at process exit. Inevitably, one will anyway end up in an inconsistent state when experimenting.
To recover from any inconsistent state, stop the services with the prune option ('-p') and delete the sqlite database file.
This removes all data and containers, and the next start will be a clean start.

> ./scripts/stopServices.sh  -p
> rm -rf data/sqlite/reports.db

### Monitor BullMQ

The queues can be monitored and inspected using [Bull Monitor](https://hub.docker.com/r/ejhayes/nodejs-bull-monitor). Useful for checking progress on long-running jobs (all jobs on my old machine...).
[http://localhost:3000/queues/](http://localhost:3000/queues/)

### Detecting when the prompt is too large for a selected model

Experimenting with prompts and models, you can detect when the prompt is too large for the selected model.
It typically happens when optimizing for speed, using small models.

Assuming a local Ollama installation, monitor the Ollama logs
> tail -f ~/.ollama/logs/server.log

If the chosen model cannot accommodate the prompt size, you will see something like this
> time=2025-01-04T16:00:37.950+01:00 level=WARN source=runner.go:129 msg="truncating input prompt" limit=2048 prompt=2084 keep=5 new=2048





## References

- [Ollama API doc](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [SCC](https://github.com/boyter/scc?tab=readme-ov-file#usage)
- [IORedis](https://github.com/redis/ioredis)
- [BullMQ](https://docs.bullmq.io/readme-1)

## LICENSE

GPL v3. See LICENSE file for more information.
```