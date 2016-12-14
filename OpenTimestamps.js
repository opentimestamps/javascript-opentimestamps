

var Context=require("./Context.js");
var DetachedTimestampFile=require("./DetachedTimestampFile.js");
var Timestamp=require("./Timestamp.js");
var Utils=require("./Utils.js");
var Calendar=require("./Calendar.js");
var Ops=require("./Ops.js");

module.exports = {

    info: function (file_ots) {
        if(file_ots==undefined){
            console.log("No ots file");
            return;
        }

        //var file_ots="004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e7ff0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f726708f1206563bb432a829ac8d6c54d1a9330d2240664cad8338dd05e63eec12a18a68d5008f020ba83ddbe2bd6772b4584b46eaed23606b712dd740a89e99e927571f77f64aa2108f120193c81e70e4472b52811fe7837ce1293b1d3542b244f27f44182af8287fc9f4e08f120c6c57696fcd39b4d992477889d04e6882829f5fe556304a281dce258b78a1f0708f1ae010100000001b592ca038eaa9c1b698a049b09be8ee8972b5d0eca29c19946027ba9248acb03000000004847304402200f992d5dbec6edb143f76c14e4538e0a50d66bae27c683cf4291e475287ec6af022010bae9443390aadbd2e2b8b9f757beea26d3f5c345f7e6b4d81b3d390edd381801fdffffff022eb142000000000023210338b2490eaa949538423737cd83449835d1061dca88f4ffaca7181bcac67d2095ac0000000000000000226a20f004678a06000808f120977ac39d89bb8b879d4a2c38fca48a040c82637936707fc452c9db1390b515c80808f02074268b23e614997d18c7c063d8d82d7e1db57b5fc4346cc47ac2c46d54168d710808f120560c45b854f8507c8bfacf2662fef269c208a7e5df5c3145cbce417ecacc595e0808f1200dba8721b9cd4ac7c2fcc7e15ba2cb9f2906bfc577c212747cd352d61b5d7fdb0808f12081107a010d527d18baa874bc99c19a3a7a25dfe110a4c8985bf30f6c3e77baed0808f020ca3cdcd7093498b3f180b38a9773207e52fca992c2db1d660fdfa1b329500c390808f020ca6c6464dd02ced64c9c82246ccfc626caa78d9e624cc11013e3b4bbc09e98910808f0201c7ae0feac018fa19bd8459a4ae971b3e6c816a87254317e0a9f0ec9425ba7610808f12090263a73e415a975dc07706772dbb6200ef0d0a23006218e65d4a5d8112067300808f12079530163b0d912249438628bd791ac9402fa707eb314c6237b0ef90271625c840808000588960d73d7190103e8941a";
        console.log("BYTES: ",file_ots);

        var ctx= new Context.StreamDeserialization();
        var ots_bytes=Utils.hexToBytes(file_ots);
        ctx.open(ots_bytes);

        var detachedTimestampFile=DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

        console.log("File");
        console.log(detachedTimestampFile.file_hash_op.HASHLIB_NAME());

        console.log("hash");
        console.log(Utils.bytesToHex(detachedTimestampFile.file_digest()));

        console.log("Timestamp");
        console.log(Timestamp.str_tree_extended( detachedTimestampFile.timestamp,0 ));
    },

    /* STAMP COMMAND */
    stamp(file){
        console.log("TODO");

        var file_timestamps = [];
        var merkle_roots = [];

        var ctx= new Context.StreamDeserialization();
        var bytes=Utils.hexToBytes(file);
        ctx.open(bytes);

        var file_timestamp = DetachedTimestampFile.DetachedTimestampFile.from_bytes(new Ops.OpSHA256(), ctx);

        /*Add nonce

        # Remember that the files - and their timestamps - might get separated
        # later, so if we didn't use a nonce for every file, the timestamp
        # would leak information on the digests of adjacent files.*/
        var random16 = Utils.rand_string(16);

        var nonce_appended_stamp = file_timestamp.timestamp.ops.set( 0, new Ops.OpAppend( random16 ) );//<--? on generation
        var merkle_root = nonce_appended_stamp.ops.set( 0, new Ops.OpSHA256() )

        // merkle_tip = make_merkle_tree(merkle_roots)
        var merkle_tip = merkle_root;

        var calendar_urls=[];
        calendar_urls.push('https://a.pool.opentimestamps.org');
        //calendar_urls.append('https://b.pool.opentimestamps.org');

        this.create_timestamp(merkle_tip,calendar_urls);

        //serialization

    },
    create_timestamp(timestamp, calendar_urls){
        console.log("TODO");
        // setup_bitcoin : not used

        var n = calendar_urls.length; // =1

        // for all calendars
        for (calendar_url in calendar_urls) {
            this.submit_async(calendar_url, timestamp.msg)
        }
    },
    submit_async(calendar_url,msg){
        console.log("TODO");

        console.log('Submitting to remote calendar ' , calendar_url);
        var remote = new Calendar.RemoteCalendar(calendar_url);
        remote.submit(msg);

        //t = threading.Thread(target=submit_async_thread, args=(remote, msg, q))
        //calendar_timestamp = remote.submit(msg)

        return "";
    },

    /* VERIFY COMMAND */
    verify: function (file_ots,file) {
        console.log("TODO");
        console.log("file_ots: ",file_ots);
        console.log("file: ",file);

        var ctx= new Context.StreamDeserialization();
        var ots_bytes=Utils.hexToBytes(file_ots);
        ctx.open(ots_bytes);

        var detached_timestamp=DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
        console.log("Hashing file, algorithm " + detached_timestamp.file_hash_op.TAG_NAME() );

        var file_bytes=Utils.hexToBytes(file);
        var actual_file_digest = detached_timestamp.file_hash_op.hash_fd( file_bytes );
        console.log("Got digest " + Utils.bytesToHex(actual_file_digest));

        if (actual_file_digest != detached_timestamp.file_digest){
            console.log("Expected digest " + Utils.bytesToHex(detached_timestamp.file_digest));
            console.log("File does not match original!");
            return;
        }

        this.verify_timestamp(detached_timestamp.timestamp, args);

    },
    verify_timestamp: function(timestamp, args){
        console.log("TODO");
        //upgrade_timestamp(timestamp, args);
    },







}
