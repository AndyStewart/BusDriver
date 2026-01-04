import type * as vscode from 'vscode';
import type { Connection } from '../../domain/models/Connection';
import type { ConnectionRepository } from '../../ports/ConnectionRepository';

const CONNECTIONS_KEY = 'connections';

interface StoredConnection {
    id: string;
    name: string;
    createdAt: Date | string;
    connectionString?: string;
}

export class VsCodeConnectionRepository implements ConnectionRepository {
    constructor(private readonly context: vscode.ExtensionContext) {}

    async getAll(): Promise<Connection[]> {
        const stored = this.context.globalState.get<StoredConnection[]>(CONNECTIONS_KEY, []);
        const connections: Connection[] = [];

        for (const entry of stored) {
            const connectionString = await this.context.secrets.get(this.getSecretKey(entry.id));
            connections.push({
                id: entry.id,
                name: entry.name,
                connectionString: connectionString ?? '',
                createdAt: new Date(entry.createdAt)
            });
        }

        return connections;
    }

    async getById(id: string): Promise<Connection | undefined> {
        const stored = this.context.globalState.get<StoredConnection[]>(CONNECTIONS_KEY, []);
        const entry = stored.find((connection) => connection.id === id);

        if (!entry) {
            return undefined;
        }

        const connectionString = await this.context.secrets.get(this.getSecretKey(entry.id));

        return {
            id: entry.id,
            name: entry.name,
            connectionString: connectionString ?? '',
            createdAt: new Date(entry.createdAt)
        };
    }

    async save(connection: Connection): Promise<void> {
        const stored = this.context.globalState.get<StoredConnection[]>(CONNECTIONS_KEY, []);
        const next = stored.slice();
        const index = next.findIndex((entry) => entry.id === connection.id);
        const storedConnection: StoredConnection = {
            id: connection.id,
            name: connection.name,
            createdAt: connection.createdAt,
            connectionString: ''
        };

        if (index >= 0) {
            next[index] = storedConnection;
        } else {
            next.push(storedConnection);
        }

        await this.context.secrets.store(this.getSecretKey(connection.id), connection.connectionString);
        await this.context.globalState.update(CONNECTIONS_KEY, next);
    }

    async remove(id: string): Promise<void> {
        const stored = this.context.globalState.get<StoredConnection[]>(CONNECTIONS_KEY, []);
        const next = stored.filter((entry) => entry.id !== id);

        await this.context.secrets.delete(this.getSecretKey(id));
        await this.context.globalState.update(CONNECTIONS_KEY, next);
    }

    private getSecretKey(id: string): string {
        return `connection.${id}`;
    }
}
