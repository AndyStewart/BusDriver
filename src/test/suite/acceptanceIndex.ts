import * as path from 'path';
import Mocha from 'mocha';
import { globSync } from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 60000
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        const files = globSync('acceptance/**/*.acceptance.integration.test.js', { cwd: testsRoot, nodir: true });
        if (files.length === 0) {
            reject(new Error(`No acceptance tests discovered under ${testsRoot}`));
            return;
        }

        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} acceptance tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
