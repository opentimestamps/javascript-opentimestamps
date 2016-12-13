

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
StreamDeserializationContext.open();
var Utils=require("./Utils.js");

var digest="1c15d1c0495b248e721d6af4f9a9949935abab15affbc3b248d2fa896b1b0fc6";
var resp="f010f393dbe2ddb8353c1c20026d9afd551708f104583574c8f008260721746284f7c60083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267";

var resp_bytes=Utils.hexToBytes(resp);
var digest_bytes=Utils.hexToBytes(digest);

console.log("resp_bytes: ",resp);
console.log("digest_bytes: ",digest);

var Timestamp=require("./Timestamp.js");
var timestamp=Timestamp.deserialize(digest_bytes);

var StreamSerializationContext=require("./StreamSerializationContext.js");
StreamSerializationContext.open();

timestamp.serialize();

