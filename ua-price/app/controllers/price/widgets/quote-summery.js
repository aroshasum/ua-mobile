import Ember from 'ember';
import BaseController from '../../base-controller';
import sharedService from '../../../models/shared/shared-service';
import CashMap from '../../../components/stk-specific-components/cash-map';
import DaysRange from '../../../components/stk-specific-components/days-range';
import FiftyTwoWkHl from '../../../components/stk-specific-components/fifty-two-wk-hl';
import symbolIndicatorHelper from '../../../views/table/symbol-indicator-helper';
import responsiveHandler from '../../../helpers/responsive-handler';
import appConfig from '../../../config/app-config';
import appEvents from '../../../app-events';

export default BaseController.extend({
    dimensions: {
        w: 8,
        h: 6
    },

    stock: {},
    dcfsToolTip: null,
    addBorder: 'widget_new widget-new-border',

    priceService: sharedService.getService('price'),
    isTablet: appConfig.customisation.isTablet,

    onLoadWidget: function () {
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onPrepareData: function () {
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
    },

    onAddSubscription: function () {
        this.priceService.addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    onClearData: function () {
        this.set('stock', []);
    },

    onRemoveSubscription: function () {
        this.priceService.removeIndexRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'quoteSummery-' + this.get('wkey'), callback: this.onResponsive}));

        this.responsive.addList('quoteSummery-right', [
            {id: 'quoteSummery-cashMap', width: 800}
        ]);

        this.responsive.initialize();
    },

    onResponsive: function () {
        // Since this is a component empty callback has to be here
    },

    quoteSettings: {
        intZero: 0,
        emptyString: '',
        styles: {
            upForeColor: 'up-fore-color',
            downForeColor: 'down-fore-color',
            white: 'white',
            upArrow: 'glyphicon-triangle-top glyphicon ',
            downArrow: 'glyphicon-triangle-bottom glyphicon '
        }
    },

    updatePercentageChangeCss: function () {
        var changeSign, perChgCss;
        var changeCss = '';
        var pctChg = this.stock.get('pctChg');

        if (pctChg > this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.upArrow;
            perChgCss = this.quoteSettings.styles.upForeColor;
            changeCss = this.quoteSettings.styles.upForeColor;
        } else if (pctChg < this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.downArrow;
            perChgCss = this.quoteSettings.styles.downForeColor;
            changeCss = this.quoteSettings.styles.downForeColor;
        } else {
            changeSign = this.quoteSettings.emptyString;
            perChgCss = this.quoteSettings.styles.white;
        }

        this.set('changeSign', changeSign);
        this.set('perChgCss', perChgCss);
        this.set('changeCss', changeCss);
    }.observes('stock.pctChg'),

    dcfsStyle: (function () {
        var dcfsObj = symbolIndicatorHelper.formatDcfsValueStyle(this.get('stock.dcfs'));
        this.set('dcfsToolTip', this.get('app').lang.labels[dcfsObj.dcfsToolTip]);

        return dcfsObj.dcfsClass;
    }).property('stock.dcfs'),

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});

Ember.Handlebars.helper('cash-map', CashMap);
Ember.Handlebars.helper('days-range', DaysRange);
Ember.Handlebars.helper('fifty-two-wk-hl', FiftyTwoWkHl);