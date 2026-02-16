import type { Connection } from '../application/Connection';

export interface ConnectionRepository {
    getAll(): Promise<Connection[]>;
    getById(id: string): Promise<Connection | undefined>;
    save(connection: Connection): Promise<void>;
    remove(id: string): Promise<void>;
}
