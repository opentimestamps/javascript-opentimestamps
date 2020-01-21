const test = require('tape')
const Calendar = require('../src/calendar.js')
const Utils = require('../src/utils.js')

test('Calendar.getTimestamp()', assert => {
  const calendar = new Calendar.RemoteCalendar('https://alice.btc.calendar.opentimestamps.org')
  const commitmentOts = Utils.hexToBytes('57cfa5c46716df9bd9e83595bce439c58108d8fcc1678f30d4c6731c3f1fa6c79ed712c66fb1ac8d4e4eb0e7')
  calendar.getTimestamp(commitmentOts).then(upgradedStamp => {
    // console.log('upgradedStamp');
    // console.log(upgradedStamp.strTree());
    assert.true(upgradedStamp !== null)
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
  })
})
