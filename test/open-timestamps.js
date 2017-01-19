
const test = require('tape');
const Utils = require('../utils.js');
const OpenTimestamps = require('../open-timestamps.js');
const DetachedTimestampFile = require('../detached-timestamp-file.js');
const Context = require('../context.js');
// const Calendar = require('../calendar.js');
// const Timestamp = require('../timestamp.js');

let incompleteOtsInfo;
let incompleteOts;
let incomplete;
let helloworldOts;
let helloworld;

test('setup', assert => {
  const incompleteOtsInfoPromise = Utils.readFilePromise('./examples/incomplete.txt.ots.info', 'utf8');
  const incompleteOtsPromise = Utils.readFilePromise('./examples/incomplete.txt.ots', null);
  const incompletePromise = Utils.readFilePromise('./examples/incomplete.txt', null);
  const helloworldOtsPromise = Utils.readFilePromise('./examples/hello-world.txt.ots', null);
  const helloworldPromise = Utils.readFilePromise('./examples/hello-world.txt', null);

  Promise.all([incompleteOtsInfoPromise, incompleteOtsPromise, incompletePromise, helloworldOtsPromise, helloworldPromise]).then(values => {
    incompleteOtsInfo = values[0];
    incompleteOts = values[1];
    incomplete = values[2];
    helloworldOts = values[3];
    helloworld = values[4];
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
  assert.end();
});

// STAMP TESTS

test('OpenTimestamps.stamp()', assert => {
  const timestampBytesPromise = OpenTimestamps.stamp(incomplete);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    assert.equals('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9', Utils.bytesToHex(detachedTimestampFile.timestamp.msg), 'checking hashes');
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

// VERIFY TESTS

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(incompleteOts, incomplete);
  verifyPromise.then(result => {
    assert.false(result);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(helloworldOts, helloworld);
  verifyPromise.then(result => {
    assert.true(result);
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

