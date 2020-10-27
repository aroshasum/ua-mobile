import Ember from 'ember';
import appConfig from '../../../config/app-config';
import sharedService from '../../../models/shared/shared-service';
import appEvents from '../../../app-events';

export default (function () {
    var isChangeThemeSet = false;

    var changeThemeObj = Ember.Object.extend({
        theme: {}
    }).create();

    var getChangeThemeObj = function () {
        if (!isChangeThemeSet) {
            changeThemeObj.set('theme', _getChangeToTheme(sharedService.userSettings.currentTheme));
            isChangeThemeSet = true;
        }

        return changeThemeObj;
    };

    var getUserThemes = function () {
        return appConfig.customisation.supportedThemes;
    };

    var changeTheme = function (themeCode) {
        setThemeClass(themeCode);

        changeThemeObj.set('theme', _getChangeToTheme(sharedService.userSettings.currentTheme));

        // Notify subscribed widgets about the theme change
        appEvents.themeChanged(themeCode);
    };

    var _getChangeToTheme = function (selectedTheme) {
        var changedTheme = {};

        Ember.$.each(appConfig.customisation.supportedThemes, function (key, val) {
            if (selectedTheme !== val.code) {
                changedTheme = val;
                return changedTheme;
            }
        });

        return changedTheme;
    };

    var setThemeClass = function (currentTheme) {
        var oldTheme = sharedService.userSettings.currentTheme;
        var newTheme = currentTheme ? currentTheme.split(' ')[0] : '';

        if (newTheme) {
            if (Ember.isIos) {
                newTheme = newTheme + ' ios';
            }

            Ember.$('html').removeClass(oldTheme);
            Ember.$('body').removeClass(oldTheme);

            Ember.$('html').addClass(newTheme);
            Ember.$('body').addClass(newTheme);

            // Save current theme in user's local machine when theme changes
            sharedService.userSettings.set('currentTheme', newTheme);
            sharedService.userSettings.save();
        }
    };

    var setOrientationClass = function (currentLanguage) {
        if (currentLanguage === 'AR') {
            Ember.$('html').addClass('ar');
            Ember.$('body').addClass('ar');
        } else {
            Ember.$('html').removeClass('ar');
            Ember.$('body').removeClass('ar');
        }
    };

    return {
        getUserThemes: getUserThemes,
        getChangeThemeObj: getChangeThemeObj,
        changeTheme: changeTheme,
        setThemeClass: setThemeClass,
        setOrientationClass: setOrientationClass
    };
})();
