
const OpenTimestamps = require('../open-timestamps.js');
const Context = require('../context.js');
const Utils = require('../utils.js');
// const Timestamp = require('../timestamp.js');
const DetachedTimestampFile = require('../detached-timestamp-file.js');
// const ByteBuffer = require('bytebuffer');
// const DetachedTimestampFile = require('../detached-timestamp-file.js');

// examples/incomplete.txt.ots
// const incompletePlain = '5468652074696d657374616d70206f6e20746869732066696c6520697320696e636f6d706c6574652c20616e642063616e2062652075706772616465642e0a';
// const incompleteOts = '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e7ff0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f726708f1206563bb432a829ac8d6c54d1a9330d2240664cad8338dd05e63eec12a18a68d5008f020ba83ddbe2bd6772b4584b46eaed23606b712dd740a89e99e927571f77f64aa2108f120193c81e70e4472b52811fe7837ce1293b1d3542b244f27f44182af8287fc9f4e08f120c6c57696fcd39b4d992477889d04e6882829f5fe556304a281dce258b78a1f0708f1ae010100000001b592ca038eaa9c1b698a049b09be8ee8972b5d0eca29c19946027ba9248acb03000000004847304402200f992d5dbec6edb143f76c14e4538e0a50d66bae27c683cf4291e475287ec6af022010bae9443390aadbd2e2b8b9f757beea26d3f5c345f7e6b4d81b3d390edd381801fdffffff022eb142000000000023210338b2490eaa949538423737cd83449835d1061dca88f4ffaca7181bcac67d2095ac0000000000000000226a20f004678a06000808f120977ac39d89bb8b879d4a2c38fca48a040c82637936707fc452c9db1390b515c80808f02074268b23e614997d18c7c063d8d82d7e1db57b5fc4346cc47ac2c46d54168d710808f120560c45b854f8507c8bfacf2662fef269c208a7e5df5c3145cbce417ecacc595e0808f1200dba8721b9cd4ac7c2fcc7e15ba2cb9f2906bfc577c212747cd352d61b5d7fdb0808f12081107a010d527d18baa874bc99c19a3a7a25dfe110a4c8985bf30f6c3e77baed0808f020ca3cdcd7093498b3f180b38a9773207e52fca992c2db1d660fdfa1b329500c390808f020ca6c6464dd02ced64c9c82246ccfc626caa78d9e624cc11013e3b4bbc09e98910808f0201c7ae0feac018fa19bd8459a4ae971b3e6c816a87254317e0a9f0ec9425ba7610808f12090263a73e415a975dc07706772dbb6200ef0d0a23006218e65d4a5d8112067300808f12079530163b0d912249438628bd791ac9402fa707eb314c6237b0ef90271625c840808000588960d73d7190103e8941a';
// const verifyResult = OpenTimestamps.verify(ByteBuffer.fromHex(incomplete_ots).buffer,ByteBuffer.fromHex(incomplete_plain).buffer);
// console.log(verifyResult);
/*
const ots=ByteBuffer.fromHex(incomplete_ots).buffer;
const incomplete=ByteBuffer.fromHex(incomplete_plain).buffer;
const verifyPromise = OpenTimestamps.verify(ots,incomplete);
verifyPromise.then(markles => {
  //assert.false(Utils.arrEq(markles[0],markles[1]));
  assert.end();
}).catch(err => {
  assert.fail('err=' + err);
}); */

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
    let ctx = new Context.StreamDeserialization();
    ctx.open(Utils.arrayToBytes(ots));
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    ctx = new Context.StreamSerialization();
    ctx.open();
    detachedTimestampFile.timestamp.serialize(ctx);
    console.log('OTS TIMESTAMP');
    console.log(Utils.bytesToHex(ctx.getOutput()));
    const inputTimestampSerialized = ctx.getOutput();

    // output timestamp serialization
    console.log('OUTPUT TIMESTAMP');
    console.log(Utils.bytesToHex(timestampBytes));
    const outputTimestampSerialized = timestampBytes;

    // check timestamp
    if (Utils.arrEq(inputTimestampSerialized, outputTimestampSerialized)) {
      console.log('Timestamp not changed');
    } else {
      console.log('Timestamp changed');
    }
    // assert.equals(Utils.arrEq(inputTimestampSerialized,outputTimestampSerialized));
  }).catch(err => {
    console.log('ERROR ' + err);
  });
}

function stamp(plain) {
  console.log('STAMP');
  const timestampBytesPromise = OpenTimestamps.stamp(plain);
  timestampBytesPromise.then(timestampBytes => {
    const ctx = new Context.StreamDeserialization();
    ctx.open(timestampBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    console.log('STAMP result : ');
    console.log('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9');
    console.log(Utils.bytesToHex(detachedTimestampFile.timestamp.msg));
  });
}

/*
// examples/incomplete.txt.ots
const fileOts = '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e7ff0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f726708f1206563bb432a829ac8d6c54d1a9330d2240664cad8338dd05e63eec12a18a68d5008f020ba83ddbe2bd6772b4584b46eaed23606b712dd740a89e99e927571f77f64aa2108f120193c81e70e4472b52811fe7837ce1293b1d3542b244f27f44182af8287fc9f4e08f120c6c57696fcd39b4d992477889d04e6882829f5fe556304a281dce258b78a1f0708f1ae010100000001b592ca038eaa9c1b698a049b09be8ee8972b5d0eca29c19946027ba9248acb03000000004847304402200f992d5dbec6edb143f76c14e4538e0a50d66bae27c683cf4291e475287ec6af022010bae9443390aadbd2e2b8b9f757beea26d3f5c345f7e6b4d81b3d390edd381801fdffffff022eb142000000000023210338b2490eaa949538423737cd83449835d1061dca88f4ffaca7181bcac67d2095ac0000000000000000226a20f004678a06000808f120977ac39d89bb8b879d4a2c38fca48a040c82637936707fc452c9db1390b515c80808f02074268b23e614997d18c7c063d8d82d7e1db57b5fc4346cc47ac2c46d54168d710808f120560c45b854f8507c8bfacf2662fef269c208a7e5df5c3145cbce417ecacc595e0808f1200dba8721b9cd4ac7c2fcc7e15ba2cb9f2906bfc577c212747cd352d61b5d7fdb0808f12081107a010d527d18baa874bc99c19a3a7a25dfe110a4c8985bf30f6c3e77baed0808f020ca3cdcd7093498b3f180b38a9773207e52fca992c2db1d660fdfa1b329500c390808f020ca6c6464dd02ced64c9c82246ccfc626caa78d9e624cc11013e3b4bbc09e98910808f0201c7ae0feac018fa19bd8459a4ae971b3e6c816a87254317e0a9f0ec9425ba7610808f12090263a73e415a975dc07706772dbb6200ef0d0a23006218e65d4a5d8112067300808f12079530163b0d912249438628bd791ac9402fa707eb314c6237b0ef90271625c840808000588960d73d7190103e8941a';
const infoResult = OpenTimestamps.info(fileOts);
console.log(infoResult);

// examples/incomplete.txt
const file = '5468652074696d657374616d70206f6e20746869732066696c6520697320696e636f6d706c6574652c20616e642063616e2062652075706772616465642e0a';
const stampResultPromise = OpenTimestamps.stamp(file);
stampResultPromise.then(stampResult => {
  console.log(stampResult);

// WRITE
  const path = 'output.txt';
  const buffer = new Buffer(stampResult);

  fs.open(path, 'w', (err, fd) => {
    if (err) {
      console.error('error opening file: ' + err);
    }

    fs.write(fd, buffer, 0, buffer.length, null, err => {
      if (err) {
        console.error('error writing file: ' + err);
      }
      fs.close(fd, () => {
        console.log('file written');
      });
    });
  });
});

*/

/*
var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var Utils=require("./utils.js");
/*
var digest="1c15d1c0495b248e721d6af4f9a9949935abab15affbc3b248d2fa896b1b0fc6";
var resp="f010f393dbe2ddb8353c1c20026d9afd551708f104583574c8f008260721746284f7c60083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267";

var respBytes=Utils.hexToBytes(resp);
var digest_bytes=Utils.hexToBytes(digest);

console.log("respBytes: ",resp);
console.log("digest_bytes: ",digest);

var Timestamp=require("./timestamp.js");
var timestamp=Timestamp.deserialize(digest_bytes);

var StreamSerializationContext=require("./StreamSerializationContext.js");
StreamSerializationContext.open();

timestamp.serialize();

var file_ots="004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e7ff0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f726708f1206563bb432a829ac8d6c54d1a9330d2240664cad8338dd05e63eec12a18a68d5008f020ba83ddbe2bd6772b4584b46eaed23606b712dd740a89e99e927571f77f64aa2108f120193c81e70e4472b52811fe7837ce1293b1d3542b244f27f44182af8287fc9f4e08f120c6c57696fcd39b4d992477889d04e6882829f5fe556304a281dce258b78a1f0708f1ae010100000001b592ca038eaa9c1b698a049b09be8ee8972b5d0eca29c19946027ba9248acb03000000004847304402200f992d5dbec6edb143f76c14e4538e0a50d66bae27c683cf4291e475287ec6af022010bae9443390aadbd2e2b8b9f757beea26d3f5c345f7e6b4d81b3d390edd381801fdffffff022eb142000000000023210338b2490eaa949538423737cd83449835d1061dca88f4ffaca7181bcac67d2095ac0000000000000000226a20f004678a06000808f120977ac39d89bb8b879d4a2c38fca48a040c82637936707fc452c9db1390b515c80808f02074268b23e614997d18c7c063d8d82d7e1db57b5fc4346cc47ac2c46d54168d710808f120560c45b854f8507c8bfacf2662fef269c208a7e5df5c3145cbce417ecacc595e0808f1200dba8721b9cd4ac7c2fcc7e15ba2cb9f2906bfc577c212747cd352d61b5d7fdb0808f12081107a010d527d18baa874bc99c19a3a7a25dfe110a4c8985bf30f6c3e77baed0808f020ca3cdcd7093498b3f180b38a9773207e52fca992c2db1d660fdfa1b329500c390808f020ca6c6464dd02ced64c9c82246ccfc626caa78d9e624cc11013e3b4bbc09e98910808f0201c7ae0feac018fa19bd8459a4ae971b3e6c816a87254317e0a9f0ec9425ba7610808f12090263a73e415a975dc07706772dbb6200ef0d0a23006218e65d4a5d8112067300808f12079530163b0d912249438628bd791ac9402fa707eb314c6237b0ef90271625c840808000588960d73d7190103e8941a";
console.log("ots_bytes: ",file_ots);

var ots_bytes=Utils.hexToBytes(file_ots);

var Context=require("./Context.js");
var ctx= new Context.StreamDeserialization();
ctx.open(ots_bytes);

var DetachedTimestampFile=require("./detached-timestamp-file.js");
var detachedTimestampFile=DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

console.log("File");
console.log(detachedTimestampFile.file_hash_op.HASHLIB_NAME());

console.log("hash");
console.log(Utils.bytesToHex(detachedTimestampFile.file_digest()));

var Timestamp=require("./timestamp.js");
console.log("Timestamp");
console.log(Timestamp.strTreeExtended( detachedTimestampFile.timestamp,0 ));

*/

