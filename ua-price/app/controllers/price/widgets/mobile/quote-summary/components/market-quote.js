import Ember from 'ember';
import FiftyTwoWkHl from '../../components/fifty-two-wk-hl';
import sharedService from '../../../../../../models/shared/shared-service';
import DaysRange from '../../components/days-range';
import CashMap from '../../../../../../components/stk-specific-components/cash-map';
import BaseComponent from '../../../../../../components/base-component';

export default BaseComponent.extend({
    layoutName: 'price/widgets/mobile/quote-summary/components/market-quote',

    dimensions: {
        w: 8,
        h: 6
    },
    stock: {},
    symbolList: [],
    symbolNum: 0,
    colorCSS: 'fore-color',
    backColorCSS: 'toolbar-color',
    fontColorCSS: 'fore-color',
    ltpIconCSS: '',
    isDisabledCashMap: false,

    onPrepareData: function () {
        this.set('symbolList', sharedService.getService('price').stockDS.getSymbolCollectionByExchange(this.get('stock.exg')));
        this.updatePercentageChangeCss();
        var lowResolutionWidth = 340;

        if (window.screen.width <= lowResolutionWidth) {
            this.set('isDisabledCashMap', true);
            this.set('dayRangeContainerCss', 'pad-l-lr');
        }
    }.on('didInsertElement'),

    quoteSettings: {
        intZero: 0,
        emptyString: '',
        styles: {
            green: 'green',
            darkGreen: 'green-dark',
            red: 'red',
            darkRed: 'red-dark',
            white: 'white',
            upArrow: 'glyphicon-triangle-top glyphicon ',
            downArrow: 'glyphicon-triangle-bottom glyphicon '
        }
    },

    updatePercentageChangeCss: function () {
        var stock = this.get('stock');
        this.set('colorCSS', stock.pctChg > 0 ? 'up-fore-color' : stock.pctChg === 0 ? 'fore-color' : 'down-fore-color');
        this.set('ltpIconCSS', stock.pctChg > 0 ? 'glyphicon-triangle-top' : stock.pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
        this.set('backColorCSS', stock.pctChg > 0 ? 'up-back-color' : stock.pctChg === 0 ? 'toolbar-color' : 'down-back-color');
        this.set('fontColorCSS', stock.pctChg > 0 ? 'btn-txt-color' : stock.pctChg === 0 ? 'fore-color' : 'btn-txt-color');
    }.observes('stock', 'stock.pctChg')
});

Ember.Handlebars.helper('fifty-two-wk-hl', FiftyTwoWkHl);
Ember.Handlebars.helper('days-range', DaysRange);
Ember.Handlebars.helper('cash-map', CashMap);
