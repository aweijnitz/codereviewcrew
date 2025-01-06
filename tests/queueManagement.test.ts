import {
    toQueueName,
    drainAndDelete,
    getCreateQueue,
    activeQueues,
    COMPLEXITY_SUFFIX, REVIEW_SUFFIX, REPORT_SUFFIX
} from '../src/taskmanagement/queueManagement';

describe('toQueueName', () => {
    it('should return unique queueName based on the input', () => {
        const owner = 'Agent-14';
        const expectedOutput = '235916009515ac89-Agent-14-complexity';
        const result = toQueueName(owner, 'complexity');
        expect(result).toBe(expectedOutput);
    });
});

jest.mock('../src/taskmanagement/queueManagement', () => ({
    toQueueName: jest.fn(),
    getCreateQueue: jest.fn(),
    drainAndDelete: jest.fn(),
    activeQueues: {
        delete: jest.fn()
    }
}));

describe('drainAndDelete', () => {
    const mockObliterate = jest.fn();
    const mockQueue = { obliterate: mockObliterate };

    beforeEach(() => {
        jest.clearAllMocks();
        (getCreateQueue as jest.Mock).mockReturnValue(mockQueue);
    });

    it('should call toQueueName with correct suffixes', async () => {
        await drainAndDelete('owner', true);
        expect(toQueueName).toHaveBeenCalledWith('owner', COMPLEXITY_SUFFIX);
        expect(toQueueName).toHaveBeenCalledWith('owner', REVIEW_SUFFIX);
        expect(toQueueName).toHaveBeenCalledWith('owner', REPORT_SUFFIX);
    });

    it('should call getCreateQueue with correct queue names', async () => {
        await drainAndDelete('owner', true);
        expect(getCreateQueue).toHaveBeenCalledTimes(3);
    });

    it('should call obliterate on each queue with correct force parameter', async () => {
        await drainAndDelete('owner', true);
        expect(mockObliterate).toHaveBeenCalledWith({ force: true });
        expect(mockObliterate).toHaveBeenCalledTimes(3);
    });

    it('should delete queue names from activeQueues', async () => {
        await drainAndDelete('owner', true);
        expect(activeQueues.delete).toHaveBeenCalledTimes(3);
    });
});

