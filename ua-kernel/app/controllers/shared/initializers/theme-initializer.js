import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';
import themeDataStore from '../../../models/shared/data-stores/theme-data-store';

export default (function () {
    var prepareThemeView = function (showLoginView) {
        themeDataStore.setOrientationClass(sharedService.userSettings.get('currentLanguage'));
        themeDataStore.setThemeClass(_getUserTheme());

        Ember.$('input:radio[name=color]').val([sharedService.userSettings.get('currentTheme')]);

        _bindEvents(showLoginView);
    };

    var showThemeView = function () {
        Ember.$('div#divTheme').show();
    };

    /* *
     * Gets last saved user theme or default theme if not available
     * @returns {*} User theme
     * @private
     */
    var _getUserTheme = function () {
        var userTheme = sharedService.userSettings.get('currentTheme');
        return utils.validators.isAvailable(userTheme) ? userTheme : sharedService.userSettings.customisation.defaultTheme;
    };

    var _bindEvents = function (showLoginView) {
        Ember.$('input[type="radio"][name="color"]').bind('change', function () {
            themeDataStore.setThemeClass(this.value);
        });

        Ember.$('button#btnTheme').bind('click', function () {
            var theme = Ember.$('input[type="radio"][name="color"]:checked').val();

            sharedService.userSettings.set('currentTheme', theme);
            sharedService.userSettings.save();

            Ember.$('div#divTheme').hide(); // Hide theme selection page

            showLoginView();
        });
    };

    return {
        prepareThemeView: prepareThemeView,
        showThemeView: showThemeView
    };
})();
