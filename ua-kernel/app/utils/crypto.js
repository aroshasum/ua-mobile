/* global CryptoJS */
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default (function () {
    var encryptText = function (plainText, key, iv) {
        return _encryptText(plainText, key ? key : utils.Constants.Encryption.TDesPrimaryKey, iv ? iv : utils.Constants.Encryption.TDesPrimaryIv);
    };

    var decryptText = function (cipherText, key, iv) {
        return _decryptText(cipherText, key ? key : utils.Constants.Encryption.TDesPrimaryKey, iv ? iv : utils.Constants.Encryption.TDesPrimaryIv);
    };

    var generateHashedText = function (plainText) {
        switch (appConfig.customisation.hashType) {
            case utils.Constants.HashTypes.Md5:
                return hashMd5(plainText);

            case utils.Constants.HashTypes.Sha1:
                return hashSha1(plainText);

            case utils.Constants.HashTypes.Sha256:
                return _hashSha(plainText, utils.Constants.HashTypes.Sha256, utils.Constants.HashOutputTypes.HEX);

            default :
                return plainText;
        }
    };

    var hashMd5 = function (plainText) {
        var hashText = '';

        try {
            hashText = CryptoJS.MD5(plainText).toString();
        } catch (e) {
            utils.logger.logError('Error in converting to hash type 1 : ' + e);
        }

        return appConfig.customisation.isUpperCasePassword ? hashText.toUpperCase() : hashText;
    };

    var hashSha1 = function (plainText) {
        return _hashSha(plainText, utils.Constants.HashTypes.Sha1, utils.Constants.HashOutputTypes.B64);
    };

    var _hashSha = function (plainText, hashType, outputType) {
        // Ignore from JSHint and ESLint, to avoid defining global reference or importing
        /*eslint-disable */
        //noinspection JSPotentiallyInvalidConstructorUsage
        var shaObj = new jsSHA(hashType, 'TEXT'); // jshint ignore:line
        /*eslint-enable */

        shaObj.update(plainText);

        return appConfig.customisation.isUpperCasePassword ? shaObj.getHash(outputType).toUpperCase() : shaObj.getHash(outputType);
    };

    var _encryptText = function (plainText, key, iv) {
        var encryptedText = plainText;

        try {
            var keyUtf8 = CryptoJS.enc.Utf8.parse(key);
            var ivUtf8 = CryptoJS.enc.Utf8.parse(iv);
            var encryptedUtf8 = CryptoJS.TripleDES.encrypt(plainText, keyUtf8, {iv: ivUtf8});

            encryptedText = encryptedUtf8.toString();
        } catch (e) {
            utils.logger.logError('Error in encrypting : ' + e);
        }

        return encryptedText;
    };

    var _decryptText = function (cipherText, key, iv) {
        var decryptedText = cipherText;

        try {
            var keyUtf8 = CryptoJS.enc.Utf8.parse(key);
            var ivUtf8 = CryptoJS.enc.Utf8.parse(iv);
            var decryptedUtf8 = CryptoJS.TripleDES.decrypt(cipherText, keyUtf8, {iv: ivUtf8});

            decryptedText = decryptedUtf8.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            utils.logger.logError('Error in decrypting : ' + e);
        }

        return decryptedText;
    };

    return {
        encryptText: encryptText,
        decryptText: decryptText,
        generateHashedText: generateHashedText,
        hashMd5: hashMd5,
        hashSha1: hashSha1
    };
})();
