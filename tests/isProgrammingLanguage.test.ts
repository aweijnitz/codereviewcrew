import isProgrammingLanguage from '../src/utils/isProgrammingLanguage';

describe('isProgrammingLanguage', () => {
    it('returns true for a known programming language', () => {
        expect(isProgrammingLanguage('JavaScript')).toBe(true);
    });

    it('returns false for an unknown programming language', () => {
        expect(isProgrammingLanguage('UnknownLanguage')).toBe(false);
    });

    it('is not case-sensitive and returns false for incorrect casing', () => {
        expect(isProgrammingLanguage('Javascript')).toBe(true);
    });

    it('returns true for another known programming language', () => {
        expect(isProgrammingLanguage('Python')).toBe(true);
    });

    it('returns false for an empty string', () => {
        expect(isProgrammingLanguage('')).toBe(false);
    });

    it('returns false for a null value', () => {
        expect(isProgrammingLanguage(null as unknown as string)).toBe(false);
    });

    it('returns false for a number', () => {
        expect(isProgrammingLanguage(123 as unknown as string)).toBe(false);
    });
});