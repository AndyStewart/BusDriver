import * as assert from 'assert';
import type * as vscode from 'vscode';
import { VsCodeConnectionRepository } from '../../../adapters/secondary/VsCodeConnectionRepositoryAdapter';
import type { Connection } from '../../../features/connections/Connection';

class FakeSecretStorage {
    private readonly storage = new Map<string, string>();

    async get(key: string): Promise<string | undefined> {
        return this.storage.get(key);
    }

    async store(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }
}

class FakeMemento {
    private readonly storage = new Map<string, unknown>();

    get<T>(key: string, defaultValue?: T): T {
        if (this.storage.has(key)) {
            return this.storage.get(key) as T;
        }

        return defaultValue as T;
    }

    async update(key: string, value: unknown): Promise<void> {
        this.storage.set(key, value);
    }
}

const createContext = (): vscode.ExtensionContext => {
    return {
        secrets: new FakeSecretStorage(),
        globalState: new FakeMemento()
    } as unknown as vscode.ExtensionContext;
};

describe('VsCodeConnectionRepository', () => {
    it('save persists metadata and secrets', async () => {
        const context = createContext();
        const repository = new VsCodeConnectionRepository(context);
        const createdAt = new Date('2024-01-02T03:04:05.000Z');
        const connection: Connection = {
            id: 'conn-1',
            name: 'Primary',
            connectionString: 'Endpoint=sb://example/',
            createdAt
        };

        await repository.save(connection);

        const all = await repository.getAll();

        assert.strictEqual(all.length, 1);
        assert.strictEqual(all[0].id, connection.id);
        assert.strictEqual(all[0].name, connection.name);
        assert.strictEqual(all[0].connectionString, connection.connectionString);
        assert.strictEqual(all[0].createdAt.getTime(), createdAt.getTime());
    });

    it('remove deletes metadata and secrets', async () => {
        const context = createContext();
        const repository = new VsCodeConnectionRepository(context);
        const connection: Connection = {
            id: 'conn-2',
            name: 'Backup',
            connectionString: 'Endpoint=sb://backup/',
            createdAt: new Date()
        };

        await repository.save(connection);
        await repository.remove(connection.id);

        const stored = await repository.getById(connection.id);
        assert.strictEqual(stored, undefined);
    });
});
