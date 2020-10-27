import Ember from 'ember';
import BaseWidgetContainer from '../base-widget-container';

export default BaseWidgetContainer.extend({
    // Subscription key
    containerKey: 'leftPanel',

    onLoadContainer: function () {
        this._super();
        this.setMenuTitle();
    },

    onRenderUI: function () {
        this.setMenuTitle();
    },

    languageChanged: function (language) {
        this._super(language);

        var menuArray = this.get('appLayout').layout.mainPanel.content;
        var that = this;

        Ember.$.each(menuArray, function (key, menuObj) {
            if (that.utils.validators.isAvailable(menuObj.customTitle)) {
                Ember.set(menuObj, 'displayTitle', menuObj.customTitle); // Rename custom workspace; Get from local storage
            } else {
                Ember.set(menuObj, 'displayTitle', that.get('app').lang.labels[menuObj.title]);
            }
        });
    },

    setTabDisplayTitle: function (menuTabs) {
        var that = this;

        if (menuTabs) {
            Ember.$.each(menuTabs, function (key, tab) {
                that.setTitle(tab);
            });
        }
    },

    setTitle: function (titleObj) {
        try {
            if (this.utils.validators.isAvailable(titleObj.customTitle)) {
                try {
                    Ember.set(titleObj, 'displayTitle', titleObj.customTitle); // Rename custom workspace; Get from local storage
                } catch (e) {
                    titleObj.displayTitle = titleObj.customTitle;
                }
            } else {
                Ember.set(titleObj, 'displayTitle', this.get('app').lang.labels[titleObj.title]);
            }
        } catch (e) {
            titleObj.displayTitle = this.get('app').lang.labels[titleObj.title];
        }
    },

    getSubMenuWidths: function () {
        // Specific menu navigation should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    setSubMenu: function () {
        // Specific menu navigation should implement this method to provide specific functionality
        // Otherwise base function will be executed
    }
});

Ember.Handlebars.helper('isAvailableSubMenu', function (tabArray) {
    return tabArray.length > 1;
});