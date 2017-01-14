const test = require('tape');
const Calendar = require('../calendar.js');
const Utils = require('../utils.js');
const Timestamp = require('../timestamp.js');
/*
let incompleteOtsInfo;
let incompleteOts;
let incomplete;
let helloworldOts;
let helloworld;

test('setup', assert => {
  const incompleteOtsInfoPromise = Utils.readFilePromise('./test/incomplete.txt.ots.info', 'utf8');
  const incompleteOtsPromise = Utils.readFilePromise('./test/incomplete.txt.ots', null);
  const incompletePromise = Utils.readFilePromise('./test/incomplete.txt', null);
  const helloworldOtsPromise = Utils.readFilePromise('./test/hello-world.txt.ots', null);
  const helloworldPromise = Utils.readFilePromise('./test/hello-world.txt', null);

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
*/
test('Calendar.getTimestamp()', assert => {
  const calendar = new Calendar.RemoteCalendar('https://alice.btc.calendar.opentimestamps.org');
  const commitmentOts = Utils.hexToBytes('57cfa5c46716df9bd9e83595bce439c58108d8fcc1678f30d4c6731c3f1fa6c79ed712c66fb1ac8d4e4eb0e7');
  calendar.getTimestamp(commitmentOts).then(upgradedStamp => {
    console.error('upgradedStamp');
    console.error(Timestamp.strTreeExtended(upgradedStamp, 0));
    assert.true(upgradedStamp !== null);
    assert.end();
  }).catch(err => {
    assert.fail('err=' + err);
  });
});
