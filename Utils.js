/**
 * Created by luca on 23/11/16.
 */

// Convert a hex string to a byte array
exports.hexToBytes= function(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
};

// Convert a byte array to a hex string
exports.bytesToHex=function(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join("");
};

exports.arrEq=function(arr1, arr2) {
    for (var i = 0; i < arr1.length; i++)
        if (arr1[i] != arr2[i])
            return false;
    return i == arr2.length;
}