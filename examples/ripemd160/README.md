
# javascript-opentimestamps

[![OpenTimestamps logo][2]][1]

[1]: https://opentimestamps.org
[2]: https://raw.githubusercontent.com/opentimestamps/logo/master/white-bg/website-horizontal-350x75.png (OpenTimestamps logo)


[![Build Status](https://travis-ci.org/opentimestamps/javascript-opentimestamps.svg?branch=master)](https://travis-ci.org/opentimestamps/javascript-opentimestamps)

This repository hosts the javascript implementation of OpenTimestamps.

It is based on the python implementation at [Opentimestamps-Python](https://github.com/opentimestamps/python-opentimestamps) and [Opentimestamps-Client](https://github.com/opentimestamps/opentimestamps-client)

It has been developed as node modules for being used within Node environments along with Node Package Manager.
> You can also use it in the browser, see the **Installation** section.

[Jsdoc](https://opentimestamps.org/docs/javascript-opentimestamps/) available

## Installation

#### Node

```shell
$ npm install -g javascript-opentimestamps
```

#### Browser

##### Get the "binaries"

Choose one of the following options:
 
 * Take the [js](https://opentimestamps.org/bower_components/bower-opentimestamps/bower-opentimestamps.js) used by opentimestamps.org
 * Install the lib from bower `bower install bower-opentimestamps`

##### Build from source

From this repo, install the dev library

```
npm install --dev
```

then run the gulp process

```
gulp
```

include the result `/dist/opentimestamps.min.js` in your page

```html
<script src="opentimestamps.min.js"></script>
```


## Compatibility

#### Node

> This library is tested on CI against version 6.0, 6.1 and 7. See [__Travis build__](https://travis-ci.org/opentimestamps/javascript-opentimestamps.svg?branch=master) 

Download: [__NodeJS__](https://nodejs.org/en/download/)

#### Browser

> The lib is compatible with ECMAScript6(ES6) and ECMAScript5(ES5).

Browser compatibility:

* [__Chrome__](https://www.google.com/chrome/browser/desktop/index.html) version >= 40
* [__Chromium__](https://www.chromium.org/getting-involved/download-chromium) version >= 40
* [__Firefox__](https://www.mozilla.org/en-US/firefox/new/) version >= 40
* [__Internet Explorer__](https://www.microsoft.com/en-us/download/internet-explorer.aspx) version >= 9
* [__Safari__](https://support.apple.com/downloads/safari) version >= 8

## Command Line

The following example requires you installed globally the javascript-opentimestamps library, if you want to test locally just prepend `node` to the command, like `node ots-cli.js --help`

#### Stamp

Create timestamp `README.md.ots` from this `README.md` with the aid of a remote calendar.

```shell
$ ots-cli.js stamp README.md
The timestamp proof 'README.md.ots' has been created!
```

If you already have the hash of some file, you don't need to rehash it:

```shell
$ ots-cli.js stamp -d 05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9
The timestamp proof '05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9.ots' has been created!
```
Note that verify implicity requires the file must be called like the .ots receipt but without the ots, if you timestamp hashes and want to verify you need to rename files accordingly.

The default hash used `sha256` but you can also specify other hashes like `sha1` or `ripemd` (eg `ots-cli.js stamp -d 4f8d8389200583977943be86f0f74a964a670405 -a sha1`). Note that partially broken hash function like `sha1` is ok for timestamping purpose because they are [still resistant](https://petertodd.org/2017/sha1-and-opentimestamps-proofs) to preimage attacks (their use is discouraged anyway).


The stamp command supports multiple files or hashes as arguments.

```shell
$ ots-cli.js stamp README.md ots-cli.js
The timestamp proof 'ots-cli.js.ots' has been created!
The timestamp proof 'README.md.ots' has been created!
```

#### Info

Show information on a timestamp.

```shell
$ ots-cli.js info examples/incomplete.txt.ots
File sha256 hash: 05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9
Timestamp:
append e754bf93806a7ebaa680ef7bd0114bf4
sha256
append b573e8850cfd9e63d1f043fbb6fc250e
sha256
prepend 57cfa5c4
append 6fb1ac8d4e4eb0e7
verify PendingAttestation('https://alice.btc.calendar.opentimestamps.org')
```

You can have verbose output which clarifies operations, arguments, results and also contains comments showing the involved transaction id and calculated merkle tree root.

```shell
$ node ots-cli.js info -v examples/hello-world.txt.ots 
File sha256 hash: 03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340
Timestamp:
ripemd160 == 1df8859e60bc679503d16dcb870e6ce91a57e9df
prepend 0100000001e482f9d32ecc3ba657b69d898010857b54457a90497982ff56f97c4ec58e6f98010000006b483045022100b253add1d1cf90844338a475a04ff13fc9e7bd242b07762dea07f5608b2de367022000b268ca9c3342b3769cdd062891317cdcef87aac310b6855e9d93898ebbe8ec0121020d8e4d107d2b339b0050efdd4b4a09245aa056048f125396374ea6a2ab0709c6ffffffff026533e605000000001976a9140bf057d40fbba6744862515f5b55a2310de5772f88aca0860100000000001976a914 == 0100000001e482f9d32ecc3ba657b69d898010857b54457a90497982ff56f97c4ec58e6f98010000006b483045022100b253add1d1cf90844338a475a04ff13fc9e7bd242b07762dea07f5608b2de367022000b268ca9c3342b3769cdd062891317cdcef87aac310b6855e9d93898ebbe8ec0121020d8e4d107d2b339b0050efdd4b4a09245aa056048f125396374ea6a2ab0709c6ffffffff026533e605000000001976a9140bf057d40fbba6744862515f5b55a2310de5772f88aca0860100000000001976a9141df8859e60bc679503d16dcb870e6ce91a57e9df
append 88ac00000000 == 0100000001e482f9d32ecc3ba657b69d898010857b54457a90497982ff56f97c4ec58e6f98010000006b483045022100b253add1d1cf90844338a475a04ff13fc9e7bd242b07762dea07f5608b2de367022000b268ca9c3342b3769cdd062891317cdcef87aac310b6855e9d93898ebbe8ec0121020d8e4d107d2b339b0050efdd4b4a09245aa056048f125396374ea6a2ab0709c6ffffffff026533e605000000001976a9140bf057d40fbba6744862515f5b55a2310de5772f88aca0860100000000001976a9141df8859e60bc679503d16dcb870e6ce91a57e9df88ac00000000
# Bitcoin transaction id 7e9f0f7d9daa2d9e51b2e22f4abe814c3f90539afa778a9bef88dc64627cb2ec
sha256 == 9c6aa9591003377455b6f27fc71b5acfa5fbb2fa49362fa87a25ef0d799dd462
&
...content omitted...
&
prepend 0be23709859913babd4460bbddf8ed213e7c8773a4b1face30f8acfdf093b705 == 0be23709859913babd4460bbddf8ed213e7c8773a4b1face30f8acfdf093b7053f10376d0aebb4647ff550b60d69ba5ad6b6809d51af6a6476e0312a9433a3bf
sha256 == faa6e88835c144ad73f48992bc05e691a52a9199df02450194f3a03b530dc2d7
sha256 == 007ee445d23ad061af4a36b809501fab1ac4f2d7e7a739817dd0cbb7ec661b8a
verify BitcoinBlockHeaderAttestation(358391)
# Bitcoin block merkle root 8a1b66ecb7cbd07d8139a7e7d7f2c41aab1f5009b8364aaf61d03ad245e47e00

```

#### Verify

Verify the timestamp attestations with the aid of remote block explorers.

```shell
$ ots-cli.js verify examples/hello-world.txt.ots
Assuming target filename is 'examples/hello-world.txt'
Success! Bitcoin attests data existed as of Thu May 28 2015 17:41:18 GMT+0200 (CEST)
```

Note: This verification using block explorers is convenient but not as secure as asking a local node.
To mitigate the risks, an answer from block explorers is considered only if two different endpoint return the same result. Even by doing so this is not as secure as asking a local node.   

#### Upgrade

Upgrade incomplete remote calendar timestamps to be independently verifiable. This command overwrites the file `examples/incomplete.txt.ots` if needed and makes a backup of the old content at `examples/incomplete.txt.ots`. 

```shell
$ ots-cli.js upgrade examples/incomplete.txt.ots
Timestamp has been successfully upgraded!
```

## From code

> Note that from version 0.1.x to 0.2.x basic method interface changed, an upgrade will require change in your code.

#### Stamp

Create timestamp of a file with the aid of a remote calendar.

```js
const OpenTimestamps = require('javascript-opentimestamps');

const file = Buffer.from('5468652074696d657374616d70206f6e20746869732066696c6520697320696e636f6d706c6574652c20616e642063616e2062652075706772616465642e0a','hex');
const detached = OpenTimestamps.DetachedTimestampFile.fromBytes(new OpenTimestamps.Ops.OpSHA256(), file);
OpenTimestamps.stamp(detached).then( ()=>{
  const fileOts = detached.serializeToBytes();
});
```
Const `file` created from the hex representation of the file `examples/incomplete.txt`

###### Stamp hash

Sometimes you don't want to timestamp a file or you already have the sha256 hash of what you want to timestamp. For example, if you want to timestamp the file `examples/incomplete.txt` and you already have its hash you can do this:

```js
const hash = Buffer.from('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9');
detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), hash);
```

###### Stamp multiple data at once

If you have a lot of files to timestamp it is unconvenient to make a calendar request for every file. In this cases you can build a [merkle tree](https://github.com/opentimestamps/javascript-opentimestamps/blob/7429d35011350f4df29c53b45b76b87adff62ee8/src/open-timestamps.js#L205) by your own or call the stamp function with an array for request, behind the curtain the function will make a merkle tree and perform just one call to the calendars.

```js
  const files = []; /* init this array with the binary contents of the files you want to timestamp */
  const detaches = [];
  files.forEach(file => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), file);
    detaches.push(detached);
  });
  OpenTimestamps.stamp(detaches).then(() => {
    ots = [];
    detaches.forEach((timestamp, i) => {
      ots.push( timestamp.serializeToBytes() );
    });
  }).catch(err => {
    console.error(err);
  });
```

The `ots` array will contain multiple proofs, one for each input.

###### Async Await

If you prefer the async/await (require Node 7.6+) syntax the promise based API of the library works out of the box:

```js
go_async();

async function go_async() {
    const hash = Buffer.from('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9','hex');
    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hash);

    try {
        await OpenTimestamps.stamp(detached);
        const fileOts = detached.serializeToBytes();
    } catch(err) {
        console.log(err);
    }

}
```

#### Info

Show information on a timestamp.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const fileOts = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e70083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267','hex');
const detached = OpenTimestamps.DetachedTimestampFile.deserialize(fileOts);
const infoResult = OpenTimestamps.info(detached);
console.log(infoResult);
```

Const `fileOts` created from the hex representation of the file `examples/incomplete.txt.ots`. You can match the printed result with the file `test/incomplete.txt.ots.info`.

#### Verify
 
Verify the timestamp attestations.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const file = Buffer.from('48656c6c6f20576f726c64210a','hex');
const fileOts = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010803ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab34003f1c8010100000001e482f9d32ecc3ba657b69d898010857b54457a90497982ff56f97c4ec58e6f98010000006b483045022100b253add1d1cf90844338a475a04ff13fc9e7bd242b07762dea07f5608b2de367022000b268ca9c3342b3769cdd062891317cdcef87aac310b6855e9d93898ebbe8ec0121020d8e4d107d2b339b0050efdd4b4a09245aa056048f125396374ea6a2ab0709c6ffffffff026533e605000000001976a9140bf057d40fbba6744862515f5b55a2310de5772f88aca0860100000000001976a914f00688ac000000000808f120a987f716c533913c314c78e35d35884cac943fa42cac49d2b2c69f4003f85f880808f120dec55b3487e1e3f722a49b55a7783215862785f4a3acb392846019f71dc64a9d0808f120b2ca18f485e080478e025dab3d464b416c0e1ecb6629c9aefce8c8214d0424320808f02011b0e90661196ff4b0813c3eda141bab5e91604837bdf7a0c9df37db0e3a11980808f020c34bc1a4a1093ffd148c016b1e664742914e939efabe4d3d356515914b26d9e20808f020c3e6e7c38c69f6af24c2be34ebac48257ede61ec0a21b9535e4443277be306460808f1200798bf8606e00024e5d5d54bf0c960f629dfb9dad69157455b6f2652c0e8de810808f0203f9ada6d60baa244006bb0aad51448ad2fafb9d4b6487a0999cff26b91f0f5360808f120c703019e959a8dd3faef7489bb328ba485574758e7091f01464eb65872c975c80808f020cbfefff513ff84b915e3fed6f9d799676630f8364ea2a6c7557fad94a5b5d7880808f1200be23709859913babd4460bbddf8ed213e7c8773a4b1face30f8acfdf093b7050808000588960d73d7190103f7ef15','hex');
const detached = OpenTimestamps.DetachedTimestampFile.fromBytes(new OpenTimestamps.Ops.OpSHA256(), file);
const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(fileOts);
OpenTimestamps.verify(detachedOts,detached).then(verifyResult => {
  // return a timestamp if verified, undefined otherwise.
  console.log(verifyResult);
});
```

Const `file` created from the hex representation of the file `examples/hello-world.txt` while `fileOts` contains `examples/hello-world.txt.ots`. 

#### Upgrade

Upgrade incomplete remote calendar timestamps to be independently verifiable.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const fileOts = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e70083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267','hex');
const detached = OpenTimestamps.DetachedTimestampFile.deserialize(fileOts);
OpenTimestamps.upgrade(detached).then((changed) => {
    if (changed) {
      console.log('Timestamp upgraded');
      const upgradedFileOts = detached.serializeToBytes();
    } else {
      console.log('Timestamp not upgraded');
    }
}).catch(err => {
    console.log(err);
});
```

## Pull Requests

PRs are welcome, before reviewing them we wait the travis build concludes successfully, so please check:

*  All tests must pass. (Rarely test fails for networking issue, if you think it's your case ask the maintainers in the comments to relaunch the travis build)
*  [xo linter](https://github.com/xojs/xo) is launched in the build process, any warning found by the linker break the build, so be sure to check warnings by launching `xo` before the commit, most simple errors could be automatically fixed with `xo --fix`


## License

[__LGPL3__](https://github.com/prahaladbelavadi/javascript-opentimestamps/blob/master/LICENSE)

The OpenTimestamps Client is free software: you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public License as published
by the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

The OpenTimestamps Client is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. 
