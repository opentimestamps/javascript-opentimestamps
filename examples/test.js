
const OpenTimestamps = require('../src/open-timestamps.js');
const Context = require('../src/context.js');
const Utils = require('../src/utils.js');
const DetachedTimestampFile = require('../src/detached-timestamp-file.js');
const Ops = require('../src/ops.js');

let helloworldOts;
let helloworld;
let incompleteOts;
let incomplete;

const helloworldOtsPromise = Utils.readFilePromise('./examples/hello-world.txt.ots', null);
const helloworldPromise = Utils.readFilePromise('./examples/hello-world.txt', null);
const incompleteOtsPromise = Utils.readFilePromise('./examples/incomplete.txt.ots', null);
const incompletePromise = Utils.readFilePromise('./examples/incomplete.txt', null);

Promise.all([helloworldOtsPromise, helloworldPromise, incompleteOtsPromise, incompletePromise]).then(values => {
  helloworldOts = values[0];
  helloworld = values[1];
  incompleteOts = values[2];
  incomplete = values[3];

  // stamp(helloworld);
  info(helloworldOts);
  verify(helloworldOts, helloworld);
  upgrade(helloworldOts);

  stamp(incomplete);
  info(incompleteOts);
  verify(incompleteOts, incomplete);
  upgrade(incompleteOts);

  multistamp();
}).catch(err => {
  console.log('err=' + err);
});

function info(ots) {
  console.log('INFO');
  const infoResult = OpenTimestamps.info(ots);
  console.log('INFO result : ' + infoResult);
}

function verify(ots, plain) {
  console.log('VERIFY');
  const verifyPromise = OpenTimestamps.verify(ots, plain);
  verifyPromise.then(result => {
    console.log('VERIFY result : ' + result);
  }).catch(err => {
    console.log(err);
  });
}

function upgrade(ots) {
  console.log('UPGRADE');
  const upgradePromise = OpenTimestamps.upgrade(ots);
  upgradePromise.then(timestampBytes => {
    // input timestamp serialization
    console.log('OTS TIMESTAMP FILE');
    console.log(Utils.bytesToHex(ots));

    // output timestamp serialization
    console.log('UPGRADE TIMESTAMP FILE');
    console.log(Utils.bytesToHex(timestampBytes));

    // check timestamp
    if (ots.equals(timestampBytes)) {
      console.log('Timestamp not changed');
    } else {
      console.log('Timestamp changed');
    }
  }).catch(err => {
    console.log('ERROR ' + err);
  });
}

function stamp(plain) {
  console.log('STAMP');
  const timestampBytesPromise = OpenTimestamps.stamp(plain);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    console.log('STAMP result : ');
    console.log(Utils.bytesToHex(detachedTimestampFile.fileDigest()));
  });
}

function multistamp() {
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
    if (!Utils.arrEq(sha256[i], Utils.bytesToHex(fdHashes[i]))) {
      console.error('error checking hashes');
    }
  });

  const timestampBytesPromise = OpenTimestamps.multistamp(fdHashes, true);
  timestampBytesPromise.then(timestamps => {
    if (timestamps === undefined) {
      console.error('timestamps undefined');
      return;
    }
    if (timestamps.length !== fdHashes.length) {
      console.error('timestamps size invalid');
      return;
    }

    timestamps.forEach((timestamp, i) => {
      const ctx = new Context.StreamDeserialization(timestamps[i]);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

      console.log('MULTISTAMP result : ');
      console.log(Utils.bytesToHex(detachedTimestampFile.fileDigest()));

      if (detachedTimestampFile === undefined) {
        console.error('detachedTimestampFile undefined');
      }
      if (!Utils.arrEq(sha256[i], Utils.bytesToHex(detachedTimestampFile.fileDigest()))) {
        console.error('error checking hashes');
      }
    });
  }).catch(err => {
    console.error('err=' + err);
  });
}
