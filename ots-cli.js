#!/usr/bin/env node

const fs = require('fs');
const OpenTimestamps = require('./src/open-timestamps.js');
const Context = require('./src/context.js');
const Utils = require('./src/utils.js');
// const Timestamp = require('nod ./timestamp.js');
const DetachedTimestampFile = require('./src/detached-timestamp-file.js');

const args = process.argv.slice(2);
const path = process.argv[1].split('/');
const title = path[path.length - 1];

if (args[0] === null) {
  showHelp();
}

// console.log('arguments: ', args);
switch (args[0]) {
  case 'info':
  case 'i':
    if (args.length !== 2) {
      console.log('Show information on a timestamp given as argument.\n');
      console.log(title + ' info: bad options number ');
      break;
    }
    info(args[1]);
    break;
  case 'stamp':
  case 's':
    if (args.length !== 2) {
      console.log('Create timestamp with the aid of a remote calendar.\n');
      console.log(title + ': bad options number ');
      break;
    }
    stamp(args[1]);
    break;
  case 'multistamp':
  case 'S':
    if (args.length < 2) {
      console.log('Create timestamp with the aid of a remote calendar.\n');
      console.log(title + ': bad options number ');
      break;
    }
    args.shift();
    multistamp(args);
    break;
  case 'verify':
  case 'v':

    if (args.length !== 2) {
      console.log('Verify the timestamp attestations given as argument.\n');
      console.log(title + ': bad options number ');
      break;
    }
    verify(args[1]);
    break;
  case 'upgrade':
  case 'u':
    if (args.length !== 2) {
      console.log('Upgrade remote calendar timestamps to be locally verifiable.\n');
      console.log(title + ': bad options number ');
      break;
    }
    upgrade(args[1]);
    break;
  case '--version':
  case '-V':
    console.log('Version: ' + title + ' v.' + require('./package.json').version + '\n');
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
        'Usage: ' + title + ' [options] {stamp,s,upgrade,u,verify,v,info} [arguments]\n\n' +
        'Subcommands:\n' +
        's, stamp FILE       \tCreate timestamp with the aid of a remote calendar, the output receipt will be saved with .ots\n' +
        'S, multistamp FILES       \tCreate timestamp with the aid of a remote calendar, the output receipt will be saved with .ots\n' +
        'i, info FILE_OTS \tShow information on a timestamp.\n' +
        'v, verify FILE_OTS\tVerify the timestamp attestations, expect original file present in the same directory without .ots\n' +
        'u, upgrade FILE_OTS\tUpgrade remote calendar timestamps to be locally verifiable.\n\n' +
        'Options:\n' +
        '-V, --version         \tprint ' + title + ' version.\n' +
        '-h, --help         \tprint this help.\n' +
        '\nLicense: LGPL.'
    );
}

function info(argsFileOts) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);
  Promise.all([otsPromise]).then(values => {
    const ots = values[0];

    const infoResult = OpenTimestamps.info(ots);
    console.log(infoResult);
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
      const ctx = new Context.StreamDeserialization(timestampBytes);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      if (detachedTimestampFile === undefined) {
        console.error('Invalid timestamp');
        return;
      }
      // console.log('STAMP result : ');
      // console.log(Utils.bytesToHex(detachedTimestampFile.timestamp.msg));

      const buffer = new Buffer(timestampBytes);
      const otsFilename = argsFile + '.ots';
      fs.exists(otsFilename, fileExist => {
        if (fileExist) {
          console.log('The timestamp proof \'' + otsFilename + '\' already exists');
        } else {
          fs.writeFile(otsFilename, buffer, 'binary', err => {
            if (err) {
              return console.log(err);
            }
            console.log('The timestamp proof \'' + otsFilename + '\' has been created!');
          });
        }
      });
    }).catch(err => {
      console.log('Error: ' + err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function multistamp(argsFiles) {
  const filePromises = [];
  argsFiles.forEach(argsFile => {
    filePromises.push(Utils.readFilePromise(argsFile, null));
  });

  Promise.all(filePromises).then(values => {
    const timestampBytesPromise = OpenTimestamps.multistamp(values);
    timestampBytesPromise.then(timestams => {
      timestams.forEach(timestamp => {
        const ctx = new Context.StreamDeserialization(timestamp);
        const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
        if (detachedTimestampFile === undefined) {
          console.error('Invalid timestamp');
        } else {
          console.log('STAMP result : ');
          console.log(Utils.bytesToHex(detachedTimestampFile.timestamp.msg));
        }
      });

/*
      const buffer = new Buffer(timestampBytes);
      const otsFilename = argsFile + '.ots';
      fs.exists(otsFilename, fileExist => {
        if (fileExist) {
          console.log('The timestamp proof \'' + otsFilename + '\' already exists');
        } else {
          fs.writeFile(otsFilename, buffer, 'binary', err => {
            if (err) {
              return console.log(err);
            }
            console.log('The timestamp proof \'' + otsFilename + '\' has been created!');
          });
        }
      }); */
    }).catch(err => {
      console.log('Error: ' + err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function verify(argsFileOts) {
  const argsFile = argsFileOts.replace('.ots', '');
  const filePromise = Utils.readFilePromise(argsFile, null);
  const filePromiseOts = Utils.readFilePromise(argsFileOts, null);
  Promise.all([filePromise, filePromiseOts]).then(values => {
    const file = values[0];
    const fileOts = values[1];

    console.log('Assuming target filename is \'' + argsFile + '\'');
    const verifyPromise = OpenTimestamps.verify(fileOts, file, false);
    verifyPromise.then(result => {
      if (result === undefined) {
        console.log('Pending or Bad attestation');
      } else {
        console.log('Success! Bitcoin attests data existed as of ' + (new Date(result * 1000)));
      }
    }).catch(err => {
      console.log(err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}

function upgrade(argsFileOts) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);
  otsPromise.then(ots => {
    const upgradePromise = OpenTimestamps.upgrade(ots);
    upgradePromise.then(timestampBytes => {
      // check timestamp
      if (Utils.arrEq(Utils.arrayToBytes(ots), Utils.arrayToBytes(timestampBytes))) {
        console.log('Timestamp not changed');
      } else {
        console.log('Timestamp has been successfully upgraded!');
        fs.writeFile(argsFileOts + '.bak', new Buffer(ots), 'binary', err => {
          if (err) {
            return console.log(err);
          }
          // console.log('The file .bak was saved!');
        });

        fs.writeFile(argsFileOts, new Buffer(timestampBytes), 'binary', err => {
          if (err) {
            return console.log(err);
          }
          // console.log('The file .ots was upgraded!');
        });
      }
    }).catch(err => {
      console.log('Error: ' + err);
    });
  }).catch(err => {
    console.log('Error: ' + err);
  });
}
