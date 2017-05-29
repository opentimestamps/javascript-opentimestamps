
const test = require('tape');
const rp = require('request-promise');
const Utils = require('../src/utils.js');
const OpenTimestamps = require('../src/open-timestamps.js');
const DetachedTimestampFile = require('../src/detached-timestamp-file.js');
const Context = require('../src/context.js');
const Ops = require('../src/ops.js');

// const Timestamp = require('../timestamp.js');

const baseUrl = 'https://raw.githubusercontent.com/opentimestamps/javascript-opentimestamps/master';
let incompleteOtsInfo;
let incompleteOts;
let incomplete;
let helloworldOts;
let helloworld;
let merkle2Ots;
let merkle2OtsInfo;
let unknown;
let unknownOts;
let knownUnknown;
let knownUnknownOts;
let merkle3;
let merkle3Ots;
let badStamp;
let badStampOts;

test('setup', assert => {
  const incompleteOtsInfoPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots.info', encoding: null});
  const incompleteOtsPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots', encoding: null});
  const incompletePromise = rp({url: baseUrl + '/examples/incomplete.txt', encoding: null});

  const helloworldOtsPromise = rp({url: baseUrl + '/examples/hello-world.txt.ots', encoding: null});
  const helloworldPromise = rp({url: baseUrl + '/examples/hello-world.txt', encoding: null});

  const merkle2OtsPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots', encoding: null});
  const merkle2OtsInfoPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots.info', encoding: null});

  const unknownPromise = rp({url: baseUrl + '/examples/unknown-notary.txt', encoding: null});
  const unknownOtsPromise = rp({url: baseUrl + '/examples/unknown-notary.txt.ots', encoding: null});

  const knownUnknownPromise = rp({url: baseUrl + '/examples/known-and-unknown-notary.txt', encoding: null});
  const knownUnknownOtsPromise = rp({url: baseUrl + '/examples/known-and-unknown-notary.txt.ots', encoding: null});

  const merkle3Promise = rp({url: baseUrl + '/examples/merkle3.txt', encoding: null});
  const merkle3OtsPromise = rp({url: baseUrl + '/examples/merkle3.txt.ots', encoding: null});

  const badStampPromise = rp({url: baseUrl + '/examples/bad-stamp.txt', encoding: null});
  const badStampOtsPromise = rp({url: baseUrl + '/examples/bad-stamp.txt.ots', encoding: null});

  Promise.all([
    incompleteOtsInfoPromise, incompleteOtsPromise, incompletePromise,
    helloworldOtsPromise, helloworldPromise,
    merkle2OtsPromise, merkle2OtsInfoPromise,
    unknownPromise, unknownOtsPromise,
    knownUnknownPromise, knownUnknownOtsPromise,
    merkle3Promise, merkle3OtsPromise,
    badStampPromise, badStampOtsPromise
  ]).then(values => {
    incompleteOtsInfo = values[0];
    incompleteOts = values[1];
    incomplete = values[2];
    helloworldOts = values[3];
    helloworld = values[4];
    merkle2Ots = values[5];
    merkle2OtsInfo = values[6];
    unknown = values[7];
    unknownOts = values[8];
    knownUnknown = values[9];
    knownUnknownOts = values[10];
    merkle3 = values[11];
    merkle3Ots = values[12];
    badStamp = values[13];
    badStampOts = values[14];
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
  assert.end();
});

test('OpenTimestamps.info()', assert => {
  const merkle2OtsInfoCalc = OpenTimestamps.info(merkle2Ots);
  assert.false(merkle2OtsInfoCalc === undefined);
  assert.false(merkle2Ots === undefined);
  assert.true(merkle2OtsInfo.equals(new Buffer(merkle2OtsInfoCalc)));
  assert.end();
});

test('OpenTimestamps.info()', assert => {
  const unknownInfoCalc = OpenTimestamps.info(unknownOts);
  assert.false(unknownInfoCalc === undefined);
  assert.false(unknownOts === undefined);
  assert.end();
});

test('OpenTimestamps.info()', assert => {
  const knownUnknownInfoCalc = OpenTimestamps.info(knownUnknownOts);
  assert.false(knownUnknownInfoCalc === undefined);
  assert.false(knownUnknownOts === undefined);
  assert.end();
});

test('OpenTimestamps.info()', assert => {
  const merkle3InfoCalc = OpenTimestamps.info(merkle3Ots);
  assert.false(merkle3InfoCalc === undefined);
  assert.false(merkle3Ots === undefined);
  assert.end();
});

test('OpenTimestamps.info()', assert => {
  const badStampInfoCalc = OpenTimestamps.info(badStampOts);
  assert.false(badStampInfoCalc === undefined);
  assert.false(badStampOts === undefined);
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
    incomplete,
    helloworld
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

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(unknownOts, unknown, false);
  verifyPromise.then(result => {
    assert.true(result === undefined);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(knownUnknownOts, knownUnknown, false);
  verifyPromise.then(result => {
    assert.true(result === undefined);
    assert.true(knownUnknownOts !== undefined);
    assert.true(knownUnknown !== undefined);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(badStampOts, badStamp, false);
  verifyPromise.then(result => {
    assert.true(result === undefined);
    assert.true(badStamp !== undefined);
    assert.true(badStampOts !== undefined);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.verify()', assert => {
  const verifyPromise = OpenTimestamps.verify(merkle3Ots, merkle3, false);
  verifyPromise.then(result => {
    assert.true(result === undefined);
    assert.true(merkle3 !== undefined);
    assert.true(merkle3Ots !== undefined);
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

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(unknownOts);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.true(unknownOts !== null);
    assert.true(unknownOts.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(knownUnknownOts);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.true(knownUnknownOts !== null);
    assert.false(knownUnknownOts.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(merkle3Ots);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.true(merkle3Ots !== null);
    assert.false(merkle3Ots.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

test('OpenTimestamps.upgrade()', assert => {
  const upgradePromise = OpenTimestamps.upgrade(badStampOts);
  upgradePromise.then(timestampBytes => {
    assert.true(timestampBytes !== null);
    assert.true(timestampBytes.length > 0);
    assert.true(badStampOts !== null);
    assert.true(badStampOts.equals(timestampBytes));
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});

