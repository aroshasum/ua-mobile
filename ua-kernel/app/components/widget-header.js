import Ember from 'ember';
import appConfig from '../config/app-config';
import ResponsiveHandler from '../helpers/responsive-handler';

export default Ember.Component.extend({
    layoutName: 'components/widget-header',
    searchKey: '', // This is used by global search component

    isTablet: function () {
        return appConfig.customisation.isTablet;
    }.property(),

    initialize: function () {
        var parentController = this.get('targetObject');

        this.set('wkey', parentController.get('wkey'));
        parentController.set('widgetHeaderComponent', this);

        if (this.get('isTablet')) {
            var innerWidgets = this.get('innerWidgets');

            if (innerWidgets && innerWidgets.isAvailable) {
                var noOfInnerWidget = innerWidgets.innerTabs.length;
                var width = 100 / noOfInnerWidget;

                this.set('innerTabWidth', width + '%');
            }
        }
    }.on('init'),

    didInsertElement: function () {
        var innerWidgets = this.get('innerWidgets');

        if (!this.get('isTablet') && innerWidgets && innerWidgets.isAvailable) {
            this.initializeResponsive();
        }
    },

    initializeResponsive: function () {
        this.set('responsive', ResponsiveHandler.create({controller: this, widgetId: 'widget-header-' + this.get('wkey'), callback: this.onResponsive}));

        this.responsive.addList('widget-header-middle', [
            {id: 'inner-widget', width: 5}
        ]);

        this.responsive.initialize();
    },

    onResponsiveChanged: function () {
        if (this.responsive) {
            this.responsive.onResize();
        }
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        if (!controller._isDestroyed()) {
            if (responsiveArgs.responsiveLevel >= 1) {
                controller.set('innerWidgetIcon', true);
            } else {
                controller.set('innerWidgetIcon', false);
            }
        }
    },

    _isDestroyed: function () {
        return this.get('isDestroyed') || this.get('isDestroying');
    },

    actions: {
        clickAction: function (item) {
            if (this.get('parentView') && this.get('parentView').outletName) { // Only two types of Headers :- In Popup Views and Widgets
                this.get('parentView').send('clickAction', item);
            } else {
                this.sendAction('clickAction', item);
            }
        },

        showSearchPopup: function () {
            if (this.get('searchKey') !== '') {
                var modal = this.get(this.searchID.popup);
                modal.send('showModalPopup');
            }
        },

        closeSearchPopup: function () {
            var modal = this.get(this.searchID.popup);
            modal.send('closeModalPopup');
            this.set('searchKey', '');
        },

        setLink: function (option) {
            if (this.get('parentView') && this.get('parentView').outletName) {   // Only two types of Headers :- In Popup Views and Widgets
                this.get('parentView').send('setLinkView', option);
            } else {
                this.sendAction('setLink', option);
            }
        },

        titleTabAction: function (option) {
            this.sendAction('tabAction', option);
        },

        titleDropdownAction: function (option) {
            this.sendAction('selectAction', option);
        },

        titleResizeAction: function (option) {
            this.sendAction('resizeAction', option);
        },

        reloadDataAction: function () {
            this.sendAction('reloadAction');
        },

        setExchange: function (option) {
            this.sendAction('setExchange', option);
        },

        setSubMarket: function (option) {
            this.sendAction('setSubMarket', option);
        },

        renderInnerWidgetItems: function (innerWidgetContent, baseWidgetId) {
            this.sendAction('innerWidgetAction', {
                innerWidget: innerWidgetContent,
                baseWidgetId: baseWidgetId
            });
        }
    }
});
