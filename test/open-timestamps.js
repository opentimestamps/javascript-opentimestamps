
const test = require('tape');
const Utils = require('../src/utils.js');
const OpenTimestamps = require('../src/open-timestamps.js');
const DetachedTimestampFile = require('../src/detached-timestamp-file.js');
const Context = require('../src/context.js');
const Ops = require('../src/ops.js');
// const Timestamp = require('../timestamp.js');

let incompleteOtsInfo;
let incompleteOts;
let incomplete;
let helloworldOts;
let helloworld;
let merkle2Ots;
let merkle2OtsInfo;

test('setup', assert => {
  const incompleteOtsInfoPromise = Utils.readFilePromise('./examples/incomplete.txt.ots.info', 'utf8');
  const incompleteOtsPromise = Utils.readFilePromise('./examples/incomplete.txt.ots', null);
  const incompletePromise = Utils.readFilePromise('./examples/incomplete.txt', null);

  const helloworldOtsPromise = Utils.readFilePromise('./examples/hello-world.txt.ots', null);
  const helloworldPromise = Utils.readFilePromise('./examples/hello-world.txt', null);

  const merkle2OtsPromise = Utils.readFilePromise('./examples/merkle2.txt.ots', null);
  const merkle2OtsInfoPromise = Utils.readFilePromise('./examples/merkle2.txt.ots.info', 'utf8');

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
  assert.equals(incompleteOtsInfo, otsInfoCalc, 'ots info match');

  const merkle2OtsInfoCalc = OpenTimestamps.info(merkle2Ots);
  assert.false(merkle2OtsInfoCalc === undefined);
  assert.false(merkle2Ots === undefined);
  assert.equals(merkle2OtsInfo, merkle2OtsInfoCalc, 'ots info match on merkle2');

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
test('OpenTimestamps.stamp()', assert => {
  const sha256Incomplete = '05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9';
  const ctxIncomplete = new Context.StreamDeserialization(incomplete);
  const fdHashIncomplete = new Ops.OpSHA256().hashFd(ctxIncomplete);
  assert.equals(sha256Incomplete, Utils.bytesToHex(fdHashIncomplete), 'checking hashes');

  const sha256Helloworld = '03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340';
  const ctxHelloworld = new Context.StreamDeserialization(helloworld);
  const fdHashHelloworld = new Ops.OpSHA256().hashFd(ctxHelloworld);
  assert.equals(sha256Helloworld, Utils.bytesToHex(fdHashHelloworld), 'checking hashes');

  const timestampBytesPromise = OpenTimestamps.multistamp([fdHashIncomplete,fdHashHelloworld], true);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    assert.false(detachedTimestampFile === undefined);
    //assert.equals(sha256, Utils.bytesToHex(detachedTimestampFile.fileDigest()), 'checking hashes');
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// VERIFY TESTS

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(incompleteOts, incomplete);
  verifyPromise.then(result => {
    assert.true(result === undefined);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(helloworldOts, helloworld);
  verifyPromise.then(result => {
    assert.true(result !== undefined);
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

