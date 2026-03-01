import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import { requireAzureServiceBusNamespaceConnectionString } from './acceptance/AcceptanceConnectionStringGuard';
import { resolveCachedVsCodeExecutable } from './VsCodeExecutableResolver';

const VSCODE_VERSION = '1.109.5';

async function main() {
    try {
        process.env.BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING =
            requireAzureServiceBusNamespaceConnectionString(process.env.BUSDRIVER_ACCEPTANCE_SERVICEBUS_CONNECTION_STRING);

        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/acceptanceIndex.js');
        const vscodeExecutablePath = resolveCachedVsCodeExecutable(extensionDevelopmentPath, VSCODE_VERSION);
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            version: VSCODE_VERSION,
            vscodeExecutablePath
        });
    } catch (err) {
        console.error('Failed to run acceptance tests:', err);
        process.exit(1);
    }
}

main();
