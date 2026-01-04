import type { Logger } from '../../ports/Logger';

export class VsCodeLogger implements Logger {
    info(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.log(message, meta);
            return;
        }

        console.log(message);
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.warn(message, meta);
            return;
        }

        console.warn(message);
    }

    error(message: string, meta?: Record<string, unknown>): void {
        if (meta) {
            console.error(message, meta);
            return;
        }

        console.error(message);
    }
}
