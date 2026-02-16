import * as assert from 'assert';
import { VsCodeMessageGridColumnsRepository } from '../../../../features/queueMessages/adapters/VsCodeMessageGridColumnsRepositoryAdapter';

interface FakeConfiguration {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown, target: unknown): Promise<void>;
}

describe('VsCodeMessageGridColumnsRepository', () => {
    it('reads property columns from configuration', async () => {
        const config = createFakeConfiguration(['traceId', 'tenant']);
        const repository = new VsCodeMessageGridColumnsRepository(() => config, 'global');

        const columns = await repository.getPropertyColumns();

        assert.deepStrictEqual(columns, ['traceId', 'tenant']);
    });

    it('writes property columns to global configuration', async () => {
        const config = createFakeConfiguration([]);
        const repository = new VsCodeMessageGridColumnsRepository(() => config, 'global');

        await repository.setPropertyColumns(['traceId']);

        assert.deepStrictEqual(config.lastUpdate, {
            key: 'messageGrid.propertyColumns',
            value: ['traceId'],
            target: 'global'
        });
    });
});

function createFakeConfiguration(initial: unknown): FakeConfiguration & {
    lastUpdate: { key: string; value: unknown; target: unknown } | undefined;
} {
    let stored = initial;
    const state: { lastUpdate: { key: string; value: unknown; target: unknown } | undefined } = {
        lastUpdate: undefined
    };

    return {
        get lastUpdate() {
            return state.lastUpdate;
        },
        get: <T>(key: string): T | undefined => {
            if (key !== 'messageGrid.propertyColumns') {
                return undefined;
            }
            return stored as T;
        },
        update: async (key: string, value: unknown, target: unknown): Promise<void> => {
            stored = value;
            state.lastUpdate = {
                key,
                value,
                target
            };
        }
    };
}
