import type { Connection } from '../../features/common/Connection';
import type { ConnectionLookup } from './ConnectionLookup';

export interface ConnectionRepository extends ConnectionLookup {
    save(connection: Connection): Promise<void>;
    remove(id: string): Promise<void>;
}
