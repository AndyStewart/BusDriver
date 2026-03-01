import * as path from 'path';
import { runTests } from '@vscode/test-electron';
import { resolveCachedVsCodeExecutable } from './VsCodeExecutableResolver';

const VSCODE_VERSION = '1.109.5';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to the extension test script
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
        const vscodeExecutablePath = resolveCachedVsCodeExecutable(extensionDevelopmentPath, VSCODE_VERSION);

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            version: VSCODE_VERSION,
            vscodeExecutablePath
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

void main();
