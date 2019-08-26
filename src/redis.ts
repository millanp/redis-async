import { RedisClient, createClient, Multi } from 'redis';
import { promisifyAll, try as bluebirdTry } from 'bluebird';

export interface AsyncRedisClient extends RedisClient {
    getAllKeys(database: number): Promise<string[]>;
    runMultipleInDb(
        database: number,
        appendCommands: (multi: Multi) => Multi
    ): Promise<any[]>;
    runInDb(
        database: number,
        command: (multi: Multi) => Multi
    ): Promise<any>;
    runSingle(commands: (multi: Multi) => Multi): Promise<any>;
    runMultiple(commands: (multi: Multi) => Multi): Promise<any[]>;
}

export interface AsyncMulti extends Multi {
    execAsync(): Promise<string[]>;
}

export function createAsyncClient(...args: any[]): AsyncRedisClient {
    const client: AsyncRedisClient = promisifyAll(
        createClient(...args)
    ) as AsyncRedisClient;

    client.runMultiple = (appendCommands: (multi: Multi) => Multi): Promise<any[]> => {
        let multi = (cli => cli.multi())(client);
        multi = appendCommands(multi);
        return (promisifyAll(multi) as AsyncMulti).execAsync();
    }

    client.runSingle = (command: (multi: Multi) => Multi): Promise<any> =>
        (cli => 
            // Single command, so only return the first element
            cli.runMultiple(command).then(arr => arr[0]))
        (client);

    client.runMultipleInDb = (
        database: number,
        appendCommands: (multi: Multi) => Multi
    ): Promise<any[]> => {
        let selected = (cli => cli.multi().select(database))(client);
        selected = appendCommands(selected);
        // slice to remove result of select command
        return (promisifyAll(selected) as AsyncMulti)
            .execAsync()
            .then(arr => arr.slice(1));
    };
    
    client.runInDb = (
        database: number,
        command: (multi: Multi) => Multi
    ): Promise<any> =>
        (cli =>
            cli.runMultipleInDb(database, command).then(arr => arr[0]))
        (client);

    client.getAllKeys = (database: number): Promise<string[]> => {
        return (client => {
            const match = '*';
            let cursor = '0';
            // Recursive call to Redis SCAN. Recursion continues until cursor = '0'
            async function innerscan(): Promise<string[]> {
                let keys: string[] = [];
                return client
                    .runInDb(database, multi =>
                        multi.scan(cursor, 'MATCH', match, 'COUNT', '100')
                    )
                    .then(async res => {
                        cursor = res[0];
                        keys.push(...res[1]);
                        if (cursor === '0') {
                            return keys;
                        }
                        return keys.concat(await innerscan());
                    });
            }
            return bluebirdTry(innerscan);
        })(client);
    };

    return client;
}
