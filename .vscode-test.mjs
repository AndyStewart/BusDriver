import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/suite/**/*.test.js',
    version: 'stable',
    workspaceFolder: './',
    mocha: {
        ui: 'tdd',
        color: true,
        timeout: 20000
    }
});
