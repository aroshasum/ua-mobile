import Ember from 'ember';
import languageDataStore from '../../../models/shared/language/language-data-store';
import sharedService from '../../../models/shared/shared-service';
import appConfig from '../../../config/app-config';
import utils from '../../../utils/utils';

export default (function () {
    var prepareLanguageView = function () {
        sharedService.userSettings.set('currentLanguage', _getUserLanguage());
        _setDisplayTexts();
        Ember.$('input:radio[name=lang]').val([sharedService.userSettings.get('currentLanguage')]);
        _bindEvents();
    };

    var showLanguageView = function () {
        Ember.$('div#divLang').show();
    };

    /* *
     * Change display texts on language change
     * @private
     */
    var _setDisplayTexts = function () {
        var currentLangObj = languageDataStore.getLanguageObj().lang;

        // Set button texts
        Ember.$('button#btnLang').text(currentLangObj.labels.next);
        Ember.$('button#btnTheme').text(currentLangObj.labels.next);

        // Set language
        Ember.$('#divPreferredLanguage').text(currentLangObj.labels.preferredLanguage);

        // Set theme
        Ember.$('#divPreferredTheme').text(currentLangObj.labels.preferredTheme);

        // Set copyright
        var copyrightText = currentLangObj.labels.copyright.replace('[CurrentYear]', new Date().getFullYear());
        Ember.$('span#spanCopyright').text(copyrightText);

        // Set best view
        Ember.$('span#spanBestView').text(currentLangObj.labels.bestViewResolution);

        if (appConfig.customisation.isMobile) { // Mobile specific language changes in login page
            // Set button texts
            var loginText = currentLangObj.labels.login;
            loginText = appConfig.customisation.isMobile ? loginText.toUpperCase() : loginText;

            Ember.$('button#btnLogin').text(loginText);

            // Remember me
            Ember.$('span#spanRemember').text(currentLangObj.labels.rememberMe);
        }
    };

    /* *
     * Gets last saved user language or default language if not available
     * @returns {*} User language
     * @private
     */
    var _getUserLanguage = function () {
        var userLang = sharedService.userSettings.get('currentLanguage');
        return utils.validators.isAvailable(userLang) ? userLang : sharedService.userSettings.customisation.defaultLanguage;
    };

    var _bindEvents = function () {
        Ember.$('input[type="radio"][name="lang"]').bind('change', function () {
            languageDataStore.changeLanguage(this.value);
            _setDisplayTexts();
        });

        Ember.$('button#btnLang').bind('click', function () {
            var lang = Ember.$('input[type="radio"][name="lang"]:checked').val();

            sharedService.userSettings.set('currentLanguage', lang);
            sharedService.userSettings.save();

            Ember.$('div#divLang').hide(); // Hide language selection page
            Ember.$('div#divTheme').show(); // Show theme selection page
        });
    };

    return {
        prepareLanguageView: prepareLanguageView,
        showLanguageView: showLanguageView
    };
})();
