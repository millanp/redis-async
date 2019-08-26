"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var redis_1 = require("redis");
var bluebird_1 = require("bluebird");
var assert = require("assert");
function getAsyncRedisClient(redisCacheKey, redisCacheHostName) {
    if (!redisCacheKey || !redisCacheHostName) {
        assert(process.env.REDISCACHEKEY, "redisCacheKey not provided as an argument, so\n            REDISCACHEKEY must be set as an environment variable");
        assert(process.env.REDISCACHEHOSTNAME, "redisCacheHostName not provided as an argument, so\n            REDISCACHEHOSTNAME must be set as an environment variable");
        redisCacheKey = process.env.REDISCACHEKEY;
        redisCacheHostName = process.env.REDISCACHEHOSTNAME;
    }
    var client = bluebird_1.promisifyAll(redis_1.createClient(6380, redisCacheHostName, {
        auth_pass: redisCacheKey,
        tls: { servername: redisCacheHostName }
    }));
    client.runMultiple = function (appendCommands) {
        var multi = (function (cli) { return cli.multi(); })(client);
        multi = appendCommands(multi);
        return bluebird_1.promisifyAll(multi).execAsync();
    };
    client.runSingle = function (command) {
        return (function (cli) {
            // Single command, so only return the first element
            return cli.runMultiple(command).then(function (arr) { return arr[0]; });
        })(client);
    };
    client.runMultipleInDb = function (database, appendCommands) {
        var selected = (function (cli) { return cli.multi().select(database); })(client);
        selected = appendCommands(selected);
        // slice to remove result of select command
        return bluebird_1.promisifyAll(selected)
            .execAsync()
            .then(function (arr) { return arr.slice(1); });
    };
    client.runInDb = function (database, command) {
        return (function (cli) {
            return cli.runMultipleInDb(database, command).then(function (arr) { return arr[0]; });
        })(client);
    };
    client.getAllKeys = function (database) {
        var match = '*';
        var cursor = '0';
        var keys = [];
        // Recursive call to Redis SCAN. Recursion continues until cursor = '0'
        function innerscan() {
            return (function (client) {
                return client
                    .runInDb(database, function (multi) {
                    return multi.scan(cursor, 'MATCH', match, 'COUNT', '100');
                })
                    .then(function (resArr) {
                    var res = resArr[0];
                    cursor = res[0];
                    keys.push.apply(keys, res[1]);
                    if (cursor === '0') {
                        return keys;
                    }
                    return innerscan();
                });
            })(client);
        }
        return bluebird_1.try(innerscan);
    };
    return client;
}
exports.getAsyncRedisClient = getAsyncRedisClient;
