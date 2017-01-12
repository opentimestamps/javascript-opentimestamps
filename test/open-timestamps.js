
const test = require('tape');
const Utils = require('../utils.js');
const OpenTimestamps = require('../open-timestamps.js');
const DetachedTimestampFile = require('../detached-timestamp-file.js');
const Context = require('../context.js');

let otsInfo;
let ots;
let incomplete;

let helloworldOts;
let helloworld;

test('setup', assert => {
  const otsInfoPromise = Utils.readFilePromise('./test/incomplete.txt.ots.info', 'utf8');
  const otsPromise = Utils.readFilePromise('./test/incomplete.txt.ots', null);
  const incompletePromise = Utils.readFilePromise('./test/incomplete.txt', null);
  const helloworldOtsPromise = Utils.readFilePromise('./test/hello-world.txt.ots', null);
  const helloworldPromise = Utils.readFilePromise('./test/hello-world.txt', null);

  Promise.all([otsInfoPromise, otsPromise, incompletePromise, helloworldOtsPromise, helloworldPromise]).then(values => {
    otsInfo = values[0];
    ots = values[1];
    incomplete = values[2];
    helloworldOts = values[3];
    helloworld = values[4];
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});
/*
test('OpenTimestamps.info()', assert => {
  const otsInfoCalc = OpenTimestamps.info(ots);
  assert.false(otsInfoCalc === undefined);
  assert.false(otsInfo === undefined);
  assert.equals(otsInfo, otsInfoCalc, 'ots info match');
  assert.end();
});

test('OpenTimestamps.stamp()', assert => {
  const timestampBytesPromise = OpenTimestamps.stamp(incomplete);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization();
    ctx.open(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    assert.equals('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9', Utils.bytesToHex(detachedTimestampFile.timestamp.msg), 'checking hashes');
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});
*/

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(ots, incomplete);
  verifyPromise.then(result => {
    assert.false(result);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});
/*
test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(helloworldOts, helloworld);
  verifyPromise.then(result => {
    assert.true(result);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
}); */
