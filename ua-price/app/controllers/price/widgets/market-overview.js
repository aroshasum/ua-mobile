import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';
import controllerFactory from '../../controller-factory';
import formatters from '../../../utils/formatters';
import TableController from '../../shared/table-controller';

export default TableController.extend({
    priceService: sharedService.getService('price'),
    colorCss: 'down-fore-color',
    exchangeArray: Ember.A(),
    marketTime: '',
    isEnabledTimer: false,

    onLoadWidget: function () {
        if (!this.utils.flagGenerator.getFlagGenerateStatus()) {
            this.utils.flagGenerator.generateFlagIconStyles();
        }
    },

    onPrepareData: function () {
        this._setExchangeInfo();
    },

    onAddSubscription: function () {
        var that = this;
        var exchangeCodes = this.priceService.userDS.get('userExchg');

        Ember.$.each(exchangeCodes, function (key, exg) {
            if (exg) {
                var exchange = that.priceService.exchangeDS.getExchange(exg);

                that.priceService.exchangeDS.requestExchangeMetadata(exg);
                that.priceService.addExchangeRequest(exg);
                that.priceService.addIndexRequest(exg, exchange.mainIdx);
            }
        });
    },

    onClearData: function () {
        this.set('exchangeArray', Ember.A());
        this.set('mainIndexArray', Ember.A());
    },

    onRemoveSubscription: function () {
        var that = this;
        var exchangeCodes = this.priceService.userDS.get('userExchg');

        Ember.$.each(exchangeCodes, function (key, exg) {
            if (exg) {
                var exchange = that.priceService.exchangeDS.getExchange(exg);

                that.priceService.removeExchangeRequest(exg);
                that.priceService.removeIndexRequest(exg, exchange.mainIdx);
            }
        });
    },

    _setExchangeInfo: function () {
        var that = this;
        var exchangeArray = Ember.A([]);
        var mainIndexArray = Ember.A([]);
        var exchangeCodes = that.priceService.userDS.get('userExchg');

        Ember.$.each(exchangeCodes, function (key, exg) {
            if (exg) {
                var exchange = that.priceService.exchangeDS.getExchange(exg);

                if (exchange && exchange.mainIdx) {
                    var mainIndex = that.priceService.stockDS.getStock(exg, exchange.mainIdx, utils.AssetTypes.Indices);

                    exchange.set('index', mainIndex);
                    mainIndexArray.pushObject(mainIndex);
                }

                exchangeArray.pushObject(exchange);
            }
        });

        this.set('exchangeArray', exchangeArray);
        this.set('mainIndexArray', mainIndexArray);
    },

    setFlagStyles: function () {
        var exchangeArray = this.get('exchangeArray');

        Ember.$.each(exchangeArray, function (key, exchange) {
            if (exchange) {
                var countryCode = exchange.get('country');
                exchange.set('flagCss', 'class-' + (countryCode ? countryCode.toLowerCase() : ''));
            }
        });
    }.observes('exchangeArray.@each.country'),

    setIndexStyles: function () {
        Ember.run.once(this, this._setIndexStyles);
    }.observes('mainIndexArray.@each.pctChg'),

    _setIndexStyles: function () {
        var exchangeArray = this.get('exchangeArray');

        Ember.$.each(exchangeArray, function (key, exchange) {
            var mainIndex = exchange && exchange.get('index') ? exchange.get('index') : '';

            if (mainIndex) {
                var pctChg = mainIndex.get('pctChg');

                exchange.set('indexCss', pctChg > 0 ? 'up-fore-color' : pctChg === 0 ? 'fore-color' : 'down-fore-color');
                exchange.set('ltpIconCSS', pctChg > 0 ? 'glyphicon-triangle-top' : pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
                exchange.set('backColorCSS', pctChg > 0 ? 'up-back-color' : pctChg === 0 ? 'toolbar-color' : 'down-back-color');
                exchange.set('fontColorCSS', pctChg > 0 ? 'btn-txt-color' : pctChg === 0 ? 'fore-color' : 'btn-txt-color');
            }
        });
    },

    updateMarketStatusColorCss: function () {
        var exchangeArray = this.get('exchangeArray');

        Ember.$.each(exchangeArray, function (key, exchange) {
            if (exchange) {
                var stat = exchange.get('stat');

                if (stat === 2 || stat === 1) {
                    exchange.set('colorCss', 'up-fore-color');
                } else if (stat === 3 || stat === 4) {
                    exchange.set('colorCss', 'down-fore-color');
                }
            }
        });
    }.observes('exchangeArray.@each.stat'),

    updateMarketDate: function () {
        var exchangeArray = this.get('exchangeArray');

        Ember.$.each(exchangeArray, function (key, exchange) {
            if (exchange) {
                if (exchange.get('stat') === 3) {
                    var dateTimeStr = formatters.formatToDate(exchange.date, exchange.get('tzo'));

                    exchange.set('isEnabledTimer', false);
                    exchange.set('marketTime', dateTimeStr);
                } else {
                    exchange.set('isEnabledTimer', true);
                }
            }
        });
    }.observes('exchangeArray.@each.date', 'exchangeArray.@each.stat'),

    setMarketTime: function () {
        Ember.run.once(this, this._setMarketTime);
    }.observes('exchangeArray.@each.time'),

    _setMarketTime: function () {
        var exchangeArray = this.get('exchangeArray');

        Ember.$.each(exchangeArray, function (key, exchange) {
            if (exchange && exchange.get('isEnabledTimer')) {
                var adjustedTime = formatters.getAdjustedDateTime(exchange.get('time'), exchange.get('tzo'));
                exchange.set('marketTime', formatters.convertToDisplayTimeFormat(adjustedTime));
            }
        });
    },

    actions: {
        loadSubMarketOverview: function (exchange) {
            var priceUI = sharedService.getService('priceUI');

            if (priceUI && Ember.$.isFunction(priceUI.showChildView)) {
                var widgetController = controllerFactory.createController(this.container, 'controller:price/widgets/sub-market-overview');
                var viewName = 'price/widgets/sub-market-overview';
                var languageLabel = this.get('app').lang.labels.subMarket;

                widgetController.initializeWidget({wn: 'subMarketOverview'}, {widgetArgs: {exg: exchange}});
                priceUI.showChildView(viewName, widgetController, languageLabel, 'sub-market-overview-' + this.get('wkey'));
            }
        }
    }
});
