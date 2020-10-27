import utils from '../utils/utils';
import AppConfig from '../config/app-config';
import profileService from '../models/shared/profile/profile-service';

export default (function () {
    var _isStorageAvailable = function () {
        return (typeof (Storage) !== 'undefined');
    };

    var _getFromStorageAsString = function (key, storageType) {
        var value;

        if (_isStorageAvailable() && utils.validators.isAvailable(key)) {
            if (storageType === utils.Constants.StorageType.Local) {
                value = localStorage.getItem(key);
            } else {
                value = sessionStorage.getItem(key);
            }
        }

        return value;
    };

    var _getFromStorageAsObj = function (key, storageType) {
        var obj;
        var str = _getFromStorageAsString(key, storageType);

        if (utils.validators.isAvailable(str)) {
            obj = utils.jsonHelper.convertFromJson(str);
        }

        return obj;
    };

    var _getFromStorageAsObjDecrypted = function (key, storageType) {
        var obj, decrypted;
        var str = _getFromStorageAsString(key, storageType);

        if (utils.validators.isAvailable(str)) {
            try {
                decrypted = utils.crypto.decryptText(str);
            } catch (e) {
                utils.logger.logWarning('Decryption failed retrieving data from storage : ' + key);
                decrypted = str;
            }

            try {
                obj = utils.jsonHelper.convertFromJson(decrypted);
            } catch (e) {
                utils.logger.logWarning('Json parse failed retrieving data from storage : ' + key);
                obj = utils.jsonHelper.convertFromJson(str);
            }
        }

        return obj;
    };

    var _containsInStorage = function (key, storageType) {
        var contains = false;

        if (_isStorageAvailable() && utils.validators.isAvailable(key)) {
            var storageObj;

            if (storageType === utils.Constants.StorageType.Local) {
                storageObj = localStorage.getItem(key);
            } else {
                storageObj = sessionStorage.getItem(key);
            }

            if (storageObj) {
                contains = true;
            }
        }

        return contains;
    };

    var _addToStorageFromString = function (key, value, storageType) {
        var status = false;

        if (_isStorageAvailable() && utils.validators.isAvailable(key) && utils.validators.isAvailable(value)) {
            if (storageType === utils.Constants.StorageType.Local) {
                localStorage.setItem(key, value);
            } else {
                sessionStorage.setItem(key, value);
            }

            status = true;
        }

        return status;
    };

    var _addToStorageFromObj = function (key, valueObj, storageType) {
        var status = false;

        if (utils.validators.isAvailable(key) && valueObj) {
            var valueString = utils.jsonHelper.convertToJson(valueObj);
            status = _addToStorageFromString(key, valueString, storageType);
        }

        return status;
    };

    var _addToStorageFromObjEncrypted = function (key, valueObj, storageType) {
        var status = false;

        if (utils.validators.isAvailable(key) && valueObj) {
            var valueString = utils.jsonHelper.convertToJson(valueObj);
            var encrypted = utils.crypto.encryptText(valueString);
            status = _addToStorageFromString(key, encrypted, storageType);
        }

        return status;
    };

    var _removeFromStorageByKey = function (key, storageType) {
        var status = false;

        if (_isStorageAvailable() && utils.validators.isAvailable(key)) {
            if (storageType === utils.Constants.StorageType.Local) {
                localStorage.removeItem(key);
            } else {
                sessionStorage.removeItem(key);
            }

            status = true;
        }

        return status;
    };

    var getKey = function (key, language, windowId) {
        var cacheKey = utils.validators.isAvailable(key) ? key : utils.Constants.StringConst.Empty;
        var keyArray = [AppConfig.customisation.clientPrefix];

        if (utils.validators.isAvailable(language)) {
            keyArray[keyArray.length] = language;
        }

        if (utils.validators.isAvailable(windowId)) { // TODO: [DineshS] append user id before window id
            keyArray[keyArray.length] = windowId;
        }

        keyArray[keyArray.length] = cacheKey;
        return keyArray.join(utils.Constants.StringConst.Underscore);
    };

    var getExchangeKey = function (key, exchange, language) {
        var cacheExchange = utils.validators.isAvailable(exchange) ? exchange : utils.Constants.StringConst.Empty;
        var cacheKey = utils.validators.isAvailable(key) ? key : utils.Constants.StringConst.Empty;
        var keyArray = [AppConfig.customisation.clientPrefix, cacheExchange, cacheKey];

        if (utils.validators.isAvailable(language)) {
            keyArray[keyArray.length] = language;
        }

        return keyArray.join(utils.Constants.StringConst.Underscore);
    };

    var addString = function (key, value, storageType, saveImmediately) {
        var storageTypeValue = storageType;

        if (!storageTypeValue) {
            profileService.saveComponent(key, value, saveImmediately);
            storageTypeValue = storageType || utils.Constants.StorageType.Local;
        }

        return _addToStorageFromString(key, value, storageTypeValue);
    };

    var addObject = function (key, value, storageType, saveImmediately) {
        var storageTypeValue = storageType;
        var strValue = utils.jsonHelper.convertToJson(value);

        if (!storageTypeValue) {
            profileService.saveComponent(key, strValue, saveImmediately);
            storageTypeValue = storageType || utils.Constants.StorageType.Local;
        }

        return _addToStorageFromObj(key, value, storageTypeValue);
    };

    var addFromObjEncrypted = function (key, value, storageType, saveImmediately) {
        var storageTypeValue = storageType;
        var strValue = utils.jsonHelper.convertToJson(value);

        if (!storageTypeValue) {
            profileService.saveComponent(key, strValue, saveImmediately);
            storageTypeValue = storageType || utils.Constants.StorageType.Local;
        }

        return _addToStorageFromObjEncrypted(key, value, storageTypeValue);
    };

    var getString = function (key, storageType) {
        var storageTypeValue = storageType || utils.Constants.StorageType.Local;
        return _getFromStorageAsString(key, storageTypeValue);
    };

    var getObject = function (key, storageType) {
        var storageTypeValue = storageType || utils.Constants.StorageType.Local;
        return _getFromStorageAsObj(key, storageTypeValue);
    };

    var getAsObjDecrypted = function (key, storageType) {
        var storageTypeValue = storageType || utils.Constants.StorageType.Local;
        return _getFromStorageAsObjDecrypted(key, storageTypeValue);
    };

    var contains = function (key, storageType) {
        var storageTypeValue = storageType || utils.Constants.StorageType.Local;
        return _containsInStorage(key, storageTypeValue);
    };

    var remove = function (key, storageType) {
        var storageTypeValue = storageType || utils.Constants.StorageType.Local;
        return _removeFromStorageByKey(key, storageTypeValue);
    };

    return {
        addString: addString,
        addObject: addObject,
        addFromObjEncrypted: addFromObjEncrypted,
        getString: getString,
        getObject: getObject,
        getAsObjDecrypted: getAsObjDecrypted,
        contains: contains,
        remove: remove,
        getKey: getKey,
        getExchangeKey: getExchangeKey
    };
})();
