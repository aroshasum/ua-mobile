import Ember from 'ember';
import utils from '../../../utils/utils';
import languageDataStore from '../language/language-data-store';

export default Ember.Object.extend({
    cacheKey: '',
    isEncrypt: false,
    isCompress: false,
    persistData: {},

    setData: function (dataObj) {
        if (dataObj) {
            var that = this;

            Ember.$.each(dataObj, function (key, value) {
                that.set(key, value);
            });
        }
    },

    save: function (storageType, saveImmediately, language, windowId) {
        var saveString = utils.jsonHelper.convertToJson(this.getPersistentData());

        if (this.isEncrypt) {
            saveString = utils.crypto.encryptText(saveString);
        }

        if (this.isCompress) {
            saveString = utils.compressionHelper.getCompressedString(saveString);
        }
        utils.webStorage.addString(utils.webStorage.getKey(this.cacheKey, language, windowId), saveString, storageType, saveImmediately);
    },

    load: function (storageType, language, windowId) {
        var savedObj;
        var savedString = utils.webStorage.getString(utils.webStorage.getKey(this.cacheKey, language, windowId), utils.Constants.StorageType.Local);

        if (this.isCompress) {
            savedString = utils.compressionHelper.getDecompressedString(savedString);
        }

        if (this.isEncrypt && utils.validators.isAvailable(savedString)) {
            try {
                savedString = utils.crypto.decryptText(savedString);
            } catch (e) {
                utils.logger.logWarning('Decryption failed retrieving data from storage : ' + this.cacheKey + language);
            }
        }

        try {
            savedObj = utils.jsonHelper.convertFromJson(savedString);
        } catch (e) {
            utils.logger.logWarning('Json parse failed retrieving data from storage : ' + this.cacheKey + language);
        }

        this.setData(savedObj);

        return savedObj;
    },

    remove: function (storageType, language, windowId) {
        utils.webStorage.remove(utils.webStorage.getKey(this.cacheKey, language, windowId), storageType);
    },

    clearSavedData: function () {
        var that = this;
        var languages = languageDataStore.getUserLanguages();

        Ember.$.each(languages, function (key, lang) {
            that.remove(utils.Constants.StorageType.Local, lang.code);
        });
    },

    getPersistentData: function () {
        return this;
    }
});
