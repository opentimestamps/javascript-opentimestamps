const OpenTimestamps = require('../open-timestamps.js');
const Context = require('../context.js');
const Utils = require('../utils.js');
// const Timestamp = require('../timestamp.js');
const DetachedTimestampFile = require('../detached-timestamp-file.js');

const args = process.argv.slice(2);
const path = process.argv[1].split('/');
const title = path[path.length - 1];

if (args[0] === null) {
  showHelp();
}

console.log('arguments: ', args);
switch (args[0]) {
  case '--info':
  case '-i':
    console.log('Show information on a timestamp.\n');
    if (args.length !== 2) {
      console.log(title + ': bad options number ');
      break;
    }
    info(args[1]);
    break;
  case '--stamp':
  case '-s':
    console.log('Create timestamp with the aid of a remote calendar.\n');
    if (args.length !== 2) {
      console.log(title + ': bad options number ');
      break;
    }
    stamp(args[1]);
    break;
  case '--verify':
  case '-v':
    console.log('Verify the timestamp attestations.\n');
    if (args.length !== 3) {
      console.log(title + ': bad options number ');
      break;
    }
    verify(args[1], args[2]);
    break;
  case '--upgrade':
  case '-u':
    console.log('Upgrade remote calendar timestamps to be locally verifiable.\n');
    if (args.length !== 2) {
      console.log(title + ': bad options number ');
      break;
    }
    upgrade(args[1]);
    break;
  case '--version':
  case '-V':
    console.log('Version: ' + title + ' v.' + require('../package.json').version + '\n');
    break;
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(title + ': bad option: ' + args[0]);
}

function showHelp() {
  console.log(
        'Usage: ' + title + ' [options] [arguments]\n\n' +
        'Options:\n' +
        '-s, --stamp FILE       \tCreate timestamp with the aid of a remote calendar.\n' +
        '-i, --info FILE_OTS \tShow information on a timestamp.\n' +
        '-v, --verify FILE_OTS FILE\tVerify the timestamp attestations.\n' +
        '-u, --upgrade FILE_OTS\tUpgrade remote calendar timestamps to be locally verifiable.\n' +
        '-V, --version         \tprint ' + title + ' version.\n' +
        '\nLicense: LGPL.'
    );
}

function info(argsFileOts) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);
  Promise.all([otsPromise]).then(values => {
    const ots = values[0];

    const infoResult = OpenTimestamps.info(ots);
    console.log('INFO result : ' + infoResult);
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function stamp(argsFile) {
  const filePromise = Utils.readFilePromise(argsFile, null);
  Promise.all([filePromise]).then(values => {
    const file = values[0];

    const timestampBytesPromise = OpenTimestamps.stamp(file);
    timestampBytesPromise.then(timestampBytes => {
      const ctx = new Context.StreamDeserialization();
      ctx.open(timestampBytes);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      console.log('STAMP result : ');
      console.log(Utils.bytesToHex(detachedTimestampFile.timestamp.msg));
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function verify(argsFileOts, argsFile) {
  const filePromise = Utils.readFilePromise(argsFile, null);
  const filePromiseOts = Utils.readFilePromise(argsFileOts, null);
  Promise.all([filePromise, filePromiseOts]).then(values => {
    const file = values[0];
    const fileOts = values[1];

    const verifyPromise = OpenTimestamps.verify(fileOts, file);
    verifyPromise.then(result => {
      console.log('VERIFY result : ' + result);
    }).catch(err => {
      console.log(err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function upgrade(argsFileOts) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);
  Promise.all([otsPromise]).then(values => {
    const ots = values[0];

    const upgradePromise = OpenTimestamps.upgrade(ots);
    upgradePromise.then(timestampBytes => {
            // input timestamp serialization
      let ctx = new Context.StreamDeserialization();
      ctx.open(Utils.arrayToBytes(ots));
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      ctx = new Context.StreamSerialization();
      ctx.open();
      detachedTimestampFile.timestamp.serialize(ctx);
            // console.log('OTS TIMESTAMP');
            // console.log(Utils.bytesToHex(ctx.getOutput()));
      const inputTimestampSerialized = ctx.getOutput();

            // output timestamp serialization
            // console.log('OUTPUT TIMESTAMP');
            // console.log(Utils.bytesToHex(timestampBytes));
      const outputTimestampSerialized = timestampBytes;

            // check timestamp
      if (Utils.arrEq(inputTimestampSerialized, outputTimestampSerialized)) {
        console.log('Timestamp not changed');
      } else {
        console.log('Timestamp changed');
      }
            // assert.equals(Utils.arrEq(inputTimestampSerialized,outputTimestampSerialized));
    }).catch(err => {
      console.log('Error: ' + err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}
