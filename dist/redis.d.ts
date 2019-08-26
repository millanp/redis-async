import { RedisClient, Multi } from 'redis';
export interface AsyncRedisClient extends RedisClient {
    getAllKeys(database: number): Promise<string[]>;
    runMultipleInDb(database: number, appendCommands: (multi: Multi) => Multi): Promise<any[]>;
    runInDb(database: number, command: (multi: Multi) => Multi): Promise<any>;
    runSingle(commands: (multi: Multi) => Multi): Promise<any>;
    runMultiple(commands: (multi: Multi) => Multi): Promise<any[]>;
}
export interface AsyncMulti extends Multi {
    execAsync(): Promise<string[]>;
}
export declare function getAsyncRedisClient(redisCacheKey?: string, redisCacheHostName?: string): AsyncRedisClient;
