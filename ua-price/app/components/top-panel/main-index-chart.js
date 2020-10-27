/* global c3 */

import Ember from 'ember';
import PriceConstants from '../../models/price/price-constants';
import sharedService from '../../models/shared/shared-service';
import ChartConstants from '../../models/chart/chart-constants';
import chartDP from '../../controllers/chart/data/chart-data-provider';
import BaseComponent from './../base-component';
import ControllerFactory from '../../controllers/controller-factory';
import utils from '../../utils/utils';
import layout from '../../templates/components/top-panel/main-index-chart';
import assetTypes from '../../utils/asset-types';
import appConfig from '../../config/app-config';

export default BaseComponent.extend({
    exchange: undefined,
    currentIndex: undefined,
    indexCollection: Ember.A(),
    indexCollectionArray: Ember.A(),
    priceService: sharedService.getService('price'),
    defaultIndexForDropdown: sharedService.getService('price').stockDS.getStock(sharedService.userSettings.price.currentExchange, sharedService.userSettings.price.currentIndex, utils.AssetTypes.Indices),
    intZero: 0,
    emptyString: '',
    signs: {plus: '+', minus: '-', equal: '='},

    styles: {
        upColor: 'up-fore-color',
        downColor: 'down-fore-color',
        foreColor: 'fore-color',
        upArrow: 'glyphicon-triangle-top glyphicon ',
        downArrow: 'glyphicon-triangle-bottom glyphicon font-x-l ',
        backgroundUp: 'ms-top-bar-index-change-green',
        backgroundDown: 'ms-top-bar-index-change-red',
        backgroundZero: 'ms-top-bar-index-change-none',
        percentageUp: 'ms-top-bar-index-percentage-green',
        percentageDown: 'ms-top-bar-index-percentage-red',
        percentageZero: 'ms-top-bar-index-percentage-none'
    },

    // Chart data
    intradayMainIndexChart: null, // Intra-day main index chart object
    chartDataProvider: null,
    marketStatusChangeCount: 0,

    layout: layout,

    chartId: function () {
        return 'c3-' + this.get('id');
    }.property('id'),

    isTablet: function () {
        return appConfig.customisation.isTablet;
    }.property(),

    didInsertElement: function () {
        this.set('exg', sharedService.userSettings.price.currentExchange);
        this.set('mainIndex', sharedService.userSettings.price.currentIndex);

        this._prepareWidget();
    },

    willDestroyElement: function () {
        this._clearMainIndexChart();
    },

    _prepareWidget: function () {
        this.set('currentIndex', this.priceService.stockDS.getStock(this.get('exg'), this.get('mainIndex'), utils.AssetTypes.Indices));
        this.set('indexCollection', this.priceService.stockDS.getIndexCollectionByExchange(this.get('exg')));

        this.priceService.addFullMarketIndexRequest(this.get('exg'));
        this._prepareMainIndexChart();
    },

    _prepareMainIndexChart: function () {
        var that = this;

        // Create the chart data provider
        var cDP = chartDP.create({
            chartCategory: ChartConstants.ChartCategory.Intraday,
            chartDataLevel: ChartConstants.ChartDataLevel.IntradayCurrentDay,
            chartViewPeriod: ChartConstants.ChartViewPeriod.OneDay,

            onData: function (ohlcPoint, exg, sym) {
                that._amendMainIndexChart(ohlcPoint, exg, sym);
            },

            onDataChunk: function (chartSymbolObj) {
                that._updateMainIndexChart(chartSymbolObj);
            },

            onErrorFn: function () {
                // TODO: [Amila] implement this
            }
        });

        that.set('chartDataProvider', cDP);
        cDP.addChartSymbol(this.get('currentIndex.exg'), this.get('currentIndex.sym'), true);

        // Initiate the data download via the CDP
        that.get('chartDataProvider').addChartDataSubscription();
    },

    _clearMainIndexChart: function () {
        // Stop the data download via the CDP
        if (this.get('chartDataProvider')) {
            this.get('chartDataProvider').removeChartDataSubscription();
            this.get('chartDataProvider').removeChartSymbol(this.get('currentIndex.exg'), this.get('currentIndex.sym'));
        }

        this.set('chartDataProvider', null);
    },

    /* *
     * This is to updated currentIndex relate CSS ( colours and sign +/- )
     * Observes : currentIndex.pctChg
     * Change: indexArrowCss , indexChangeSign, indexCss, indexValCss
     */
    _updateIndexRelatedCss: function () {
        var indexArrowCss, indexCss, indexValCss, indexChangeSign, indexBackgroundCss, indexPercentageCss;
        var pctChg = this.get('currentIndex.pctChg');

        if (pctChg > this.intZero) {
            indexCss = this.styles.upColor;
            indexValCss = this.styles.upColor;
            indexArrowCss = this.styles.upArrow;
            indexChangeSign = this.signs.plus;
            indexBackgroundCss = this.styles.backgroundUp;
            indexPercentageCss = this.styles.percentageUp;
        } else if (pctChg < this.intZero) {
            indexCss = this.styles.downColor;
            indexValCss = this.styles.downColor;
            indexChangeSign = '';
            indexArrowCss = this.styles.downArrow;
            indexBackgroundCss = this.styles.backgroundDown;
            indexPercentageCss = this.styles.percentageDown;
        } else {
            indexCss = this.styles.foreColor;
            indexValCss = this.styles.foreColor;
            indexChangeSign = '';
            indexArrowCss = this.emptyString;
            indexBackgroundCss = this.styles.backgroundZero;
            indexPercentageCss = this.styles.percentageZero;
        }

        this.set('indexArrowCss', indexArrowCss);
        this.set('indexChangeSign', indexChangeSign);
        this.set('indexCss', indexCss);
        this.set('indexValCss', indexValCss);
        this.set('indexBackgroundCss', indexBackgroundCss);
        this.set('indexPercentageCss', indexPercentageCss);
    }.observes('currentIndex.pctChg'),

    /* *
     * Update main index chart
     * draw chart if chart is null
     */
    _onMarketStatusChanged: function () {
        var that = this;
        var exchange = this.get('exchange');

        if (exchange) {
            var stat = exchange.stat;

            if (stat) {
                var count = that.get('marketStatusChangeCount');

                if (stat === PriceConstants.MarketStatus.Open && that.get('marketStatusChangeCount') > 0) {
                    that._drawMainIndexChart([]);
                }

                that.set('marketStatusChangeCount', count + 1);
            }
        }
    }.observes('exchange.stat'),

    _updateMainIndexChart: function () {
        var that = this;
        var chartDataArray = that.get('chartDataProvider').getDataArray();
        this.set('lastDrawnIndex', chartDataArray.length - 1);

        if (chartDataArray.length > 1) {
            if (that.intradayMainIndexChart === null) {
                that._drawMainIndexChart();
            } else {
                that.intradayMainIndexChart.load({
                    json: chartDataArray,
                    keys: {
                        x: 'DT',
                        value: ['Close']
                    }
                });
            }
        }
    },

    _amendMainIndexChart: function (ohlcPoint) {
        var that = this;

        if (that.intradayMainIndexChart === null) {
            that._drawMainIndexChart();
        } else {
            if (ohlcPoint) {
                that.intradayMainIndexChart.flow({
                    json: [ohlcPoint],
                    keys: {
                        x: 'DT',
                        value: ['Close']
                    },
                    length: 0
                });
            }
        }
    },

    /* *
     * Draw main index chart
     */
    _drawMainIndexChart: function (chartDataArray) {
        var that = this;
        var isTablet = this.get('isTablet');
        var width = isTablet ? 90 : 115;
        var height = isTablet ? 56 : 60;
        var chartData = (chartDataArray) ? chartDataArray : that.get('chartDataProvider').getDataArray();

        // Default x axis configs
        var x = {
            type: 'timeseries',
            tick: {
                // format: '%m %d',
                format: '%H:%M',
                culling: {
                    max: 3
                }
                // count: 5
            }
        };

        var c3DefObj = {
            data: {
                json: chartData,
                keys: {
                    x: 'DT',
                    value: ['Close']
                },
                types: {
                    Close: 'area'
                },
                colors: {
                    Close: that._getChartColor()
                }
            },
            area: {
                zerobased: false
            },
            point: {
                show: false
            },
            size: {
                width: width,
                height: height
            },
            padding: {
                top: isTablet ? 0 : 10,
                right: isTablet ? 0 : 10,
                bottom: 0,
                left: isTablet ? 0 : 12
            },
            // TODO [Pathum] Need to fix alignment issues before implementing this.
            bindto: '#' + this.get('chartId'),

            axis: {
                x: isTablet ? {show: false} : x,
                y: {show: false}
            },
            legend: {
                show: false
            },
            tooltip: {
                show: false
            }
        };

        Ember.$.extend(c3DefObj, this.getChartConfig());

        this.intradayMainIndexChart = c3.generate(c3DefObj);
    },

    getChartConfig: function () {
        return {};
    },

    /* *
     * This is  to get top panel chart colour based on change val
     * @param pctChgVal  percentage change
     * @returns {string} colour
     */
    _getChartColor: function (pctChgVal) {
        var pctChg = pctChgVal || this.get('currentIndex.pctChg');
        var lineColor = '#559fd6';

        if (pctChg > this.intZero) {
            lineColor = '#19703e';
        } else if (pctChg < this.intZero) {
            lineColor = '#842424';
        }

        return lineColor;
    },

    /* *
     * this is to update main index colour real time
     * change chart colour if only
     * Observe currentIndex.pctChg
     */
    _updateMainIndexChartColors: function () {
        var that = this;
        var currentMainIndexSide;
        var pctChg = this.get('currentIndex.pctChg');
        var previousMainIndexSide = this.get('previousMainIndexSide');

        if (pctChg > this.intZero) {
            currentMainIndexSide = this.signs.plus;
        } else if (pctChg < this.intZero) {
            currentMainIndexSide = this.signs.minus;
        } else {
            currentMainIndexSide = this.signs.equal;
        }

        if (previousMainIndexSide !== currentMainIndexSide && this.intradayMainIndexChart && this.intradayMainIndexChart.data) {
            this.set('previousMainIndexSide', currentMainIndexSide);

            this.intradayMainIndexChart.data.colors({
                Close: that._getChartColor()
            });
        }
    }.observes('currentIndex.pctChg'),

    _popUpWidget: function (id) {
        var sym = this.get('currentIndex.sym');
        var exg = this.get('currentIndex.exg');
        var symbolPopupView = ControllerFactory.createController(this.container, 'view:symbol-popup-view');

        symbolPopupView.show(id, sym, exg, assetTypes.indices);
    },

    _changeIndex: function (option) {
        this.set('currentIndex', option);
        this._clearMainIndexChart();
        this._prepareMainIndexChart();
    },

    _loadIndexCollection: function () {
        Ember.run.once(this, this._loadIndies);
    }.observes('indexCollection.@each.sDes', 'indexCollection.@each.dSym'),

    _loadIndies: function () {
        if (this.get('indexCollectionArray').length > 0) { // On language change, remove previously applied dropdown desc
            this.set('indexCollectionArray', Ember.A());
        }

        var that = this;
        var indexArray = this.priceService.stockDS.getIndexCollectionByExchange(this.get('exg'));

        Ember.$.each(indexArray, function (key, val) {
            if (val.get('sym') === that.get('mainIndex') || val.isMainIdx) {
                that.set('defaultIndexForDropdown', val);
                that.set('currentIndex', val);
                return false;
            }
        });

        this.get('indexCollectionArray').pushObjects(indexArray);
    },

    actions: {
        popUpChartOptionWidget: function () {
            // Chart id = 4
            this._popUpWidget(4);
            utils.analyticsService.trackEvent('market-top-panel', utils.Constants.GAActions.click, ['popup:', 'chart', ', ', 'sym:', this.get('currentIndex.sym'), '~', this.get('exchange').exg].join(''));
        },

        onPrepareData: function (exchange) {
            var mainIndex = this.priceService.exchangeDS.getExchange(exchange).get('mainIdx');
            this.set('exg', exchange);

            if (mainIndex) {
                this.set('mainIndex', mainIndex);
            }

            this._clearMainIndexChart();
            this._prepareWidget();
            this._loadIndies();
        },

        onClearData: function () {
            this._clearMainIndexChart();
        },

        onLanguageChanged: function () {
            this._loadIndexCollection();
        },

        setIndexData: function (option) {
            this._changeIndex(option);
        },

        onAddSubscription: function () {
            this.priceService.addFullMarketIndexRequest(this.get('exg'));
        },

        onRemoveSubscription: function () {
            this.priceService.removeFullMarketIndexRequest(this.get('exg'));
        }
    }
});
