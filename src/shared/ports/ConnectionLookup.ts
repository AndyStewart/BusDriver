import type { Connection } from '../application/Connection';

export interface ConnectionLookup {
    getAll(): Promise<Connection[]>;
    getById(id: string): Promise<Connection | undefined>;
}
