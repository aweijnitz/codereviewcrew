import promistWithConcurrencyLimit from '../src/utils/promiseWithConcurrencyLimit';

describe('promistWithConcurrencyLimit', () => {
    test('should resolve all promises with a concurrency limit', async () => {
        const promises = [
            Promise.resolve(1),
            Promise.resolve(2),
            Promise.resolve(3),
            Promise.resolve(4),
            Promise.resolve(5)
        ];
        const maxConcurrency = 2;
        const results = await promistWithConcurrencyLimit(promises, maxConcurrency);
        expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle rejected promises and only return resolved values', async () => {
        const promises = [
            Promise.resolve(1),
            Promise.reject(new Error('Test error')),
            Promise.resolve(3)
        ];
        const maxConcurrency = 2;
        const results = await promistWithConcurrencyLimit(promises, maxConcurrency);
        expect(results).toEqual([1, 3]);
//        await expect(promistWithConcurrencyLimit(promises, maxConcurrency)).rejects.toThrow('Test error');
    });

    test('should handle an empty array of promises', async () => {
        const promises: Promise<any>[] = [];
        const maxConcurrency = 2;
        const results = await promistWithConcurrencyLimit(promises, maxConcurrency);
        expect(results).toEqual([]);
    });

    test('should handle a single promise', async () => {
        const promises = [Promise.resolve(1)];
        const maxConcurrency = 1;
        const results = await promistWithConcurrencyLimit(promises, maxConcurrency);
        expect(results).toEqual([1]);
    });
});