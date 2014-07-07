var path = require('path');
var mime = require('mime');
var storage = require('azure-storage');

try {
    var config = require('./config');
} catch(e) {
    console.log('Please create and configure a config.js file using config.template.js');
    process.exit(1);
}

var client = storage.createBlobService(config.storageName, config.storageKey);

var blobs = [];
function aggregateBlobs(err, result, cb) {
    if (err) {
        cb(er);
    } else {
        blobs = blobs.concat(result.entries);
        if (result.continuationToken !== null) {
            client.listBlobsSegmented(
                config.containerName,
                result.continuationToken,
                aggregateBlobs);
        } else {
            cb(null, blobs);
        }
    }
}

client.listBlobsSegmented(config.containerName, null, function(err, result) {
    aggregateBlobs(err, result, function(err, blobs) {
        if (err) {
            console.log(err);
        } else {
            result.entries.forEach(function(entry) {
                var blobName = entry.name;
                var expectedMime = mime.lookup(blobName);
                var actualMime = entry.properties['content-type'];
                var match = actualMime == expectedMime;
                console.log("blob: " + blobName);
                console.log("expected: " + expectedMime);
                console.log("actual: " + actualMime);
                console.log("match: " + match);
                console.log();
                if (!match) {
                    client.getBlobProperties(config.containerName, blobName, function(err, result, response) {
                        var properties = result;
                        properties.contentType = expectedMime;
                        client.setBlobProperties(config.containerName, blobName, properties, function() {
                            console.log(arguments);
                        });
                    });
                }
            });
        }
    });
});
