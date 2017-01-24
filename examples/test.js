
const OpenTimestamps = require('../src/open-timestamps.js');
const Context = require('../src/context.js');
const Utils = require('../src/utils.js');
// const Timestamp = require('../timestamp.js');
const DetachedTimestampFile = require('../src/detached-timestamp-file.js');
// const ByteBuffer = require('bytebuffer');
// const DetachedTimestampFile = require('../detached-timestamp-file.js');

let helloworldOts;
let helloworld;
let incompleteOts;
let incomplete;

const helloworldOtsPromise = Utils.readFilePromise('./examples/hello-world.txt.ots', null);
const helloworldPromise = Utils.readFilePromise('./examples/hello-world.txt', null);
const incompleteOtsPromise = Utils.readFilePromise('./examples/incomplete.txt.ots', null);
const incompletePromise = Utils.readFilePromise('./examples/incomplete.txt', null);

Promise.all([helloworldOtsPromise, helloworldPromise]).then(values => {
  helloworldOts = values[0];
  helloworld = values[1];

  stamp(helloworld);
  info(helloworldOts);
  verify(helloworldOts, helloworld);
  upgrade(helloworldOts);
}).catch(err => {
  console.log('err=' + err);
});

Promise.all([incompleteOtsPromise, incompletePromise]).then(values => {
  incompleteOts = values[0];
  incomplete = values[1];

  stamp(incomplete);
  info(incompleteOts);
  verify(incompleteOts, incomplete);
  upgrade(incompleteOts);
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
    // console.log('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9');
    console.log(Utils.bytesToHex(detachedTimestampFile.timestamp.msg));
  });
}
