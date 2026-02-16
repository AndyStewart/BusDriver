export function getNextSequenceNumber(sequenceNumber?: string): string | undefined {
    if (!sequenceNumber) {
        return undefined;
    }

    if (!/^\d+$/.test(sequenceNumber)) {
        return undefined;
    }

    try {
        return (BigInt(sequenceNumber) + 1n).toString();
    } catch {
        return undefined;
    }
}
