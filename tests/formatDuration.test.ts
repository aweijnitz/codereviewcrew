import formatDuration from '../src/utils/formatDuration';

describe('formatDuration', () => {
    it('should format 0 milliseconds as 00:00:00', () => {
        expect(formatDuration(0)).toBe('00:00:00');
    });

    it('should format 1000 milliseconds as 00:00:01', () => {
        expect(formatDuration(1000)).toBe('00:00:01');
    });

    it('should format 60000 milliseconds as 00:01:00', () => {
        expect(formatDuration(60000)).toBe('00:01:00');
    });

    it('should format 3600000 milliseconds as 01:00:00', () => {
        expect(formatDuration(3600000)).toBe('01:00:00');
    });

    it('should format 3661000 milliseconds as 01:01:01', () => {
        expect(formatDuration(3661000)).toBe('01:01:01');
    });

    it('should format 86399000 milliseconds as 23:59:59', () => {
        expect(formatDuration(86399000)).toBe('23:59:59');
    });

    it('should format 86400000 milliseconds as 24:00:00', () => {
        expect(formatDuration(86400000)).toBe('24:00:00');
    });
});