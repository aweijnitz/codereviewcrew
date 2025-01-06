/**
 * Execute promises with a concurrency limit to throttle the number of promises running at the same time.
 * @param promises
 * @param maxConcurrency
 */
export default async function promiseWithConcurrencyLimit(promises: Array<Promise<any>>, maxConcurrency: number): Promise<any[]> {
    const results: any[] = [];
    const executing: Promise<void>[] = [];
    let index = 0;

    const enqueue = async () => {
        if (index === promises.length) {
            return;
        }
        const promise = promises[index++];
        const p = promise.then(result => {
            results.push(result);
        }).catch(error => {
            throw error;
        }).finally(() => {
            executing.splice(executing.indexOf(p), 1);
        });
        executing.push(p);
        if (executing.length >= maxConcurrency) {
            await Promise.race(executing);
        }
        await enqueue();
    };

    await enqueue();
    await Promise.all(executing).catch(error => { throw error; });
    return results;
}