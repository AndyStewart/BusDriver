import * as assert from 'assert';
import { getNextSequenceNumber } from '../../../providers/queueMessagePagination';

describe('getNextSequenceNumber', () => {
    it('increments valid numeric sequence numbers', () => {
        const next = getNextSequenceNumber('41');
        assert.strictEqual(next, '42');
    });

    it('supports very large sequence numbers', () => {
        const next = getNextSequenceNumber('9223372036854775808');
        assert.strictEqual(next, '9223372036854775809');
    });

    it('returns undefined for missing input', () => {
        const next = getNextSequenceNumber(undefined);
        assert.strictEqual(next, undefined);
    });

    it('returns undefined for non-numeric input', () => {
        const next = getNextSequenceNumber('abc-123');
        assert.strictEqual(next, undefined);
    });
});
