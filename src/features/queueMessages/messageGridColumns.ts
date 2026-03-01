export const BUILT_IN_MESSAGE_GRID_HEADERS = [
    'Sequence #',
    'Message ID',
    'Enqueued Time',
    'Delivery Count'
];

export function normalizePropertyColumns(value: unknown): string[] {
    const entries = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : [];

    return entries
        .map(entry => typeof entry === 'string' ? entry.trim() : '')
        .filter(entry => entry.length > 0)
        .map(entry => entry.replace(/^properties\./i, ''));
}

export function formatPropertyCellValue(value: unknown): string {
    if (value === undefined) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    const json = JSON.stringify(value);
    return json ?? '';
}

export function buildMessageGridHeaders(propertyColumns: string[]): string[] {
    return [...BUILT_IN_MESSAGE_GRID_HEADERS, ...propertyColumns];
}

export function buildPropertyRowCells(
    properties: Record<string, unknown> | undefined,
    propertyColumns: string[]
): string[] {
    const safeProperties = properties ?? {};

    return propertyColumns.map(key => {
        const value = getPropertyValue(safeProperties, key);
        return formatPropertyCellValue(value);
    });
}

function getPropertyValue(properties: Record<string, unknown>, key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(properties, key)) {
        return properties[key];
    }

    const segments = key.split('.').filter(segment => segment.length > 0);
    if (segments.length === 0) {
        return undefined;
    }

    let current: unknown = properties;
    for (const segment of segments) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }

        const record = current as Record<string, unknown>;
        if (!Object.prototype.hasOwnProperty.call(record, segment)) {
            return undefined;
        }

        current = record[segment];
    }

    return current;
}
