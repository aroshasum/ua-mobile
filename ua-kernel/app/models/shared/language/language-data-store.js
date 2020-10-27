import Ember from 'ember';
import appConfig from '../../../config/app-config';
import sharedService from '../../../models/shared/shared-service';
import appEvents from '../../../app-events';
import utils from '../../../utils/utils';
import themeDataStore from '../../../models/shared/data-stores/theme-data-store';

export default (function () {
    var langStore = {};
    var isLangSet = false;
    var isChangeLangSet = false;

    var selectedLangObj = Ember.Object.extend({
        lang: {}
    }).create();

    var changeLangObj = Ember.Object.extend({
        lang: {}
    }).create();

    var getUserLanguages = function () {
        return appConfig.customisation.supportedLanguages;
    };

    var getLanguageObj = function () {
        if (!isLangSet) {
            selectedLangObj.set('lang', langStore[sharedService.userSettings.currentLanguage]);
            isLangSet = true;
        }

        return selectedLangObj;
    };

    var getObjByLanguage = function (langCode) {
        return langStore[langCode];
    };

    var getChangeLanguageObj = function () {
        if (!isChangeLangSet) {
            changeLangObj.set('lang', getChangeToLanguage(sharedService.userSettings.currentLanguage));
            isChangeLangSet = true;
        }

        return changeLangObj;
    };

    var setLanguageObj = function (langCode, langObj) {
        if (utils.validators.isAvailable(langCode) && langObj) {
            langStore[langCode] = langObj;
        } else {
            utils.logger.logWarning('Language data not available for : ' + langCode);
        }
    };

    var changeLanguage = function (langCode) {
        if (utils.validators.isAvailable(langCode)) {
            var langObj = langStore[langCode];

            if (langObj) {
                selectedLangObj.set('lang', langObj);
                changeLangObj.set('lang', getChangeToLanguage(langCode));

                // Save current language in user's local machine when language changes
                sharedService.userSettings.set('currentLanguage', langCode);
                sharedService.userSettings.save();

                themeDataStore.setOrientationClass(langCode);

                // Notify subscribed widgets about the language change
                appEvents.languageChanged(langCode);
            } else {
                utils.logger.logError('Language data not available for : ' + langCode);
            }
        } else {
            utils.logger.logError('Language code not available');
        }
    };

    var getChangeToLanguage = function (selectedLanguage) {
        var changeLang = {};

        Ember.$.each(appConfig.customisation.supportedLanguages, function (key, val) {
            if (selectedLanguage !== val.code) {
                changeLang = val;
                return changeLang;
            }
        });

        return changeLang;
    };

    var generateLangMessage = function (message, separator) {
        var msgSeparator = separator || utils.Constants.StringConst.Pipe;

        if (message && message.includes(msgSeparator)) {
            var langDesMap = _getLangMessage(message, msgSeparator);
            return langDesMap[sharedService.userSettings.currentLanguage];
        } else {
            return message;
        }
    };

    var _getLangMessage = function (msg, separator) {
        var nativeMsg = utils.formatters.convertUnicodeToNativeString(msg);
        var desArray = nativeMsg.split(separator);
        var langDesMap = {};
        var supportedLangArray = appConfig.customisation.supportedLanguages;

        for (var i = 0; i < desArray.length; i++) {
            if (supportedLangArray[i]) {
                langDesMap[supportedLangArray[i].code] = desArray[i];
            }
        }

        return langDesMap;
    };

    return {
        getUserLanguages: getUserLanguages,
        getChangeToLanguage: getChangeToLanguage,
        getLanguageObj: getLanguageObj,
        getObjByLanguage: getObjByLanguage,
        getChangeLanguageObj: getChangeLanguageObj,
        setLanguageObj: setLanguageObj,
        changeLanguage: changeLanguage,
        generateLangMessage: generateLangMessage
    };
})();
