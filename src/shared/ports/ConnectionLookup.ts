import type { Connection } from './Connection';

export interface ConnectionLookup {
    getAll(): Promise<Connection[]>;
    getById(id: string): Promise<Connection | undefined>;
}
