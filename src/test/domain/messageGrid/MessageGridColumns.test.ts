import * as assert from 'assert';
import {
    buildMessageGridHeaders,
    buildPropertyRowCells,
    formatPropertyCellValue,
    normalizePropertyColumns
} from '../../../domain/messageGrid/messageGridColumns';

describe('Message grid column helpers', () => {
    it('normalizePropertyColumns trims and filters empty entries', () => {
        const input = [' traceId ', '', '   ', 'tenant'];

        const result = normalizePropertyColumns(input);

        assert.deepStrictEqual(result, ['traceId', 'tenant']);
    });

    it('normalizePropertyColumns strips properties prefix', () => {
        const input = ['properties.traceId', 'Properties.correlationId'];

        const result = normalizePropertyColumns(input);

        assert.deepStrictEqual(result, ['traceId', 'correlationId']);
    });

    it('normalizePropertyColumns supports comma-separated string input', () => {
        const result = normalizePropertyColumns(' traceId, correlationId , ');

        assert.deepStrictEqual(result, ['traceId', 'correlationId']);
    });

    it('buildMessageGridHeaders keeps built-ins before property columns', () => {
        const headers = buildMessageGridHeaders(['traceId', 'tenant']);

        assert.deepStrictEqual(headers, [
            'Sequence #',
            'Message ID',
            'Enqueued Time',
            'Delivery Count',
            'traceId',
            'tenant'
        ]);
    });

    it('buildPropertyRowCells formats values and leaves missing empty', () => {
        const properties = {
            traceId: 'abc',
            count: 3,
            payload: { a: 1 },
            nullable: null
        };
        const columns = ['traceId', 'count', 'payload', 'missing', 'nullable'];

        const result = buildPropertyRowCells(properties, columns);

        assert.deepStrictEqual(result, ['abc', '3', '{"a":1}', '', 'null']);
    });

    it('buildPropertyRowCells supports nested property paths', () => {
        const properties = {
            NServiceBus: {
                Transport: {
                    Encoding: 'gzip'
                }
            }
        };

        const result = buildPropertyRowCells(properties, ['NServiceBus.Transport.Encoding']);

        assert.deepStrictEqual(result, ['gzip']);
    });

    it('formatPropertyCellValue uses JSON for non-strings', () => {
        assert.strictEqual(formatPropertyCellValue(42), '42');
        assert.strictEqual(formatPropertyCellValue({ ok: true }), '{"ok":true}');
    });
});
