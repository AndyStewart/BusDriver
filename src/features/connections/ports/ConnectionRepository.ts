import type { Connection } from '../../../shared/ports/Connection';
import type { ConnectionLookup } from '../../../shared/ports/ConnectionLookup';

export interface ConnectionRepository extends ConnectionLookup {
    save(connection: Connection): Promise<void>;
    remove(id: string): Promise<void>;
}
