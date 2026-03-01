import * as assert from 'assert';
import { Queue } from '../../../adapters/primary/TreeQueueItemAdapter';
import { resolveQueuePanelContext } from '../../../adapters/primary/WebviewQueuePanelContextAdapter';

describe('resolveQueuePanelContext', () => {
    it('returns updated queue identity and connection string for reused panels', () => {
        const nextQueue: Queue = {
            name: 'queue-b',
            connectionId: 'conn-b'
        };
        const nextConnectionString = 'Endpoint=sb://b/;SharedAccessKeyName=Root;SharedAccessKey=new';

        const resolved = resolveQueuePanelContext(nextQueue, nextConnectionString);

        assert.strictEqual(resolved.queue.name, 'queue-b');
        assert.strictEqual(resolved.queue.connectionId, 'conn-b');
        assert.strictEqual(resolved.connectionString, nextConnectionString);
    });
});
