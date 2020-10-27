import Ember from 'ember';
import sharedService from '../../../../../../models/shared/shared-service';
import appConfig from '../../../../../../config/app-config';
import ControllerFactory from '../../../../../../controllers/controller-factory';
import LanguageDataStore from '../../../../../../models/shared/language/language-data-store';
import BaseComponent from '../../../../../../components/base-component';
import utils from '../../../../../../utils/utils';

// Duplicate of quote-status-panel controller. Need to refactor this with existing controller.

export default BaseComponent.extend({
    layoutName: 'price/widgets/mobile/quote-summary/components/chart-status-panel',
    tradeService: sharedService.getService('trade'),
    app: LanguageDataStore.getLanguageObj(),

    dimensions: {
        w: 8,
        h: 6
    },

    options: {
        dragLockToAxis: true,
        dragBlockHorizontal: true
    },

    symbolList: [],
    symbolNum: 0,
    menuArray: [{id: 1, name: 'Alerts'}],

    isLandscapeMode: false,
    colorCSS: 'fore-color',
    fontColorCSS: 'fore-color',

    panelContainer: '',
    // Parameters related to custom watchlist
    customWatchListArray: sharedService.getService('price').watchListDS.customWatchListArray,

    isAddedToCustomWatchList: false,

    isTradingEnabled: function () {
        return appConfig.customisation.isTradingEnabled && this.get('stock.inst') !== utils.AssetTypes.Indices;
    }.property(),

    didInsertElement: function () {
        this.updatePercentageChangeCss();
        sharedService.getService('price').watchListDS.initializeCustomWL();
        this.set('isAddedToCustomWatchList', sharedService.getService('price').watchListDS.isSymbolAvailableInCustomWL(this.get('stock')));
    },

    isLiquidateEnabled: function () {
        var isEnabled = false;
        var stock = this.get('stock');

        if (this.get('isTradingEnabled') && stock && stock.sym) {
            var holdings = this.tradeService.holdingDS.getHoldingCollection();

            Ember.$.each(holdings, function (key, holding) {
                if (stock.sym === holding.symbol && stock.exg === holding.exg) {
                    isEnabled = true;

                    return false;
                }
            });
        }

        return isEnabled;
    }.property('stock.sym', 'stock.exg'),

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

        if (stock) {
            this.set('colorCSS', stock && stock.pctChg > 0 ? 'up-fore-color' : stock.pctChg === 0 ? 'fore-color' : 'down-fore-color');
            this.set('ltpIconCSS', stock && stock.pctChg > 0 ? 'glyphicon-triangle-top' : stock.pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
        }
    }.observes('stock.pctChg'),

    showOrderTicket: function (side) {
        this.sendAction('onOrientationChanged', false);
        sharedService.getService('tradeUI').showOrderTicket(this.container, side, this.get('stock'));
    },

    actions: {
        addStocksToCustomWL: function () {
            var stock = this.get('stock');
            var myFavoriteCustomWL = 0;

            sharedService.getService('price').watchListDS.addStocksToCustomWL(stock, myFavoriteCustomWL);
            this.set('isAddedToCustomWatchList', true);
        },

        buy: function () {
            this.showOrderTicket(false);
        },

        onBuyMore: function () {
            this.showOrderTicket(false);
        },

        onLiquidate: function () {
            this.showOrderTicket(true);
        },

        itemClicked: function () {
            this.sendAction('onOrientationChanged', false);

            var widgetController = ControllerFactory.createController(this.container, 'controller:price/widgets/mobile/alert-price');
            var viewName = 'price/widgets/mobile/alert-price';

            widgetController.set('selectedLink', 1);
            widgetController.set('hideTitle', true);
            widgetController.set('isHideLink', true);
            widgetController.set('rowHeight', 60);
            widgetController.set('stock', this.get('stock'));

            widgetController.initializeWidget({wn: 'alert-price'});

            sharedService.getService('priceUI').showChildView(viewName, widgetController, this, this.get('app.lang.labels.alerts'), 'alert-price-' + this.get('wkey'));
        },

        onShareScreen: function () {
            sharedService.getService('priceUI').shareScreenshot([this.get('stock.sDes'), ' ', '#', this.get('stock.sym')].join(''));
        }
    }
});