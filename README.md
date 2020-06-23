# redis-async

A feature-complete asynchronous client for Redis, with support for TypeScript
## Installation

```sh
npm install @mjplabs/redis-async
```

## Initializing a Redis client

#### Javascript

```javascript
var redis = require('redis-async');
var client = redis.createAsyncClient();
```

#### TypeScript

```typescript
import { createAsyncClient } from '@mjplabs/redis-async';
const client = createAsyncClient();
```

**Note:** `createAsyncClient` takes exactly the same arguments as `createClient` in the `node_redis` package.

## Running Redis commands asynchronously

To run async commands, you will need to use either `client.runSingle` or `client.runMultiple` (unless you want to use a [database helper method](#working-with-databases)). Let's look at `runMultiple` first.

`runMultiple` takes a function as a parameter. This function is passed an empty `node_redis.Multi` object, and it must return another `Multi` object loaded with all of the commands you wish to run. `runMultiple` returns a Promise linked to an array of the Redis cache's response to each command in the chain.

#### Javascript and TypeScript

```typescript
let response = await client.runMultiple(m => m
  .get("key1")
  .get("key2")
  .get("key3")
);
console.log(response);
// ----> ['value1', 'value2', 'value3']
```

**Note:** _Refer to the [node_redis documentation](https://github.com/NodeRedis/node_redis) for a complete list of commands which may be applied to a `Multi` object._

`runSingle` works the exact same way, except it assumes that only one command is being run. This means that it knows to return a single string instead of an array of strings. 

#### Javascript and TypeScript

```typescript
await client.runSingle(m => m.set('key', 'value'));
response = await client.runSingle(m => m.get('key')));
console.log(response);
// ----> 'value'
```

## Working with databases

To cut down on the clutter of selecting  databases, `redis-async` provides helper methods `runInDb` and `runMultipleInDb`. All commands passed to either method are guaranteed to be run in the correct database. The database index is the first parameter of both methods.

#### Javascript and TypeScript

```typescript
await client.runInDb(2, m => m.set('key', 'greetings from database 2'));
await client.runInDb(0, m => m.set('key', 'greetings from database 0'));

response = await client.runInDb(2, m => m.get('key'));
console.log(response);
// ----> 'greetings from database 2'

response = await client.runInDb(0, m => m.get('key'));
console.log(response)
// ----> 'greetings from database 0'
```

```typescript
await client.runMultipleInDb(2, m => m
  .set("key1", "2_1")
  .set("key2", "2_2")
);

await client.runMultipleInDb(0, m => m
  .set("key1", "0_1")
  .set("key2", "0_2")
);

response = await client.runMultipleInDb(2, m => m
  .get("key1")
  .get("key2")
);
console.log(response);
// ----> ['2_1', '2_2']

response = await client.runMultipleInDb(0, m => m
  .get("key1")
  .get("key2")
);
console.log(response);
// ----> ['0_1', '0_2']
```

We also provide a function `getAllKeys` which returns a promise to a  list of all keys in a given database.

#### Javascript and TypeScript

```typescript
response = await client.getAllKeys(2);
console.log(response);
// ----> ['key1', 'key2']
```

## Testing

```sh
npm test
```

## Note on TypeScript support

This module has built-in typing for every possible Redis command. The specification of the actual Redis commands is handled by `node_redis`'s existing Multi command-chaining system, meaning that the only thing we need to manually promisify and type is the `multi.exec` method. As a result, any command that works in `node_redis` will work perfectly in `redis-async` (even with strict type checks).
