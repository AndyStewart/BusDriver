import * as vscode from 'vscode';
import type { MessageGridColumnsRepository } from '../../ports/MessageGridColumnsRepository';

export class VsCodeMessageGridColumnsRepository implements MessageGridColumnsRepository {
    async getPropertyColumns(): Promise<unknown> {
        const config = vscode.workspace.getConfiguration('busdriver');
        return config.get('messageGrid.propertyColumns');
    }

    async setPropertyColumns(columns: string[]): Promise<void> {
        const config = vscode.workspace.getConfiguration('busdriver');
        await config.update(
            'messageGrid.propertyColumns',
            columns,
            vscode.ConfigurationTarget.Global
        );
    }
}
