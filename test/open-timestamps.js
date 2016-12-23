
const test = require('tape');
const Utils = require('../utils.js');
const OpenTimestamps = require('../open-timestamps.js');

let otsInfo;
let ots;

test('setup', assert => {
  const otsInfoPromise = Utils.readFilePromise('./test/incomplete.txt.ots.info', 'utf8');
  const otsPromise = Utils.readFilePromise('./test/incomplete.txt.ots', null);

  Promise.all([otsInfoPromise, otsPromise]).then(values => {
    otsInfo = values[0];
    ots = values[1];
    assert.end();
  });
});

test('OpenTimestamps.info()', assert => {
  const otsInfoCalc = OpenTimestamps.info(Utils.bytesToHex(ots));
  assert.false(otsInfoCalc === undefined);
  assert.false(otsInfo === undefined);
  assert.equals(otsInfo, otsInfoCalc, 'ots info match');
  assert.end();
});

test('OpenTimestamps.stamp()', assert => {
  assert.end();
});
