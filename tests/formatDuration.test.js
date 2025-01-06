import formatDuration from '../src/utils/formatDuration';
describe('formatDuration', () => {
    it('should format 0 nanoseconds as 00:00:00', () => {
        expect(formatDuration(0)).toBe('00:00:00');
    });
    it('should format 1e9 nanoseconds as 00:00:01', () => {
        expect(formatDuration(1e9)).toBe('00:00:01');
    });
    it('should format 6e10 nanoseconds as 00:01:00', () => {
        expect(formatDuration(6e10)).toBe('00:01:00');
    });
    it('should format 3.6e12 nanoseconds as 01:00:00', () => {
        expect(formatDuration(3.6e12)).toBe('01:00:00');
    });
    it('should format 3.661e12 nanoseconds as 01:01:01', () => {
        expect(formatDuration(3.661e12)).toBe('01:01:01');
    });
    it('should format 8.6399e13 nanoseconds as 23:59:59', () => {
        expect(formatDuration(8.6399e13)).toBe('23:59:59');
    });
    it('should format 8.64e13 nanoseconds as 24:00:00', () => {
        expect(formatDuration(8.64e13)).toBe('24:00:00');
    });
});
//# sourceMappingURL=formatDuration.test.js.map