import {Redis} from "ioredis"
import {Job, Queue, QueueEvents, Worker} from 'bullmq';
import IORedis from 'ioredis';

const HOST = "127.0.0.1";
const PORT = 6379;
const redis = new Redis(PORT, HOST);

redis.set("mykey", "redis_connection_test_OK").then(() => {
    redis.get("mykey").then((result) => {
        console.log(result); // Prints "value"
    })
})


const queueName = 'testqueue';
const myQueue = new Queue(queueName);

async function addJobs() {
    await myQueue.add('myJobName', {foo: 'bar'});
    await myQueue.add('myJobName', {qux: 'baz'});
}

addJobs().then(() => {
    console.log('Jobs have been added');
    const connection = new IORedis({ maxRetriesPerRequest: null });

    const worker = new Worker(
        queueName,
        async job => {
            // Will print { foo: 'bar'} for the first job
            // and { qux: 'baz' } for the second.
            //console.log(job.id, job.data);
            return {
                jobId: job.id,
                ownState: 'completed',
                data: job.data
            };
        },
        {
            connection,
            concurrency: 1, // Amount of jobs that a single worker is allowed to work on in parallel.
            limiter: {
                max: 5,              // Max number of jobs to process in the time period specified in duration
                duration: 1000, // Time in milliseconds. During this time, a maximum of max jobs will be processed.
            }
        },
    );
})


const queueEvents = new QueueEvents(queueName);
queueEvents.on('completed', async ({ jobId }) => {
    //console.log(`Job completed with id ${jobId}`);
    const job = await Job.fromId(myQueue, jobId);
    console.log('event handler', job?.returnvalue);
});

queueEvents.on('failed', async ({ jobId }) => {
    console.log(`Job failed with id ${jobId}`);
});
