
const test = require('tape');
const rp = require('request-promise');
const Utils = require('../src/utils.js');
const OpenTimestamps = require('../src/open-timestamps.js');
const DetachedTimestampFile = require('../src/detached-timestamp-file.js');
const Context = require('../src/context.js');
const Ops = require('../src/ops.js');

// const Timestamp = require('../timestamp.js');

const baseUrl = 'https://raw.githubusercontent.com/eternitywall/javascript-opentimestamps/master';
let incompleteOtsInfo;
let incompleteOts;
let incomplete;
let helloworldOts;
let helloworld;
let merkle2Ots;
let merkle2OtsInfo;

test('setup', assert => {
  const incompleteOtsInfoPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots.info', encoding: null});
  const incompleteOtsPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots', encoding: null});
  const incompletePromise = rp({url: baseUrl + '/examples/incomplete.txt', encoding: null});

  const helloworldOtsPromise = rp({url: baseUrl + '/examples/hello-world.txt.ots', encoding: null});
  const helloworldPromise = rp({url: baseUrl + '/examples/hello-world.txt', encoding: null});

  const merkle2OtsPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots', encoding: null});
  const merkle2OtsInfoPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots.info', encoding: null});

  Promise.all([incompleteOtsInfoPromise, incompleteOtsPromise, incompletePromise, helloworldOtsPromise, helloworldPromise, merkle2OtsPromise, merkle2OtsInfoPromise]).then(values => {
    incompleteOtsInfo = values[0];
    incompleteOts = values[1];
    incomplete = values[2];
    helloworldOts = values[3];
    helloworld = values[4];
    merkle2Ots = values[5];
    merkle2OtsInfo = values[6];
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// INFO TESTS
test('OpenTimestamps.info()', assert => {
  const otsInfoCalc = OpenTimestamps.info(incompleteOts);
  assert.false(otsInfoCalc === undefined);
  assert.false(incompleteOts === undefined);
  assert.true(incompleteOtsInfo.equals(new Buffer(otsInfoCalc)));

  const merkle2OtsInfoCalc = OpenTimestamps.info(merkle2Ots);
  assert.false(merkle2OtsInfoCalc === undefined);
  assert.false(merkle2Ots === undefined);
  assert.true(merkle2OtsInfo.equals(new Buffer(merkle2OtsInfoCalc)));

  assert.end();
});

// STAMP TESTS FILE

test('OpenTimestamps.stamp()', assert => {
  const timestampBytesPromise = OpenTimestamps.stamp(incomplete);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    assert.false(detachedTimestampFile === undefined);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// STAMP TESTS HASH
test('OpenTimestamps.stamp()', assert => {
  const sha256 = '05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9';

  const ctx = new Context.StreamDeserialization(incomplete);
  const fdHash = new Ops.OpSHA256().hashFd(ctx);
  assert.equals(sha256, Utils.bytesToHex(fdHash), 'checking hashes');

  const timestampBytesPromise = OpenTimestamps.stamp(fdHash, true);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    assert.false(detachedTimestampFile === undefined);
    assert.equals(sha256, Utils.bytesToHex(detachedTimestampFile.fileDigest()), 'checking hashes');
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// MULTISTAMP TESTS HASH

test('OpenTimestamps.multistamp()', assert => {
  const files = [
    incomplete
  ];
  const sha256 = [
    '05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9',
    '03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340'
  ];
  const fdHashes = [];
  files.forEach(file => {
    const fdHash = new Ops.OpSHA256().hashFd(new Context.StreamDeserialization(file));
    fdHashes.push(fdHash);
  });
  files.forEach((files, i) => {
    assert.equals(sha256[i], Utils.bytesToHex(fdHashes[i]), 'checking hashes');
  });

  const timestampBytesPromise = OpenTimestamps.multistamp(fdHashes, true);
  timestampBytesPromise.then(timestamps => {
    assert.false(timestamps === undefined);
    assert.equals(timestamps.length, fdHashes.length);

    timestamps.forEach((timestamp, i) => {
      const ctx = new Context.StreamDeserialization(timestamps[i]);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      assert.false(detachedTimestampFile === undefined);
      assert.equals(sha256[i], Utils.bytesToHex(detachedTimestampFile.fileDigest()), 'checking hashes');
    });

    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// VERIFY TESTS

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(incompleteOts, incomplete, false);
  verifyPromise.then(result => {
    assert.true(result === undefined); // verify on python call upgrade, in this case result should be 1473227803
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(helloworldOts, helloworld, false);
  verifyPromise.then(result => {
    assert.true(result !== undefined);
    assert.equal(result, 1432827678);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// UPGRADE TESTS

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(incompleteOts);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.false(incompleteOts.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(helloworldOts);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.true(helloworldOts.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

