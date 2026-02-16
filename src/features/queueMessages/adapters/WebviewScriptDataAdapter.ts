export function serializeForInlineScript(value: unknown): string {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
        return 'null';
    }

    return serialized
        .replace(/<\//g, '<\\/')
        .replace(/<!--/g, '<\\!--')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
