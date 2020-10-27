/* global Mousetrap */

import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import BaseController from '../../base-controller';
import mainIndexChart from './../../../components/top-panel/main-index-chart';
import mainIndexChart3 from './../../../components/top-panel/main-index-chart-3';
import exchangeStatus from './../../../components/top-panel/exchange-status';
import exchangeStatus1 from './../../../components/top-panel/exchange-status-1';
import priceTicker from './price-ticker';
import cashMaps from './cash-maps';
import responsiveHandler from '../../../helpers/responsive-handler';
import appEvents from '../../../app-events';
import appConfig from '../../../config/app-config';

/* *
 * Controller class to handle all top panel
 * This widget contains exchange snapshot
 */
export default BaseController.extend({
    // Ember objects references
    exchange: undefined, // User Default exchange reference
    exgSymCollection: undefined, // Exchange Symbol Collection
    prevUpdatedBar: 0,
    exchanges: [],
    selectedExg: {},
    disableMoreMarkets: true,
    subscriptionKey: 'topPanel',
    priceService: sharedService.getService('price'),

    // Updating below properties according to some values of 'exchange' or 'index'
    marketStatusCSS: '', // Market status colour. ex : Green Market Open , red Market close
    ytdCss: 'up-fore-color',
    isRender: false,
    isCashMapDisabled: appConfig.customisation.isCashMapDisabled,
    exgStatusArea: 'top-panel/exchange-status',
    mainIndexArea: 'top-panel/main-index-chart',

    topPanelSettings: {
        intZero: 0,
        emptyString: '',

        styles: {
            upColor: 'up-fore-color',
            downColor: 'down-fore-color',
            foreColor: 'fore-color'
        },

        timeInterval: {
            OneSecondInMillis: 1000,
            OneMinuteInMillis: 60000
        }
    },

    /* *
     * Calculate up,down,unchanged progress bar percentage
     * Observes : exchange.ups,exchange.dwns,exchange.nChg
     */
    upsDownsNoChgValueArray: function () {
        var exg = this.get('exchange');

        if (exg) {
            var ups = exg.ups;
            var down = exg.dwns;
            var unchanged = exg.nChg;
            var maxValue = Math.max(ups, down, unchanged);

            var upsDownsNoChgValueArray = [
                {value: ups, barClass: 'progress-bar up-back-color', barWidth: ''},
                {value: down, barClass: 'progress-bar down-back-color', barWidth: ''},
                {value: unchanged, barClass: 'progress-bar highlight-back-color-2', barWidth: ''}
            ];

            Ember.$.each(upsDownsNoChgValueArray, function (index, item) {
                var percentage;

                if (isNaN(item.value) || item.value === 0 || maxValue === 0) {
                    percentage = 0;
                } else {
                    percentage = Math.round((item.value / maxValue) * 90) + 10;
                }

                item.barWidth = 'width:' + percentage + '%;';
            });

            return upsDownsNoChgValueArray;
        }
    }.property('exchange.ups', 'exchange.dwns', 'exchange.nChg'),

    isTablet: function () {
        return appConfig.customisation.isTablet;
    }.property(),

    onLoadWidget: function () {
        this.set('exg', this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange);
        this.set('idx', this.get('idx') ? this.get('idx') : sharedService.userSettings.price.currentIndex);
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'topPanel-' + this.get('wkey'), callback: this.onResponsive}));

        this.responsive.addList('topPanel-left', [
            {id: 'topPanel-cashmaps', width: 5, responsiveMarginRatio: 4},
            {id: 'topPanel-ytd', width: 20, responsiveMarginRatio: 4},
            {id: 'topPanel-chartIcon', width: 20, responsiveMarginRatio: 4},
            {id: 'topPanel-volume', width: 20, responsiveMarginRatio: 4},
            {id: 'topPanel-turnover', width: 20, responsiveMarginRatio: 4},
            {id: 'topPanel-symbol', width: 20, responsiveMarginRatio: 4}
        ]);

        this.responsive.initialize();
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        if (responsiveArgs.responsiveLevel === 0) {
            Ember.run.later(function () {
                Ember.set(controller, 'cashMapStyle', 'position: relative; top: 0; left: 0');
            }, 1);
        } else {
            Ember.set(controller, 'cashMapStyle', 'position: absolute; top: 25000px; left: 25000px');
        }
    },

    onPrepareData: function () {
        this.set('exchange', this.priceService.exchangeDS.getExchange(this.get('exg')));
        this.set('exgSymCollection', this.priceService.stockDS.getSymbolCollectionByExchange(this.get('exg')));
        this.set('idx', this.utils.validators.isAvailable(this.get('idx')) ? this.get('idx') : this.get('exchange.mainIdx'));
        this.set('index', this.priceService.stockDS.getStock(this.get('exg'), this.get('idx'), this.utils.AssetTypes.Indices));

        // Keyboard search
        Mousetrap.bind('ctrl+f', function () {
            Ember.$('#appGlobalSymbolSearch').focus();
            return false;
        }, 'global');

        this._callComponentsMethod('onPrepareData');
        this.priceService.subscribeAuthSuccess(this, this.get('subscriptionKey'));
    },

    onAddSubscription: function () {
        this.priceService.addExchangeRequest(this.get('exg'));
        this.priceService.addIndexRequest(this.get('exg'), this.get('idx'));

        this._callComponentsMethod('onAddSubscription');
    },

    onAfterRender: function () {
        Ember.run.later(this, this.renderComponents, 1000);
    },

    renderComponents: function () {
        this.set('isRender', true);
    },

    onClearData: function () {
        this.set('exchange', {});
        this.set('index', {});
        this.set('idx', '');

        this._callComponentsMethod('onClearData');
    },

    onRemoveSubscription: function () {
        this.priceService.removeExchangeRequest(this.get('exg'));
        this.priceService.removeIndexRequest(this.get('exg'), this.get('idx'));

        this._callComponentsMethod('onRemoveSubscription');
    },

    onLanguageChanged: function () {
        this._callComponentsMethod('onLanguageChanged');
        Ember.run.later(this, this._setExchangeDesc, 100);
    },

    onThemeChanged: function () {
        this._callComponentsMethod('onThemeChanged');
    },

    onVisibilityChanged: function () {
        this._callComponentsMethod('onVisibilityChanged');
    },

    onAuthSuccess: function () {
        var that = this;
        var exchangeCodes = this.priceService.userDS.get('userExchg');

        this.set('userExgArray', Ember.A());

        Ember.$.each(exchangeCodes, function (key, item) {
            var exgObj = that.priceService.exchangeDS.getExchange(item);
            that.get('userExgArray').pushObject(exgObj);
        });
    },

    _callComponentsMethod: function (method) {
        var mainIndexChartComponent = Ember.View.views['price-top-panel-main-index-chart'];
        var exchangeStatusComponent = Ember.View.views['price-top-panel-exchange-status'];
        var priceTickerComponent = Ember.View.views['price-top-panel-price-ticker'];
        var cashMapsComponent = Ember.View.views['price-top-panel-cash-maps'];

        try {
            if (mainIndexChartComponent) {
                mainIndexChartComponent.send(method, this.get('exg'));
            }
        } catch (e) {
            this.utils.logger.logError(e);
        }

        try {
            if (priceTickerComponent) {
                priceTickerComponent.send(method, this.get('exg'));
            }
        } catch (e) {
            this.utils.logger.logError(e);
        }

        try {
            if (cashMapsComponent) {
                cashMapsComponent.send(method);
            }
        } catch (e) {
            this.utils.logger.logError(e);
        }

        try {
            if (exchangeStatusComponent) {
                exchangeStatusComponent.send(method);
            }
        } catch (e) {
            this.utils.logger.logError(e);
        }
    },

    /* *
     * Returns no of symbols of selected exchange
     */
    _exgSymbolCount: function () {
        return this.get('exgSymCollection').length;
    }.property('exgSymCollection.@each'),

    _symbolsTradedPer: function () {
        var symbolTraded = this.get('exchange.symt');
        var noOfSymbols = this.get('_exgSymbolCount');
        return noOfSymbols ? ((symbolTraded / noOfSymbols) * 100) : 0;
    }.property('exchange.symt', '_exgSymbolCount'),

    /* *
     * Change YTD percentage change css according to ytd value
     * Observes : exchange.pctYtd
     */
    _updateYTDColor: function () {
        var ytdCss;
        var pctYtd = this.get('index.pctYtd');

        if (pctYtd >= this.topPanelSettings.intZero) {
            ytdCss = this.topPanelSettings.styles.upColor;
        } else if (pctYtd < this.topPanelSettings.intZero) {
            ytdCss = this.topPanelSettings.styles.downColor;
        } else {
            ytdCss = this.topPanelSettings.styles.foreColor;
        }

        this.set('ytdCss', ytdCss);
    }.observes('index.pctYtd'),

    _setExchangeDesc: function () {
        var that = this;
        var exchangeArray = [];
        var userExgs = this.get('userExgArray');

        if (userExgs) {
            Ember.$.each(userExgs, function (index, item) {
                exchangeArray[index] = {code: item.exg, desc: item.des, de: that.get('isTablet') ? item.des : item.de};

                if (item.exg === sharedService.userSettings.price.currentExchange) {
                    that.set('selectedExg', exchangeArray[index]);
                }
            });
        }

        this.set('exchanges', exchangeArray);
        this.set('disableMoreMarkets', exchangeArray.length <= 1);
    },

    _observeUserExchanges: function () {
        Ember.run.once(this, this._setExchangeDesc);
    }.observes('userExgArray.@each', 'userExgArray.@each.de'),

    actions: {
        setExchange: function (exchg) {
            var that = this;
            this.priceService.exchangeDS.getExchangeMetadata(exchg.code);

            Ember.$.each(this.get('exchanges'), function (key, val) {
                if (val.code === exchg.code) {
                    that.set('selectedExg', val);
                }
            });

            this.refreshWidget({exg: exchg.code});
            appEvents.onExchangeChanged(-1, exchg.code);
        }
    }
});

Ember.Handlebars.helper('main-index-chart', mainIndexChart);
Ember.Handlebars.helper('main-index-chart-3', mainIndexChart3);
Ember.Handlebars.helper('exchange-status', exchangeStatus);
Ember.Handlebars.helper('exchange-status-1', exchangeStatus1);
Ember.Handlebars.helper('price-ticker', priceTicker);
Ember.Handlebars.helper('cash-maps', cashMaps);