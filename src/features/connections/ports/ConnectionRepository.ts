import type { Connection } from '../application/Connection';
import type { ConnectionLookup } from '../application/ConnectionLookup';

export interface ConnectionRepository extends ConnectionLookup {
    save(connection: Connection): Promise<void>;
    remove(id: string): Promise<void>;
}
