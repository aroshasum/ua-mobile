import utils from './utils';

export default (function () {
    var convertToJson = function (obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            utils.logger.logError('Error in converting to JSON: ' + e);
        }
    };

    var convertFromJson = function (json) {
        return JSON.parse(json);
    };

    return {
        convertToJson: convertToJson,
        convertFromJson: convertFromJson
    };
})();