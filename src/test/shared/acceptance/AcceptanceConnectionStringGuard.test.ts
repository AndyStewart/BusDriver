import * as assert from 'assert';
import { requireAzureServiceBusNamespaceConnectionString } from '../../acceptance/AcceptanceConnectionStringGuard';

describe('AcceptanceConnectionStringGuard', () => {
    it('throws when connection string is missing', () => {
        assert.throws(() => requireAzureServiceBusNamespaceConnectionString(undefined), /require BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING/);
    });

    it('throws when emulator flag is present', () => {
        assert.throws(
            () => requireAzureServiceBusNamespaceConnectionString('Endpoint=sb://localhost;UseDevelopmentEmulator=true;SharedAccessKeyName=x;SharedAccessKey=y;'),
            /do not support Service Bus emulator/
        );
    });

    it('throws when endpoint host is localhost', () => {
        assert.throws(
            () => requireAzureServiceBusNamespaceConnectionString('Endpoint=sb://localhost;SharedAccessKeyName=x;SharedAccessKey=y;'),
            /not localhost/
        );
    });

    it('throws when endpoint is not a service bus namespace', () => {
        assert.throws(
            () => requireAzureServiceBusNamespaceConnectionString('Endpoint=sb://example.com;SharedAccessKeyName=x;SharedAccessKey=y;'),
            /require an Azure Service Bus namespace endpoint/
        );
    });

    it('returns accepted Azure Service Bus namespace connection strings', () => {
        const input = 'Endpoint=sb://my-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE';
        assert.strictEqual(requireAzureServiceBusNamespaceConnectionString(input), input);
    });
});
