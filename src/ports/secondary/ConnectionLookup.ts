import type { Connection } from '../../features/common/Connection';

export interface ConnectionLookup {
    getAll(): Promise<Connection[]>;
    getById(id: string): Promise<Connection | undefined>;
}
