# Basic Agentic Code Review Application

## Summary

This is a basic code review application that uses LLM agents to review code.  It has a command line interface that takes a folder to scan and a report file name. 
It uses an agentic collaboration approach, where the agents use a combination of static code analysis and AI to generate a report. The report is generated as a markdown file.

### Token Consumption Warning!

This application was developed using a local Ollama instance.
For paid LLM services, it might consume a non-trivial amount of tokens and __incur non-trivial costs__.

## Requirements

- Node.js (project developed on v21)
- Docker
- Ollama (local or accessible via URL endpoint)

Developed on MacOSX (Intel Mac). Should work on *nix too without modifications.

## Installation and services start

> mv .env_example .env            # Edit and update to match your local
> ./scripts/setup.sh                    # Check for Docker, Ollama and pre-pull docker images and ollama models
> npm install                               # install dependencies
> ./scripts/startServices.sh       # start docker service(s) as background processes

## Usage

The frontend is a command line interface. Pass in the folder to scan and a report file name (optional).
Note: `./scripts/startServices.sh` is a prerequisite. Expect runs to take several minutes, or even hours for large code bases.

> ./reviewCodeBase.sh < folder to analyze> [report_file.md]
> ./reviewCodeBase.sh ./src/db /tmp/report.md   # Example

## Architecture and approach

TODO

## Learnings and ideas for future work

This is a useful testbed for trying out agent collaboration and experimenting with prompts, different models and model settings (temperature, top_k, repeat_penalty, ...).
It does so without bringing the overhead of learning an agent framework or potentially a new programming language (Python). The codebase is also very small (currently less than 20 source files), so it is easy to refactor and understand.
The domain (code review) is familiar to any developer and therefore it is easy to evaluate the results as well.

While being a small codebase, it sketches out some enterprise requirements, such as _tenancy_ (the "owner" concept in the code), _concurrency and rate limiting_ using message queues, 
_data isolation_ (each run gets it's own dedicated queues and db tables) and basic _data retention policy_ (all ephemeral data is flushed on report completion and at process exit).  

**Ideas:**

- Add a feedback/QA loop to improve quality when agents produce poor quality (create a QualityAssuranceAgent to "review the review" and send back for rework before setting task state COMPLETED)
- Enrich the context for the main review by supplying a description of the purpose of the codebase (ex. "This is a transactional system for invoice processing. [...]")
- Create subject matter expert agents that focus on things like Frontend/React or backend enterprise code and dispatch tasks accordingly. The static code analysis stage already bins files by type, which is a start. 
- Experiments with domain expertise could be useful too, like eCommerce, or security.
- Improve report quality with graphs and more details about the most problematic files.
- Generate three reports from the database and have a final agent pick the best one.
- Add all per-file reviews to a vector database and create a chatbot that can answer questions about the code, the reviews and suggest improvements (RAG style)

**Next level/new direction**

- Create Jira tickets for most problematic files and supply the review text and improvement suggestions in the description
- Git awareness and Github integration: Create a Github action that runs the review on every PR and posts the report as a comment.


## Development

This is a Node.js project. It is written in TypeScript and uses BullMQ for job queueing and Redis for job persistence.
The per-file results are stored in a sqlite database. The final report is generated from the database and output to either a file or to standard out.

To develop individual agents and tune prompts, work in `src/devhelpers/evalAndTune.ts`. It can easily be run inside an IDE and saves a lot of time.


### Commands

> $ ./scripts/startServices.sh    # Start background services (redis and BullMQ monitor)
> $ npm run dev                       # start in dev mode (colorful debug level logging with hard-coded test folder './src/db')
>
> $ npm run start                     # alias for './reviewCodeBase.sh ./src/db'
> 
> $ npm run test                      # run tests
> 
> $ npm run clean && npm run build    # clean and build the project
> 
> $ ./scripts/stopServices.sh                 # stop docker services
> $ ./scripts/stopServices.sh  -p           # stop docker services and delete containers and data volumes


### Development tips

#### * Prevent your Mac from sleeping

Jobs take a long time to run and your Mac might decide to go to bed. 

> $ caffeinate 

#### * Recover from any inconsistent state during development (full data reset)

The code has data cleanup built-in, including at process exit. Inevitably, one will anyway end up in an inconsistent state when experimenting.
To recover from any inconsistent state, stop the services with the prune option ('-p') and delete the sqlite database file.
This removes all data and containers, and the next start will be a clean start.

> $ ./scripts/stopServices.sh  -p
>   
> $ rm -rf data/sqlite/reports.db

#### * Monitor BullMQ

The queues can be monitored and inspected using [Bull Monitor](https://hub.docker.com/r/ejhayes/nodejs-bull-monitor). Useful for checking progress on long-running jobs (all jobs on my old machine...).
[http://localhost:3000/queues/](http://localhost:3000/queues/)

#### * Detecting when the prompt is too large for a selected model

Experimenting with prompts and models, you can detect when the prompt is too large for the selected model.
It typically happens when optimizing for speed, using small models.

Assuming a local Ollama installation, monitor the Ollama logs
> $ tail -f ~/.ollama/logs/server.log

If the chosen model cannot accommodate the prompt size, you will see something like this
> time=2025-01-04T16:00:37.950+01:00 level=WARN source=runner.go:129 msg="truncating input prompt" limit=2048 prompt=2084 keep=5 new=2048

#### Use a command-line markdown reader (glow)

Install [glow](https://github.com/charmbracelet/glow) and use it to read the reports. It helps speed up evaluation a lot.

> $ ./reviewCodeBase.sh ./src/db /tmp/report.md
> 
> $ glow /tmp/report.md

## References

- [Ollama API doc](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [SCC](https://github.com/boyter/scc?tab=readme-ov-file#usage)
- [IORedis](https://github.com/redis/ioredis)
- [BullMQ](https://docs.bullmq.io/readme-1)

## LICENSE

GPL v3. See LICENSE file for more information.