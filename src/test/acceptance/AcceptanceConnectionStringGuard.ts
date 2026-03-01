export function requireAzureServiceBusNamespaceConnectionString(rawValue: string | undefined): string {
    const value = rawValue?.trim();
    if (!value) {
        throw new Error(
            'Acceptance tests require BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING set to a real Azure Service Bus namespace connection string.'
        );
    }

    if (/UseDevelopmentEmulator\s*=\s*true/i.test(value)) {
        throw new Error('Acceptance tests do not support Service Bus emulator connection strings.');
    }

    const endpointMatch = /Endpoint\s*=\s*sb:\/\/([^;/]+)/i.exec(value);
    if (!endpointMatch) {
        throw new Error('Acceptance connection string must contain Endpoint=sb://<namespace-host>.');
    }

    const host = endpointMatch[1].trim().toLowerCase();
    if (!host) {
        throw new Error('Acceptance connection string endpoint host is empty.');
    }

    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        throw new Error('Acceptance tests require an Azure Service Bus namespace, not localhost.');
    }

    if (!host.includes('.servicebus.')) {
        throw new Error(`Acceptance tests require an Azure Service Bus namespace endpoint; received '${host}'.`);
    }

    return value;
}
