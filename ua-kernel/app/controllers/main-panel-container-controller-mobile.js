import Ember from 'ember';
import mainPanelContainerController from './main-panel-container-controller';
import sharedService from '../models/shared/shared-service';
import themeDataStore from '../models/shared/data-stores/theme-data-store';
import utils from '../utils/utils';

export default mainPanelContainerController.extend({
    onLoadContainer: function () {
        this._super();
    },

    onAfterRender: function () {
        this._super();

        if (Ember.isIos) {
            this.changeDeviceTheme();
        }
    },

    changeDeviceTheme: function () {
        var childTheme = ' ios';
        var currentTheme = sharedService.userSettings.currentTheme ? sharedService.userSettings.currentTheme : sharedService.userSettings.customisation.defaultTheme;

        themeDataStore.changeTheme(currentTheme.split(utils.Constants.StringConst.Space)[0] + childTheme);
    },

    saveSettings: function (symbol, exchange, insType) {
        var savedSettings = sharedService.userState.lastArgs || {};

        savedSettings.sym = symbol;
        savedSettings.exg = exchange;
        savedSettings.inst = insType;

        sharedService.userState.lastArgs = savedSettings;
        sharedService.userState.save();
    },

    getWidgetArgs: function (widgetDef, tabContent, menuContent) {
        var widgetArgs = {};
        var containerArgs = this.getContainerArgs(menuContent); // Arguments passed via widget container

        var customArgs = this.filterWidgetArgs(this.widgetArgs, widgetDef, tabContent, menuContent); // Arguments stored in argument section in layout config
        var customStoredArgs = this.filterWidgetArgs(sharedService.userState.defaultWS[this.get('containerKey')], widgetDef, tabContent, menuContent); // Arguments stored in user's local machine

        var mergedArgs = Ember.$.extend({}, customStoredArgs, containerArgs, customArgs);

        // Priority given for arguments
        // 1. Arguments passed via widget container
        // 2. Argument section in layout config
        // 3. User's local machine
        Ember.$.each(mergedArgs, function (key) {
            widgetArgs[key] = containerArgs[key] || containerArgs[key] === 0 ? containerArgs[key] :
                customArgs[key] || customArgs[key] === 0 ? customArgs[key] :
                    customStoredArgs[key] || customStoredArgs[key] === 0 ? customStoredArgs[key] : '';
        });

        return {
            widgetArgs: widgetArgs,
            storedArgs: customStoredArgs
        };
    }
});
