import * as fs from 'fs';
import * as path from 'path';

export function resolveCachedVsCodeExecutable(extensionDevelopmentPath: string, version: string): string | undefined {
    const testRoot = path.resolve(extensionDevelopmentPath, '.vscode-test');
    if (!fs.existsSync(testRoot)) {
        return undefined;
    }

    const platformTag = resolvePlatformTag();
    if (!platformTag) {
        return undefined;
    }

    const installDir = path.resolve(testRoot, `vscode-${platformTag}-${version}`);
    if (!fs.existsSync(installDir)) {
        return undefined;
    }

    if (process.platform === 'darwin') {
        const executable = path.resolve(installDir, 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron');
        return fs.existsSync(executable) ? executable : undefined;
    }

    if (process.platform === 'linux') {
        const executable = path.resolve(installDir, `VSCode-linux-${process.arch}`, 'code');
        return fs.existsSync(executable) ? executable : undefined;
    }

    if (process.platform === 'win32') {
        const executable = path.resolve(installDir, 'Code.exe');
        return fs.existsSync(executable) ? executable : undefined;
    }

    return undefined;
}

function resolvePlatformTag(): string | undefined {
    if (process.platform === 'darwin') {
        return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin';
    }

    if (process.platform === 'linux') {
        return process.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    }

    if (process.platform === 'win32') {
        if (process.arch === 'arm64') {
            return 'win32-arm64-archive';
        }

        return process.arch === 'x64' ? 'win32-x64-archive' : 'win32-archive';
    }

    return undefined;
}
