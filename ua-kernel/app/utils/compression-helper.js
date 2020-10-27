/* global LZString */
import utils from '../utils/utils';

export default (function () {
    var getCompressedString = function (dataString) {
        var compressedString;

        try {
            compressedString = LZString.compressToUTF16(dataString);
        } catch (e) {
            utils.logger.logError('Error in compressing json string: ' + e);
        }

        return compressedString;
    };

    var getDecompressedString = function (compressedString) {
        var decompressedString;

        if (compressedString) {
            try {
                decompressedString = LZString.decompressFromUTF16(compressedString);
            } catch (e) {
                utils.logger.logError('Error in decompressing string: ' + e);
            }
        }

        return decompressedString;
    };

    return {
        getCompressedString: getCompressedString,
        getDecompressedString: getDecompressedString
    };
})();
