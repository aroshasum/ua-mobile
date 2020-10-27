import Ember from 'ember';
import sharedService from '../../../../../../models/shared/shared-service';
import appConfig from '../../../../../../config/app-config';
import FiftyTwoWkHl from '../../components/fifty-two-wk-hl';
import DaysRange from '../../components/days-range';
import BaseComponent from '../../../../../../components/base-component';

export default BaseComponent.extend({
    layoutName: 'price/widgets/mobile/market-summary/components/chart-panel',
    priceService: sharedService.getService('price'),
    exchange: sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.currentExchange),
    index: '',
    colorCSS: 'fore-color',
    backColorCSS: 'toolbar-color',
    fontColorCSS: 'fore-color',
    ltpIconCSS: '',

    onPrepareData: function () {
        this.settingIndex();
        this.priceService.addExchangeRequest(sharedService.userSettings.price.currentExchange); // TODO [Dasun] Add remove request
        this.addMainIndexRequest();
        this.changeCss();
    }.on('didInsertElement'),

    onClear: function () {
        this.priceService.removeExchangeRequest(this.get('exchange.exg'));
    }.on('willDestroyElement'),

    settingIndex: function () {
        var stock = this.get('stock');
        this.set('index', stock);
    }.observes('stock'),

    changeCss: function () {
        var that = this;
        var stock = that.get('stock');

        if (stock) {
            that.set('colorCSS', stock.pctChg > 0 ? 'up-fore-color' : stock.pctChg === 0 ? 'fore-color' : 'down-fore-color');
            that.set('ltpIconCSS', stock.pctChg > 0 ? 'glyphicon-triangle-top' : stock.pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
            that.set('backColorCSS', stock.pctChg > 0 ? 'up-back-color' : stock.pctChg === 0 ? 'toolbar-color' : 'down-back-color');
            that.set('fontColorCSS', stock.pctChg > 0 ? 'btn-txt-color' : stock.pctChg === 0 ? 'fore-color' : 'btn-txt-color');
        }
    }.observes('stock', 'stock.pctChg'),

    addMainIndexRequest: function () {
        this.priceService.addIndexRequest(sharedService.userSettings.price.currentExchange, sharedService.userSettings.price.currentIndex);
    },

    actions: {
        onNavigateIndicesTab: function () {
            var marketMenuId = appConfig.widgetId.marketMenuId;
            var indicesTabId = appConfig.widgetId.indicesTabId;

            if (marketMenuId && indicesTabId) {
                sharedService.getService('sharedUI').navigateMenu(marketMenuId, indicesTabId);
            }
        }
    }
});

Ember.Handlebars.helper('fifty-two-wk-hl', FiftyTwoWkHl);
Ember.Handlebars.helper('days-range', DaysRange);