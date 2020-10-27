import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import PriceConstants from '../models/price/price-constants';
import languageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    layoutName: 'components/gms-tab-panel',
    gmsTabs: [],
    app: languageDataStore.getLanguageObj(),

    settings: {
        tabs: [
            {id: 0, displayKey: 'summary', assetType: PriceConstants.GmsType.Summary},
            {id: 1, displayKey: 'indices', assetType: PriceConstants.GmsType.Indices},
            {id: 2, displayKey: 'commodities', assetType: PriceConstants.GmsType.Commodities},
            {id: 3, displayKey: 'currencies', assetType: PriceConstants.GmsType.Currencies}
        ]
    },

    onPrepareData: function () {
        var that = this;
        var app = this.get('app');
        var gmsTabs = this.get('settings').tabs;

        Ember.$.each(gmsTabs, function (key, tab) {
            tab.displayName = app.lang.labels[tab.displayKey];
            tab.css = (tab.assetType === that.get('assetType')) ? 'active' : '';
        });

        this.set('gmsTabs', gmsTabs);
    }.on('didInsertElement'),

    actions: {
        onGmsTabItemSelected: function (tabItem) {
            var menuContent = this.get('menuContent');

            if (menuContent) {
                sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(menuContent.tab[tabItem.id]);
            }
        }
    }
});