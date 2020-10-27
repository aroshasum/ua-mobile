import WidgetContainerController from './widget-container-controller';

export default WidgetContainerController.extend({
    // Subscription key
    containerKey: 'topPanel',
    outletName: 'priceTopPanel',

    getLastActiveMenu: function () {
        return undefined;
    },

    getLastActiveTab: function () {
        return undefined;
    }/* ,
     controllers: {},

     onThemeChanged: function (theme) {
     this.changeControllerTheme(this.controllers, theme);
     },

     onLanguageChanged: function (language) {
     this.changeControllerLanguage(this.controllers, language);
     },

     onVisibilityChanged: function (isHidden) {
     this.changeVisibility(this.controllers, isHidden);
     },

     saveLastMenuTab: function () {
     return null;
     }*/
});
