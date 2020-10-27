/* global Hammer */
import Ember from 'ember';
import BaseController from '../../../../../base-controller';
import appEvents from '../../../../../../app-events';
import sharedService from '../../../../../../models/shared/shared-service';
import appConfig from '../../../../../../config/app-config';
import ControllerFactory from '../../../../../../controllers/controller-factory';
import utils from '../../../../../../utils/utils';
import LanguageDataStore from '../../../../../../models/shared/language/language-data-store';

export default BaseController.extend({
    tradeService: sharedService.getService('trade'),
    customWLArray: sharedService.getService('price').watchListDS.getCustomWLArray(),
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

    // Parameters related to custom watchlist
    customWatchListArray: sharedService.getService('price').watchListDS.customWatchListArray,
    myFavouritesIndex: 0,
    myFavouritesKey: 'myFavourites',

    priceService: sharedService.getService('price'),

    isTradingEnabled: function () {
        return appConfig.customisation.isTradingEnabled;
    }.property(),

    isMultipleCustomWLAvailable: function () {
        return this.get('customWLArray').length > 1;
    }.property('customWLArray.length'),

    onLoadWidget: function () {
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onPrepareData: function () {
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
        this.set('symbolList', this.priceService.stockDS.getSymbolCollectionByExchange(this.get('exg')));
        this.set('isAddedToCustomWatchList', false);

        // In order to activate/ deactivate Liquidate Button.
        if (appConfig.customisation.isTradingEnabled) {
            this.set('holdings', this.get('tradeService').holdingDS.getHoldingCollection());
        }

        this.priceService.watchListDS.initializeCustomWL();
        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);

        var inst = this.get('stock.inst');

        this.set('isIndices', utils.AssetTypes.isIndices(inst));
        this.set('isTradableAssetType', utils.AssetTypes.isTradableAssetType(inst));
    },

    onLanguageChanged: function () {
        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);
    },

    checkHoldingAvailability: function () {
        var holdings = this.get('holdings');
        var isLiquidateEnable = false;
        var currentStock = this.get('stock');

        if (holdings && holdings.length > 0) {
            Ember.$.each(holdings, function (key, holding) {
                if (currentStock.sym === holding.symbol && currentStock.exg === holding.exg) {
                    isLiquidateEnable = true;

                    return false;
                }
            });
        }

        this.set('isLiquidateEnable', isLiquidateEnable);
    }.observes('stock'),

    dSymbolCss: function () {
        return this.get('isLiquidateEnable') ? 'layout-col-24' : 'layout-col';
    }.property('isLiquidateEnable'),

    buyText: function () {
        return this.get('app.lang.labels.buy').toUpperCase();
    }.property(),

    sellText: function () {
        return this.get('app.lang.labels.sell').toUpperCase();
    }.property(),

    onAfterRender: function () {
        var that = this;
        var hammerObj = new Hammer(document.getElementById('quoteStatusPanelContainer'), this.options);
        hammerObj.get('swipe').set({velocity: 0.1});

        hammerObj.on('swipeleft swiperight', function (ev) {
            if (ev.type === 'swipeleft') {
                that.nextSymLeftAction();
            } else {
                that.nextSymRightAction();
            }

            Ember.isQuoteStatusSwipeTriggered = true;
        });

        this.checkHoldingAvailability();
        this.set('isAddedToCustomWatchList', this.priceService.watchListDS.isSymbolAvailableInCustomWL(this.get('stock')));
    },

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
        var pctChg = this.stock.get('pctChg');
        var changeSign = '';
        var perChgCss = '';
        var changeCss = '';

        if (pctChg > this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.upArrow;
            perChgCss = this.quoteSettings.styles.green;
            changeCss = this.quoteSettings.styles.darkGreen;
        } else if (pctChg < this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.downArrow;
            perChgCss = this.quoteSettings.styles.red;
            changeCss = this.quoteSettings.styles.darkRed;
        } else {
            changeSign = this.quoteSettings.emptyString;
            perChgCss = this.quoteSettings.styles.white;
        }

        this.set('changeSign', changeSign);
        this.set('perChgCss', perChgCss);
        this.set('changeCss', changeCss);
    }.observes('stock.pctChg'),

    nextSymRightAction: function () {
        var that = this;

        Ember.$.each(this.get('symbolList'), function (key, value) {
            if (that.get('stock').sym === value.sym) {
                that.set('symbolNum', key);
                return false;
            }
        });

        if (this.get('symbolNum') < this.get('symbolList').length - 1) {
            this.set('symbolNum', that.get('symbolNum') + 1);
        } else {
            this.set('symbolNum', 0);
        }

        this.set('stock', this.get('symbolList').objectAt(this.get('symbolNum')));
        appEvents.onSymbolChanged(this.get('stock').sym, this.get('stock').exg, this.get('stock').inst, '1');
    },

    nextSymLeftAction: function () {
        var that = this;

        Ember.$.each(this.get('symbolList'), function (key, value) {
            if (that.get('stock').sym === value.sym) {
                that.set('symbolNum', key);
                return false;
            }
        });

        if (this.get('symbolNum') === 0) {
            this.set('symbolNum', this.get('symbolList').length - 1);
        } else {
            this.set('symbolNum', that.get('symbolNum') - 1);
        }

        this.set('stock', this.get('symbolList').objectAt(this.get('symbolNum')));
        appEvents.onSymbolChanged(this.get('stock').sym, this.get('stock').exg, this.get('stock').inst, '1');
    },

    showOrderTicket: function (side) {
        sharedService.getService('tradeUI').showOrderTicket(this.container, side, this.get('stock'));
    },

    isTradingDisabledExg: function () {
        return !this.tradeService.userDS.isTradeEnabledExchange(this.get('exg')) || utils.AssetTypes.isIndices(this.get('stock.inst'));
    }.property('stock'),

    actions: {
        addStocksToCustomWL: function (customWL) {
            var myFavoriteCustomWL = 0;
            var customWLId = customWL ? customWL.id : myFavoriteCustomWL;
            var that = this;
            var stock = this.get('stock');

            if (this.get('isAddedToCustomWatchList') && !this.get('isMultipleCustomWLAvailable')) {
                var languageTexts = that.get('app').lang;

                utils.messageService.showMessage(languageTexts.messages.deleteConfirmation,
                    utils.Constants.MessageTypes.Question,
                    false,
                    languageTexts.labels.confirm,

                    [{type: utils.Constants.MessageBoxButtons.Ok, btnAction: function () {
                            that.priceService.watchListDS.deleteSymbol(stock, customWLId);
                            that.set('isAddedToCustomWatchList', false);
                        }
                    }, {type: utils.Constants.MessageBoxButtons.Cancel}]
                );
            } else {
                this.set('isAddedToCustomWatchList', true);
                this.priceService.watchListDS.addStocksToCustomWL(stock, customWLId);
            }
        },

        nextSymRight: function () {
            this.nextSymRightAction();
        },

        nextSymLeft: function () {
            this.nextSymLeftAction();
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
            var widgetController = ControllerFactory.createController(this.container, 'controller:price/widgets/mobile/alert-price');
            var viewName = 'price/widgets/mobile/alert-price';

            widgetController.set('selectedLink', 1);
            widgetController.set('hideTitle', true);
            widgetController.set('isHideLink', true);
            widgetController.set('rowHeight', 60);
            widgetController.set('stock', this.get('stock'));
            widgetController.set('isChildView', true);

            widgetController.initializeWidget({wn: 'alert-price'});

            sharedService.getService('priceUI').showChildView(viewName, widgetController, widgetController.get('title'), 'alert-price-' + this.get('wkey'));
        },

        onShareScreen: function () {
            sharedService.getService('priceUI').shareScreenshot([this.get('stock.sDes'), ' ', '#', this.get('stock.sym'), ' ', '#', this.app.lang.labels.quote, ' '].join(''));
        },

        showSymbolSearch: function () {
            sharedService.getService('sharedUI').getService('titleBar').toggleDisplay();
        }
    }
});