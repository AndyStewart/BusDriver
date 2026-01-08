export interface MessageGridColumnsRepository {
    getPropertyColumns(): Promise<unknown>;
    setPropertyColumns(columns: string[]): Promise<void>;
}
