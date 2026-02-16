import * as assert from 'assert';
import { ConnectionService } from '../../../../features/connections/application/ConnectionService';
import { InMemoryConnectionRepository } from '../../../shared/fakes/InMemoryConnectionRepository';

describe('ConnectionService', () => {
    it('adds a connection with trimmed values', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        const result = await service.addConnection('  Primary  ', ' Endpoint=sb://example/ ');

        assert.strictEqual(result.ok, true);
        if (result.ok) {
            assert.strictEqual(result.value.name, 'Primary');
            assert.strictEqual(result.value.connectionString, 'Endpoint=sb://example/');
            assert.ok(result.value.id.length > 0);
        }
    });

    it('rejects empty names', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        const result = await service.addConnection('   ', 'Endpoint=sb://example/');

        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'EMPTY_NAME');
        }
    });

    it('rejects duplicate names', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        await service.addConnection('Primary', 'Endpoint=sb://example/');
        const result = await service.addConnection('Primary', 'Endpoint=sb://example2/');

        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'DUPLICATE_NAME');
        }
    });

    it('rejects empty connection strings', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        const result = await service.addConnection('Primary', '   ');

        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'EMPTY_CONNECTION_STRING');
        }
    });

    it('rejects invalid connection strings', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        const result = await service.addConnection('Primary', 'not-a-connection-string');

        assert.strictEqual(result.ok, false);
        if (!result.ok) {
            assert.strictEqual(result.error.code, 'INVALID_CONNECTION_STRING');
        }
    });

    it('deletes connections by id', async () => {
        const repository = new InMemoryConnectionRepository();
        const service = new ConnectionService(repository);

        const created = await service.addConnection('Primary', 'Endpoint=sb://example/');
        assert.strictEqual(created.ok, true);
        if (!created.ok) {
            return;
        }

        await service.deleteConnection(created.value.id);
        const stored = await service.getConnectionById(created.value.id);

        assert.strictEqual(stored, undefined);
    });
});
