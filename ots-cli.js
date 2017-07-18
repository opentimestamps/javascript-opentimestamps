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

program
    .command('info [file_ots]')
    .alias('i')
    .option('-v, --verbose', 'Be more verbose.')
    .description('Show information on a timestamp.')
    .action((file, options) => {
      isExecuted = true;
      if (!file) {
        console.log('Show information on a timestamp given as argument.');
        console.log(title + ' info: bad options number ');
        return;
      }
      info(file, options);
    });

program
    .command('stamp [files...]')
    .alias('s')
    .option('-c, --calendar <url>', 'Create timestamp with the aid of a remote calendar. May be specified multiple times.')
    .option('-m <int>', 'Commitments are sent to remote calendars in the event of timeout the timestamp is considered done if at least M calendars replied.')
    .option('-k, --key <file>', 'Signature key file of private remote calendars.')
    .description('Create timestamp with the aid of a remote calendar, the output receipt will be saved with .ots .')
    .action((files, options) => {
      isExecuted = true;
      if (!files && files.size() < 1) {
        console.log('Create timestamp with the aid of a remote calendar.');
        console.log(title + ' stamp: bad options number ');
        return;
      }

      const parameters = {};
      if (options.calendar) {
        parameters.publicCalendars = options.calendar;
      }
      if (options.key) {
        parameters.privateCalendars = Utils.readSignatureFile(options.key);
      }
      if (options.M) {
        parameters.m = options.M;
      }
      stamp(files, parameters);
    });

program
    .command('verify [file_ots]')
    .alias('v')
    .description('Verify the timestamp attestations, expect original file present in the same directory without .ots .')
    .action(file => {
      isExecuted = true;
      if (!file) {
        console.log('Verify the timestamp attestations given as argument.');
        console.log(title + ' verify: bad options number ');
        return;
      }
      verify(file);
    });

program
    .command('upgrade [file_ots]')
    .alias('u')
    .description('Upgrade remote calendar timestamps to be locally verifiable.')
    .action(file => {
      isExecuted = true;
      if (!file) {
        console.log('Upgrade the timestamp attestations given as argument.');
        console.log(title + ' upgrade: bad options number ');
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
  const filePromises = [];
  argsFiles.forEach(argsFile => {
    filePromises.push(Utils.readFilePromise(argsFile, null));
  });

  Promise.all(filePromises).then(values => {
    const detaches = [];
    values.forEach(value => {
      detaches.push(DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), value));
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
