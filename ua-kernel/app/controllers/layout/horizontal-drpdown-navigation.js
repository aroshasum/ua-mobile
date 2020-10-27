import Ember from 'ember';
import LeftNavigation from './left-navigation';
import appConfig from '../../config/app-config';

export default LeftNavigation.extend({
    isHorizontalPanel: true,
    isCustomWorkSpaceEnabled: appConfig.customisation.isCustomWorkSpaceEnabled,

    languageChanged: function (language) {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        this._super(language);

        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.tab.length > 1) {
                Ember.$.each(menuObj.tab, function (id, subMenu) {
                    if (that.utils.validators.isAvailable(subMenu.customTitle)) {
                        Ember.set(subMenu, 'displayTitle', subMenu.customTitle); // Rename custom workspace; Get from local storage
                    } else {
                        Ember.set(subMenu, 'displayTitle', that.get('app').lang.labels[subMenu.title]);
                    }
                });
            }
        });
    },

    setMenuTitle: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (key, menuObj) {
            that.setTitle(menuObj);

            if (menuObj.tab.length > 1) {
                that.setTabDisplayTitle(menuObj.tab);
            }
        });
    }
});