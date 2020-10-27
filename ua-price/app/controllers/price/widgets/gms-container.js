import Ember from 'ember';
import BaseArrayController from '../../base-array-controller';
import sharedService from '../../../models/shared/shared-service';
import PriceConstants from '../../../models/price/price-constants';
import appEvents from '../../../app-events';

/* TODO: [Uditha]
    1. Add this to containers folder with a consistent naming standards. Now both "-tab" and "-container" is used
 */
export default BaseArrayController.extend({
    containerKey: 'gmsTabContainer',
    comps: [],
    gmsTabs: Ember.A(),

    widgets: [
        {
            id: 1,
            wn: 'price.widgets.gms-summary-table',
            args: {assetType: 0, selectedLink: 1}
        }
    ],

    gmsTabConfig: [
        {id: 1, displayKey: 'summary', assetType: PriceConstants.GmsType.Summary, css: 'active'},
        {id: 2, displayKey: 'indices', assetType: PriceConstants.GmsType.Indices},
        {id: 3, displayKey: 'commodities', assetType: PriceConstants.GmsType.Commodities},
        {id: 4, displayKey: 'currencies', assetType: PriceConstants.GmsType.Currencies}
    ],

    onPrepareData: function () {
        var app = this.get('app');
        var gmsTabs = this.get('gmsTabs');
        var gmsTabConfig = this.get('gmsTabConfig');

        if (gmsTabs.length === 0) {
            Ember.$.each(gmsTabConfig, function (key, tab) {
                tab.displayName = app.lang.labels[tab.displayKey];
                gmsTabs.pushObject(Ember.Object.create(tab));
            });
        }

        // Subscribe container
        appEvents.subscribeLanguageChanged(this, this.get('containerKey'));
        appEvents.subscribeThemeChanged(this, this.get('containerKey'));
    },

    onLanguageChanged: function () {
        var gmsTabs = this.get('gmsTabs');
        var app = this.get('app');

        Ember.$.each(gmsTabs, function (key, tab) {
            tab.set('displayName', app.lang.labels[tab.get('displayKey')]);
        });
    },

    onAfterRender: function () {
        var widgets = this.get('widgets');
        var widgetContainer = this.widgetContainer;
        var widgetComp = [];

        Ember.$.each(widgets, function (key, value) {
            widgetComp[widgetComp.length] = sharedService.getService('sharedUI').getService('mainPanel').renderWidget(widgetContainer.menuContent, {
                id: widgetContainer.tabContent.id,
                bid: widgetContainer.tabContent.bid,
                wn: widgetContainer.tabContent.wn,
                outlet: 'price.widgets.gms-container'
            }, value, value.args);
        });

        this.set('comps', widgetComp);
        this.setActive(widgets[0]);
    },

    onClearData: function () {
        var comps = this.get('comps');

        Ember.$.each(comps, function (key, value) {
            value.closeWidget();
        });

        // UnSubscribe container
        appEvents.unSubscribeLanguageChanged(this);
        appEvents.unSubscribeThemeChanged(this);
    },

    setActive: function (tabItem) {
        var gmsTabs = this.get('gmsTabs');

        Ember.$.each(gmsTabs, function (key, value) {
            Ember.set(value, 'css', '');

            if (value.id === tabItem.id) {
                Ember.set(value, 'css', 'active');
            }
        });
    },

    actions: {
        onGmsTabItemSelected: function (tabItem) {
            var gmsTableSummaryView = this.comps[0];
            this.setActive(tabItem);

            if (gmsTableSummaryView !== null) {
                var args = {assetType: tabItem.assetType};
                gmsTableSummaryView.refreshWidget(args);
            }
        }
    }
});
