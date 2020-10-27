import Ember from 'ember';
import AppNavigation from './app-navigation';

export default AppNavigation.extend({
    setActiveMenu: function (currentMenu) {
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead

        Ember.$.each(menuArray, function (key, menuObj) {
            try {
                Ember.set(menuObj, 'css', '');
            } catch (e) {
                menuObj.css = '';
            }
            if (menuObj.id === currentMenu.id) {
                try {
                    Ember.set(menuObj, 'css', 'appmnu-sidebar-active');
                } catch (e) {
                    menuObj.css = 'appmnu-sidebar-active';
                }
            }
        });
    },

    setMenuTitle: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead

        Ember.$.each(menuArray, function (key, menuObj) {
            try {
                Ember.set(menuObj, 'displayTitle', that.get('app').lang.labels[menuObj.title]);
            } catch (e) {
                menuObj.displayTitle = that.get('app').lang.labels[menuObj.title];
            }
        });
    }
});
