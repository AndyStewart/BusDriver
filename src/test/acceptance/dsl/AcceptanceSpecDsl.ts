import * as assert from 'assert';
import * as vscode from 'vscode';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { ConnectionTreeItem } from '../../../features/connections/adapters/TreeConnectionItemAdapter';
import { type QueueMessage } from '../../../features/queueMessages/adapters/WebviewQueueMessagesPanelAdapter';
import { QueueTreeItem, type Queue } from '../../../features/queues/adapters/TreeQueueItemAdapter';

interface TestConnection {
    id: string;
    name: string;
    connectionString: string;
    createdAt: Date | string;
}

interface QueueCatalogEntry {
    queue: { name: string; connectionId: string };
    connection: { id: string; name: string };
}

interface CommandOverrides {
    inputBoxValues?: string[];
    warningResponses?: string[];
    warningResponse?: string;
    quickPickLabel?: string;
    quickPickIndex?: number;
}

interface ScenarioMessageInput {
    messageId: string;
    body: unknown;
    properties?: Record<string, unknown>;
}

interface ScenarioContext {
    title: string;
    connectionName?: string;
    connectionId?: string;
    connectionString?: string;
    queueNames: Map<string, string>;
    createdQueues: string[];
}

type Step = (context: ScenarioContext) => Promise<void>;

export class AcceptanceScenarioBuilder {
    private readonly steps: Step[] = [];
    private readonly runId: string;
    private readonly scopeId: string;

    constructor(private readonly title: string) {
        this.runId = process.env.BUSDRIVER_ACCEPTANCE_RUN_ID ?? `run-${Date.now()}`;
        this.scopeId = process.env.BUSDRIVER_ACCEPTANCE_WORKER_ID ?? 'default';
    }

    givenConnection(name: string, connectionString: string): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            const scopedName = `${name}-${this.scenarioSlug()}`;
            await vscode.commands.executeCommand('busdriver.__test.seedConnection', {
                name: scopedName,
                connectionString
            });

            const connections = await this.listConnections();
            const seeded = connections.find((connection) => connection.name === scopedName);
            if (!seeded) {
                throw new Error(`Expected seeded connection '${scopedName}' to exist`);
            }

            context.connectionName = scopedName;
            context.connectionId = seeded.id;
            context.connectionString = seeded.connectionString;
        });

        return this;
    }

    givenQueues(queueAliases: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            assert.ok(context.connectionString, 'Connection string must be set before creating queues');
            const admin = new ServiceBusAdministrationClient(context.connectionString);

            for (const alias of queueAliases) {
                const physicalName = this.physicalQueueName(alias);
                await ensureQueue(admin, physicalName);
                context.queueNames.set(alias, physicalName);
                context.createdQueues.push(physicalName);
            }
        });

        return this;
    }

    givenMessages(queueAlias: string, messages: ScenarioMessageInput[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            assert.ok(context.connectionString, 'Connection string must be set before seeding messages');
            const queueName = this.resolveQueueName(context, queueAlias);
            const client = new ServiceBusClient(context.connectionString);
            const sender = client.createSender(queueName);

            try {
                await sender.sendMessages(messages.map((message) => ({
                    messageId: message.messageId,
                    body: message.body,
                    applicationProperties: message.properties ?? {}
                })));
            } finally {
                await sender.close();
                await client.close();
            }
        });

        return this;
    }

    whenAddConnection(name: string, connectionString: string): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            await this.setCommandOverrides({
                inputBoxValues: [name, connectionString]
            });

            await vscode.commands.executeCommand('busdriver.addConnection');
            await this.resetCommandOverrides();
        });

        return this;
    }

    thenConnectionExists(name: string): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            const connections = await this.listConnections();
            assert.ok(connections.some(connection => connection.name === name));
        });

        return this;
    }

    whenRefreshConnections(): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            await vscode.commands.executeCommand('busdriver.refresh');
        });

        return this;
    }

    whenDeleteConnection(name: string): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            const connections = await this.listConnections();
            const connection = connections.find(entry => entry.name === name);
            assert.ok(connection, `Connection '${name}' not found for delete`);

            await this.setCommandOverrides({ warningResponse: 'Delete' });
            const treeItem = new ConnectionTreeItem(
                {
                    id: connection!.id,
                    name: connection!.name,
                    connectionString: connection!.connectionString,
                    createdAt: new Date(connection!.createdAt)
                },
                vscode.TreeItemCollapsibleState.Collapsed
            );
            await vscode.commands.executeCommand('busdriver.deleteConnection', treeItem);
            await this.resetCommandOverrides();
        });

        return this;
    }

    thenConnectionMissing(name: string): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            const connections = await this.listConnections();
            assert.ok(!connections.some(connection => connection.name === name));
        });

        return this;
    }

    whenConfigureMessageGridColumns(columns: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            await this.setCommandOverrides({
                inputBoxValues: [columns.join(', ')]
            });
            await vscode.commands.executeCommand('busdriver.configureMessageGridColumns');
            await this.resetCommandOverrides();
        });

        return this;
    }

    thenConfiguredMessageGridColumns(columns: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async () => {
            const configured = vscode.workspace
                .getConfiguration('busdriver')
                .get<string[]>('messageGrid.propertyColumns', []);

            assert.deepStrictEqual(configured, columns);
        });

        return this;
    }

    whenOpenQueueMessages(queueAlias: string): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            assert.ok(context.connectionId, 'Connection ID must be available before opening queue messages');
            const queueName = this.resolveQueueName(context, queueAlias);
            const queueItem = new QueueTreeItem(
                { name: queueName, connectionId: context.connectionId! },
                { activeMessageCount: 0 },
                vscode.TreeItemCollapsibleState.None
            );
            await vscode.commands.executeCommand('busdriver.showQueueMessages', queueItem);
        });

        return this;
    }

    thenPanelShowsQueue(queueAlias: string): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            const queueName = this.resolveQueueName(context, queueAlias);
            const panelQueue = await waitForValue(async () => {
                return vscode.commands.executeCommand<Queue | undefined>('busdriver.__test.getOpenQueuePanel');
            });

            assert.ok(panelQueue, `Expected queue panel for '${queueName}' to be open`);
            assert.strictEqual(panelQueue.name, queueName);
        });

        return this;
    }

    whenMoveMessages(sourceAlias: string, targetAlias: string, messageIds: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            assert.ok(context.connectionString, 'Connection string must exist before moving messages');
            assert.ok(context.connectionId, 'Connection ID must exist before moving messages');

            const sourceQueue = this.resolveQueueName(context, sourceAlias);
            const targetQueue = this.resolveQueueName(context, targetAlias);
            await this.setQueueCatalog(context.connectionId!, context.connectionName ?? 'Acceptance', [targetQueue]);

            const messages = await this.buildCommandMessages(context, sourceQueue, messageIds);
            assert.ok(messages.length > 0, 'Move operation requires at least one message');

            await this.setCommandOverrides({ quickPickLabel: targetQueue });
            await vscode.commands.executeCommand('busdriver.moveMessageToQueue', messages);
            await this.resetCommandOverrides();
            await this.clearQueueCatalog();
        });

        return this;
    }

    whenDeleteMessages(queueAlias: string, messageIds: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            const queueName = this.resolveQueueName(context, queueAlias);
            const messages = await this.buildCommandMessages(context, queueName, messageIds);
            assert.ok(messages.length > 0, 'Delete operation requires at least one message');

            await this.setCommandOverrides({ warningResponse: 'Delete' });
            await vscode.commands.executeCommand('busdriver.deleteMessages', messages);
            await this.resetCommandOverrides();
        });

        return this;
    }

    whenPurgeQueue(queueAlias: string): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            assert.ok(context.connectionString, 'Connection string must exist before purge');
            assert.ok(context.connectionId, 'Connection ID must exist before purge');

            const queueName = this.resolveQueueName(context, queueAlias);
            await this.setCommandOverrides({ warningResponse: 'Purge' });
            await vscode.commands.executeCommand('busdriver.purgeQueue', {
                queue: { name: queueName, connectionId: context.connectionId },
                connectionString: context.connectionString
            });
            await this.resetCommandOverrides();
        });

        return this;
    }

    thenQueueContains(queueAlias: string, messageIds: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            const queueName = this.resolveQueueName(context, queueAlias);
            const actualMessages = await this.peekMessageIds(context, queueName);

            for (const messageId of messageIds) {
                assert.ok(actualMessages.includes(messageId), `Expected queue '${queueName}' to contain message '${messageId}'`);
            }
        });

        return this;
    }

    thenQueueDoesNotContain(queueAlias: string, messageIds: string[]): AcceptanceScenarioBuilder {
        this.steps.push(async (context) => {
            const queueName = this.resolveQueueName(context, queueAlias);
            const actualMessages = await this.peekMessageIds(context, queueName);

            for (const messageId of messageIds) {
                assert.ok(!actualMessages.includes(messageId), `Expected queue '${queueName}' to not contain message '${messageId}'`);
            }
        });

        return this;
    }

    async run(): Promise<void> {
        const context: ScenarioContext = {
            title: this.title,
            queueNames: new Map(),
            createdQueues: []
        };

        let scenarioError: unknown;
        const cleanupErrors: string[] = [];
        try {
            for (const step of this.steps) {
                await step(context);
            }
        } catch (error) {
            scenarioError = error;
        }

        await this.runCleanupStep(
            () => vscode.commands.executeCommand('busdriver.__test.closeQueuePanel'),
            cleanupErrors,
            'dispose queue messages panel'
        );
        await this.runCleanupStep(() => this.resetCommandOverrides(), cleanupErrors, 'reset command overrides');
        await this.runCleanupStep(() => this.clearQueueCatalog(), cleanupErrors, 'clear queue catalog');
        await this.runCleanupStep(() => this.cleanupQueues(context), cleanupErrors, 'delete scenario queues');
        await this.runCleanupStep(() => vscode.commands.executeCommand('busdriver.__test.clearConnections'), cleanupErrors, 'clear seeded connections');

        if (!scenarioError && cleanupErrors.length > 0) {
            throw new Error(`Cleanup failed for scenario '${this.title}': ${cleanupErrors.join('; ')}`);
        }

        if (scenarioError) {
            if (cleanupErrors.length > 0) {
                console.error(`Cleanup warnings for scenario '${this.title}': ${cleanupErrors.join('; ')}`);
            }

            throw scenarioError;
        }
    }

    private scenarioSlug(): string {
        return this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    private physicalQueueName(alias: string): string {
        return `bd-${this.runId}-${this.scopeId}-${this.scenarioSlug()}-${alias}`.toLowerCase();
    }

    private scenarioQueuePrefix(): string {
        return `bd-${this.runId}-${this.scopeId}-${this.scenarioSlug()}-`.toLowerCase();
    }

    private resolveQueueName(context: ScenarioContext, alias: string): string {
        return context.queueNames.get(alias) ?? alias;
    }

    private async setCommandOverrides(overrides: CommandOverrides): Promise<void> {
        await vscode.commands.executeCommand('busdriver.__test.setCommandOverrides', {
            scopeId: this.scopeId,
            overrides
        });
    }

    private async resetCommandOverrides(): Promise<void> {
        await vscode.commands.executeCommand('busdriver.__test.resetCommandOverrides', {
            scopeId: this.scopeId
        });
    }

    private async setQueueCatalog(connectionId: string, connectionName: string, queueNames: string[]): Promise<void> {
        const entries: QueueCatalogEntry[] = queueNames.map((queueName) => ({
            queue: { name: queueName, connectionId },
            connection: { id: connectionId, name: connectionName }
        }));

        await vscode.commands.executeCommand('busdriver.__test.setQueueCatalog', { entries });
    }

    private async clearQueueCatalog(): Promise<void> {
        await vscode.commands.executeCommand('busdriver.__test.setQueueCatalog', { entries: undefined });
    }

    private async listConnections(): Promise<TestConnection[]> {
        const connections = await vscode.commands.executeCommand<TestConnection[]>('busdriver.__test.listConnections');
        return connections ?? [];
    }

    private async buildCommandMessages(
        context: ScenarioContext,
        queueName: string,
        messageIds: string[]
    ): Promise<QueueMessage[]> {
        assert.ok(context.connectionString, 'Connection string required');
        assert.ok(context.connectionId, 'Connection ID required');

        const client = new ServiceBusClient(context.connectionString);
        const receiver = client.createReceiver(queueName);

        try {
            const messages = await receiver.peekMessages(100);
            const filtered = messages.filter(message => {
                return typeof message.messageId === 'string' && messageIds.includes(message.messageId);
            });

            return filtered.map((message) => ({
                sequenceNumber: message.sequenceNumber?.toString() ?? '',
                messageId: message.messageId?.toString() ?? '',
                body: normalizeMessageBody(message.body),
                rawBody: message.body,
                properties: message.applicationProperties ?? {},
                enqueuedTime: message.enqueuedTimeUtc?.toISOString() ?? 'N/A',
                deliveryCount: message.deliveryCount ?? 0,
                sourceQueue: {
                    name: queueName,
                    connectionId: context.connectionId ?? ''
                },
                sourceConnectionString: context.connectionString
            }));
        } finally {
            await receiver.close();
            await client.close();
        }
    }

    private async peekMessageIds(context: ScenarioContext, queueName: string): Promise<string[]> {
        assert.ok(context.connectionString, 'Connection string required');
        const client = new ServiceBusClient(context.connectionString);
        const receiver = client.createReceiver(queueName);

        try {
            const messages = await receiver.peekMessages(200);
            return messages
                .map(message => message.messageId?.toString() ?? '')
                .filter(messageId => messageId.length > 0);
        } finally {
            await receiver.close();
            await client.close();
        }
    }

    private async cleanupQueues(context: ScenarioContext): Promise<void> {
        if (!context.connectionString) {
            return;
        }

        const admin = new ServiceBusAdministrationClient(context.connectionString);
        const cleanupCandidates = new Set<string>(context.createdQueues);
        const queuePrefix = this.scenarioQueuePrefix();

        for await (const queue of admin.listQueues()) {
            if (queue.name.toLowerCase().startsWith(queuePrefix)) {
                cleanupCandidates.add(queue.name);
            }
        }

        for (const queueName of cleanupCandidates) {
            await this.deleteQueueWithRetry(admin, queueName);
        }
    }

    private async deleteQueueWithRetry(admin: ServiceBusAdministrationClient, queueName: string): Promise<void> {
        const attempts = 5;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                await admin.deleteQueue(queueName);
                return;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (message.toLowerCase().includes('not found')) {
                    return;
                }

                if (attempt === attempts) {
                    throw error instanceof Error ? error : new Error(String(error));
                }

                await delay(500 * attempt);
            }
        }
    }

    private async runCleanupStep(
        step: () => unknown | Promise<unknown> | Thenable<unknown>,
        cleanupErrors: string[],
        description: string
    ): Promise<void> {
        try {
            await Promise.resolve(step());
        } catch (error) {
            cleanupErrors.push(`${description}: ${formatErrorMessage(error)}`);
        }
    }
}

function normalizeMessageBody(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

async function ensureQueue(admin: ServiceBusAdministrationClient, queueName: string): Promise<void> {
    try {
        await admin.createQueue(queueName);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('already exists')) {
            throw error instanceof Error ? error : new Error(String(error));
        }
    }
}

export function specScenario(title: string): AcceptanceScenarioBuilder {
    return new AcceptanceScenarioBuilder(title);
}

async function delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

async function waitForValue<T>(
    read: () => T | undefined | Promise<T | undefined> | Thenable<T | undefined>,
    attempts = 40,
    delayMs = 100
): Promise<T | undefined> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const value = await Promise.resolve(read());
        if (value !== undefined) {
            return value;
        }

        if (attempt < attempts) {
            await delay(delayMs);
        }
    }

    return undefined;
}
