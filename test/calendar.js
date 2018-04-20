const test = require('tape')
const Calendar = require('../src/calendar.js')
const Utils = require('../src/utils.js')

test('Calendar.privateSubmit()', assert => {
  const digest = Array.from(Utils.randBytes(32))
  Utils.readSignatureFile('./signature.wif')
    .then(hashmap => {
      let calendarUrl = ''
      let signature = ''

      // unsupported entries() method on iexplorer : https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Map
      hashmap.forEach((value, key) => {
        calendarUrl = key
        signature = value
      })

      const calendar = new Calendar.RemoteCalendar(calendarUrl)
      calendar.setKey(signature)
      return calendar.submit(digest)
    }).then(timestamp => {
      assert.true(timestamp !== null)
      assert.end()
    }).catch(err => {
      console.log(err)
      assert.end()
    })
})

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
