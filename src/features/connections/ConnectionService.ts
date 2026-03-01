import type { Connection } from './Connection';
import type { ConnectionRepository } from '../../ports/secondary/ConnectionRepository';

export type ConnectionValidationErrorCode =
    | 'EMPTY_NAME'
    | 'DUPLICATE_NAME'
    | 'EMPTY_CONNECTION_STRING'
    | 'INVALID_CONNECTION_STRING';

export interface ConnectionValidationError {
    code: ConnectionValidationErrorCode;
    message: string;
}

export type ConnectionServiceResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: ConnectionValidationError };

export class ConnectionService {
    constructor(private readonly connectionRepository: ConnectionRepository) {}

    async listConnections(): Promise<Connection[]> {
        return this.connectionRepository.getAll();
    }

    async getConnectionById(id: string): Promise<Connection | undefined> {
        return this.connectionRepository.getById(id);
    }

    async addConnection(name: string, connectionString: string): Promise<ConnectionServiceResult<Connection>> {
        const trimmedName = name.trim();
        if (!trimmedName) {
            return { ok: false, error: { code: 'EMPTY_NAME', message: 'Connection name cannot be empty' } };
        }

        const trimmedConnectionString = connectionString.trim();
        if (!trimmedConnectionString) {
            return { ok: false, error: { code: 'EMPTY_CONNECTION_STRING', message: 'Connection string cannot be empty' } };
        }

        if (!trimmedConnectionString.includes('Endpoint=sb://')) {
            return { ok: false, error: { code: 'INVALID_CONNECTION_STRING', message: 'Invalid connection string format' } };
        }

        const existing = await this.connectionRepository.getAll();
        if (existing.some((connection) => connection.name === trimmedName)) {
            return { ok: false, error: { code: 'DUPLICATE_NAME', message: 'A connection with this name already exists' } };
        }

        const connection: Connection = {
            id: this.generateId(),
            name: trimmedName,
            connectionString: trimmedConnectionString,
            createdAt: new Date()
        };

        await this.connectionRepository.save(connection);

        return { ok: true, value: connection };
    }

    async deleteConnection(id: string): Promise<void> {
        await this.connectionRepository.remove(id);
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
