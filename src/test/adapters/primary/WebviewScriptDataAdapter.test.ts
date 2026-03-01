import * as assert from 'assert';
import { serializeForInlineScript } from '../../../adapters/primary/WebviewScriptDataAdapter';

describe('serializeForInlineScript', () => {
    it('escapes script-closing sequences and preserves payload data', () => {
        const payload = [{
            sequenceNumber: '1',
            body: 'hello </script><script>alert(1)</script>'
        }];

        const serialized = serializeForInlineScript(payload);

        assert.ok(!serialized.includes('</script>'));
        const parsed = JSON.parse(serialized) as Array<{ body: string }>;
        assert.strictEqual(parsed[0]?.body, payload[0]?.body);
    });
});
