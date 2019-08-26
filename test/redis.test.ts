import { createAsyncClient, AsyncRedisClient } from '../src/redis';

import redis = require('redis');
import redisMock = require('redis-mock');

jest.spyOn(redis, 'createClient').mockImplementation(redisMock.createClient);

let client: AsyncRedisClient;

beforeEach(() => {
    client = createAsyncClient();
});

afterEach((done) => {
    client.flushall(() => {done()});
});

test('runMultiple works as expected', async () => {
    await client.runMultiple(m => m
        .set('key1', 'val1')
        .set('key2', 'val2')
    );
    const result = await client.runMultiple(m => m
        .get('key1')
        .get('key2')
    );
    expect(result).toEqual(['val1', 'val2']);
});

test('runSingle works as expected', async () => {
    await client.runSingle(m => m.set('key1', 'val1'));
    const result = await client.runSingle(m => m.get('key1'));
    expect(result).toEqual('val1');
});

test('runMultipleInDb works as expected', async () => {
    await client.runMultipleInDb(2, m => m
        .set('key1', '2_1')
        .set('key2', '2_2')
    );
    await client.runMultipleInDb(0, m => m
        .set('key1', '0_1')
        .set('key2', '0_2')
    );
    
    const db2Result = await client.runMultipleInDb(2, m => m
        .get('key1')
        .get('key2')
    );
    expect(db2Result).toEqual(['2_1', '2_2']);
    
    const db0Result = await client.runMultipleInDb(0, m => m
        .get('key1')
        .get('key2')
    );
    expect(db0Result).toEqual(['0_1', '0_2']);
});

test('runInDb works as expected', async () => {
    await client.runInDb(3, m => m.set('key', 'val'));
    const goodResult = await client.runInDb(3, m => m.get('key'));
    expect(goodResult).toEqual('val');
    const badResult = await client.runInDb(0, m => m.get('key'));
    expect(badResult).toBeNull();
});

test('getAllKeys works as expected', async () => {
    await client.runMultipleInDb(2, m => m
        .set('key1', 'val1')
        .set('key2', 'val2')
        .set('key3', 'val3')
        .set('key4', 'val4')
    );
    expect(await client.getAllKeys(2)).toEqual(['key1', 'key2', 'key3', 'key4']);
});