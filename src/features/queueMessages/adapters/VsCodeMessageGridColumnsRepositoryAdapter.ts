import type { MessageGridColumnsRepository } from '../ports/MessageGridColumnsRepository';

interface WorkspaceConfigurationLike {
    get<T>(section: string): T | undefined;
    update(section: string, value: unknown, target: unknown): Thenable<void>;
}

type ConfigurationAccessor = () => WorkspaceConfigurationLike;

export class VsCodeMessageGridColumnsRepository implements MessageGridColumnsRepository {
    constructor(
        private readonly getConfiguration: ConfigurationAccessor,
        private readonly configurationTarget: unknown
    ) {}

    getPropertyColumns(): Promise<unknown> {
        const config = this.getConfiguration();
        return Promise.resolve(config.get('messageGrid.propertyColumns'));
    }

    async setPropertyColumns(columns: string[]): Promise<void> {
        const config = this.getConfiguration();
        await config.update(
            'messageGrid.propertyColumns',
            columns,
            this.configurationTarget
        );
    }
}
