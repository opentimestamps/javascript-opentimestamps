#!/usr/bin/env node

// Dependencies
const fs = require('fs');
const program = require('commander');
const OpenTimestamps = require('./src/open-timestamps.js');
const Context = require('./src/context.js');
const Utils = require('./src/utils.js');
const DetachedTimestampFile = require('./src/detached-timestamp-file.js');
const Ops = require('./src/ops.js');

// Constants
const path = process.argv[1].split('/');
const title = path[path.length - 1];
let isExecuted = false;

// Parse parameters

program
    .version(require('./package.json').version);

const infoCommand = program
    .command('info [file_ots]')
    .alias('i')
    .option('-v, --verbose', 'Be more verbose.')
    .description('Show information on a timestamp.')
    .action((file, options) => {
      isExecuted = true;
      if (!file) {
        console.log(infoCommand.helpInformation());
        return;
      }
      info(file, options);
    });

const stampCommand = program
    .command('stamp [files...]')
    .alias('s')
    .option('-c, --calendar <url>', 'Create timestamp with the aid of a remote calendar. May be specified multiple times.')
    .option('-m <int>', 'Commitments are sent to remote calendars in the event of timeout the timestamp is considered done if at least M calendars replied.')
    .option('-k, --key <file>', 'Signature key file of private remote calendars.')
    .option('-H, --hash', 'Timestamp hashes instead of files.')
    .option('-a, --algorithm <type>', 'Hash algorithm: SHA1, SHA256 (default), RIPEMD160')
    .description('Create timestamp with the aid of a remote calendar, the output receipt will be saved with .ots .')
    .action((files, options) => {
      isExecuted = true;
      if (files === undefined || files.length < 1) {
        console.log(stampCommand.helpInformation());
        return;
      }

      const parameters = {};
      if (options.calendar) {
        parameters.publicCalendars = options.calendar;
      }
      if (options.key) {
        parameters.privateCalendars = Utils.readSignatureFile(options.key);
      }
      if (options.m) {
        parameters.m = options.m;
      }
      if (options.hash) {
        parameters.hash = true;
      } else {
        parameters.hash = false;
      }

      if (options.algorithm === undefined) {
        parameters.algorithm = 'SHA256';
      } else if (['SHA1', 'SHA256', 'RIPEMD160'].indexOf(options.algorithm) > -1) {
        parameters.algorithm = options.algorithm;
      } else {
        console.log('Create timestamp with the aid of a remote calendar.');
        console.log(title + ' stamp: ' + options.algorithm + ' unsupported ');
        return;
      }

      stamp(files, parameters);
    });

const verifyCommand = program
    .command('verify [file_ots]')
    .alias('v')
    .description('Verify the timestamp attestations, expect original file present in the same directory without .ots .')
    .action(file => {
      isExecuted = true;
      if (!file) {
        console.log(verifyCommand.helpInformation());
        return;
      }
      verify(file);
    });

const upgradeCommand = program
    .command('upgrade [file_ots]')
    .alias('u')
    .description('Upgrade remote calendar timestamps to be locally verifiable.')
    .action(file => {
      isExecuted = true;
      if (!file) {
        console.log(upgradeCommand.helpInformation());
        return;
      }
      upgrade(file);
    });

program.parse(process.argv);

if (!isExecuted) {
  console.log(program.helpInformation());
}

// FUNCTIONS
function info(argsFileOts, options) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);

  Promise.all([otsPromise]).then(values => {
    const ots = values[0];

    const detachedOts = DetachedTimestampFile.deserialize(ots);
    const infoResult = OpenTimestamps.info(detachedOts, options);
    console.log(infoResult);
  }).catch(err => {
    console.log('Error: ' + err);
    process.exit(1);
  });
}

function stamp(argsFiles, options) {
  // check input params : file/hash
  const isHash = options.hash;
  const filePromises = [];
  if (isHash) {
    // hash: convert to bytes
    argsFiles.forEach(argsFile => {
      filePromises.push(Utils.hexToBytes(argsFile));
    });
  } else {
    // file: read file in bytes format
    argsFiles.forEach(argsFile => {
      filePromises.push(Utils.readFilePromise(argsFile, null));
    });
  }

  // check input params : algorithm
  let op = new Ops.OpSHA256();
  if (options.algorithm === 'SHA1') {
    op = new Ops.OpSHA1();
  } else if (options.algorithm === 'SHA256') {
    op = new Ops.OpSHA256();
  } else if (options.algorithm === 'RIPEMD160') {
    op = new Ops.OpRIPEMD160();
  }

  // main promise
  Promise.all(filePromises).then(values => {
    const detaches = [];
    values.forEach(value => {
      if (isHash) {
        detaches.push(DetachedTimestampFile.fromHash(op, value));
      } else {
        detaches.push(DetachedTimestampFile.fromBytes(op, value));
      }
    });

    OpenTimestamps.stamp(detaches, options).then(() => {
      if (detaches === undefined) {
        console.error('Invalid timestamp');
        return;
      }

      detaches.forEach((ots, i) => {
        if (ots === undefined) {
          console.error('Invalid timestamp');
          return;
        }
        // console.log('STAMP result : ');
        // console.log(Utils.bytesToHex(ots.timestamp.msg));

        const ctx = new Context.StreamSerialization();
        ots.serialize(ctx);
        const buffer = new Buffer(ctx.getOutput());
        const otsFilename = argsFiles[i] + '.ots';
        saveOts(otsFilename, buffer);
      });
    }).catch(err => {
      console.log('Error: ' + err);
      process.exit(1);
    });
  }).catch(err => {
    console.log('Error: ' + err);
    process.exit(1);
  });
}

function saveOts(otsFilename, buffer) {
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
}

function verify(argsFileOts) {
  const argsFile = argsFileOts.replace('.ots', '');
  const filePromise = Utils.readFilePromise(argsFile, null);
  const filePromiseOts = Utils.readFilePromise(argsFileOts, null);
  Promise.all([filePromise, filePromiseOts]).then(values => {
    const file = values[0];
    const fileOts = values[1];

    console.log('Assuming target filename is \'' + argsFile + '\'');

    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), file);
    const detachedOts = DetachedTimestampFile.deserialize(fileOts);
    const verifyPromise = OpenTimestamps.verify(detachedOts, detached);
    verifyPromise.then(result => {
      if (result === undefined) {
        console.log('Pending or Bad attestation');
      } else {
        console.log('Success! Bitcoin attests data existed as of ' + (new Date(result * 1000)));
      }
    }).catch(err => {
      console.log(err);
      process.exit(1);
    });
  }).catch(err => {
    console.log('Error: ' + err);
    process.exit(1);
  });
}

function upgrade(argsFileOts) {
  const otsPromise = Utils.readFilePromise(argsFileOts, null);
  otsPromise.then(ots => {
    const detachedOts = DetachedTimestampFile.deserialize(ots);
    const upgradePromise = OpenTimestamps.upgrade(detachedOts);
    upgradePromise.then(changed => {
      // check timestamp
      if (changed) {
        console.log('Timestamp has been successfully upgraded!');
        fs.writeFile(argsFileOts + '.bak', new Buffer(ots), 'binary', err => {
          if (err) {
            return console.log(err);
          }
          console.log('The file .bak was saved!');
        });
        const ctx = new Context.StreamSerialization();
        detachedOts.serialize(ctx);
        fs.writeFile(argsFileOts, new Buffer(ctx.getOutput()), 'binary', err => {
          if (err) {
            return console.log(err);
          }
          console.log('The file .ots was upgraded!');
        });
      } else {
        console.log('Timestamp not changed');
      }
    }).catch(err => {
      console.log('Error: ' + err);
      process.exit(1);
    });
  }).catch(err => {
    console.log('Error: ' + err);
    process.exit(1);
  });
}
