/* global c3 */
import Ember from 'ember';
import sharedService from '../../../../../models/shared/shared-service';
import PriceConstants from '../../../../../models/price/price-constants';
import chartDP from '../../../../chart/data/chart-data-provider';
import ChartConstants from '../../../../../models/chart/chart-constants';

export default Ember.Component.extend({
    layoutName: 'price/widgets/mobile/components/summary-chart',

    exchange: sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.currentExchange),
    index: '',
    chartId: '',
    cashMapChartData: {columns: [['cashIn', 0], ['cashOut', 0]], lastUpdatedChartValue: 0, lastUpdatedCashInValue: 0}, // cash map chart data
    lastDrawnIndex: 0, // For main index chart
    indexCss: '',     // Index colour
    indexChangeSign: '', // Index sign + or -
    previousMainIndexSide: '=',
    intradayMainIndexChart: null, // Intra-day main index chart object
    cashMapChart: null,
    chartDataProvider: null,
    marketStatusChangeCount: 0,

    /* *
     * Adding main index request to price service
     * This will use user's current exchange and index
     */

    settingIndex: function () {
        var that = this;
        var stock = that.get('stock');
        var chartId = that.get('chartId');

        if (!(that.get('isDestroyed') || that.get('isDestroying'))) {
            that.set('index', stock);
            that.set('chartId', chartId);
        }
    }.observes('stock'),

    symbolChange: function () {
        Ember.run.debounce(this, this.onAfterRender, 1000);
    }.observes('stock'),

    onAfterRender: function () {
        var that = this;

        // Separate Market Summary Loading and Chart loading
        Ember.run.later(function () {
            if (!(that.get('isDestroyed') || that.get('isDestroying'))) {
                that.settingIndex();

                var cDP = chartDP.create({
                    chartCategory: ChartConstants.ChartCategory.Intraday,
                    chartDataLevel: ChartConstants.ChartDataLevel.IntradayCurrentDay,
                    chartViewPeriod: ChartConstants.ChartViewPeriod.OneDay,

                    onData: function (ohlcPoint, exg, sym) {
                        that.amendMainIndexChart(ohlcPoint, exg, sym);
                    },

                    onDataChunk: function (chartSymbolObj) {
                        that.updateMainIndexChart(chartSymbolObj);
                    },

                    onErrorFn: function () {
                    }
                });

                that.set('chartDataProvider', cDP);
                cDP.addChartSymbol(that.get('stock').exg, that.get('stock').sym, true);
                that.get('chartDataProvider').addChartDataSubscription();
            }
        }, 500);
    }.on('didInsertElement'),

    indexInfoSettings: {
        intZero: 0,
        emptyString: '',

        styles: {
            green: 'green',
            darkGreen: 'green-dark',
            red: 'red',
            darkRed: 'red-dark',
            white: 'colour-5',
            upArrow: 'glyphicon-triangle-top glyphicon ',
            downArrow: 'glyphicon-triangle-bottom glyphicon ',
            chartDefaultColor: '#262932',
            cashInColor: '#2ecc71',
            cashOutColor: '#ff6b6b',
            backgroundUp: 'index-change-green',
            backgroundDown: 'index-change-red',
            backgroundZero: 'index-change-none',
            percentageUp: 'index-percentage-green',
            percentageDown: 'index-percentage-red',
            percentageZero: 'index-percentage-none'
        },

        signs: {plus: '+', minus: '-', equal: '='},

        chartsSettings: {
            cashMapChart: {
                width: 85,
                height: 85
            },

            indexChart: {}
        },

        timeInterval: {
            OneSecondInMillis: 1000,
            OneMinuteInMillis: 60000
        },

        chartDrawingThreshold: 2,
        chartValueUpdatingThreshold: 0.5
    },

    /* *
     * This is to updated index relate CSS ( colours and sign +/- )
     * Observes : index.pctChg
     * Change: indexArrowCss , indexChangeSign, indexCss, indexValCss
     */

    updateIndexRelatedCss: function () {
        var indexArrowCss = '';
        var indexCss = '';
        var indexValCss = '';
        var indexChangeSign = '';
        var indexBackgroundCss = '';
        var indexPercentageCss = '';
        var pctChg = this.get('index.pctChg');

        if (pctChg > this.indexInfoSettings.intZero) {
            indexCss = this.indexInfoSettings.styles.darkGreen;
            indexValCss = this.indexInfoSettings.styles.green;
            indexArrowCss = this.indexInfoSettings.styles.upArrow;
            indexChangeSign = this.indexInfoSettings.signs.plus;
            indexBackgroundCss = this.indexInfoSettings.styles.backgroundUp;
            indexPercentageCss = this.indexInfoSettings.styles.percentageUp;
        } else if (pctChg < this.indexInfoSettings.intZero) {
            indexCss = this.indexInfoSettings.styles.darkRed;
            indexValCss = this.indexInfoSettings.styles.red;
            indexChangeSign = '';
            indexArrowCss = this.indexInfoSettings.styles.downArrow;
            indexBackgroundCss = this.indexInfoSettings.styles.backgroundDown;
            indexPercentageCss = this.indexInfoSettings.styles.percentageDown;
        } else {
            indexCss = this.indexInfoSettings.styles.white;
            indexValCss = this.indexInfoSettings.styles.white;
            indexChangeSign = '';
            indexArrowCss = this.indexInfoSettings.emptyString;
            indexBackgroundCss = this.indexInfoSettings.styles.backgroundZero;
            indexPercentageCss = this.indexInfoSettings.styles.percentageZero;
        }

        this.set('indexArrowCss', indexArrowCss);
        this.set('indexChangeSign', indexChangeSign);
        this.set('indexCss', indexCss);
        this.set('indexValCss', indexValCss);
        this.set('indexBackgroundCss', indexBackgroundCss);
        this.set('indexPercentageCss', indexPercentageCss);
    }.observes('index.pctChg'),

    /* *
     * Update main index chart
     * draw chart if chart is null
     */

    onMarketStatusChanged: function () {
        var that = this;
        var stat = this.exchange.get('stat');
        var count = that.get('marketStatusChangeCount');

        if (stat === PriceConstants.MarketStatus.Open && that.get('marketStatusChangeCount') > 0) {
            that.drawMainIndexChart([]);
        }

        that.set('marketStatusChangeCount', count + 1);
    }.observes('exchange.stat'),

    updateMainIndexChart: function () {
        var that = this;
        var chartDataArray = that.get('chartDataProvider').getDataArray();
        this.set('lastDrawnIndex', chartDataArray.length - 1);
        if (chartDataArray.length > 1) {
            if (that.intradayMainIndexChart === null) {
                that.drawMainIndexChart();
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

    amendMainIndexChart: function (ohlcPoint) {
        var that = this;

        if (that.intradayMainIndexChart === null) {
            that.drawMainIndexChart();
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
    drawMainIndexChart: function (chartDataArray) {
        var that = this;
        var chartData = (chartDataArray) ? chartDataArray : that.get('chartDataProvider').getDataArray();
        var chartWidth = Ember.$(window).width() - 50;

        this.intradayMainIndexChart = c3.generate({
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
                    Close: that.getChartColor()
                }
            },
            area: {
                zerobased: false
            },
            point: {
                show: false
            },
            size: {
                width: chartWidth,
                height: 100
            },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 10
            },
            bindto: '#' + that.chartId,
            axis: {
                x: {
                    type: 'timeseries',
                    tick: {
                        // format: '%m %d',
                        format: '%H:%M',
                        culling: {
                            max: 3
                        }
                        // count: 5
                    }
                },
                y: {show: false}
            },
            legend: {
                show: false
            },
            tooltip: {
                show: false
            }
        });
    },

    /* *
     * this is to update main index colour real time
     * change chart colour if only
     * Observe index.pctChg
     */
    updateMainIndexChartColors: function () {
        var pctChg = this.get('index.pctChg');
        var previousMainIndexSide = this.get('previousMainIndexSide');
        var currentMainIndexSide = '';
        var that = this;

        if (pctChg > this.indexInfoSettings.intZero) {
            currentMainIndexSide = this.indexInfoSettings.signs.plus;
        } else if (pctChg < this.indexInfoSettings.intZero) {
            currentMainIndexSide = this.indexInfoSettings.signs.minus;
        } else {
            currentMainIndexSide = this.indexInfoSettings.signs.equal;
        }

        if (previousMainIndexSide !== currentMainIndexSide && this.intradayMainIndexChart && this.intradayMainIndexChart.data) {
            this.set('previousMainIndexSide', currentMainIndexSide);

            this.intradayMainIndexChart.data.colors({
                Close: that.getChartColor()
            });
        }
    }.observes('stock.pctChg'),

    /* *
     * This is  to get top panel chart colour based on change val
     * @param pctChgVal  percentage change
     * @returns {string} colour
     */
    getChartColor: function (pctChgVal) {
        var pctChg = pctChgVal || this.get('index.pctChg');
        var lineColor = '#559fd6';

        if (pctChg > this.indexInfoSettings.intZero) {
            lineColor = '#19703e';
        } else if (pctChg < this.indexInfoSettings.intZero) {
            lineColor = '#842424';
        } else {
            lineColor = '#559fd6';
        }

        return lineColor;
    }
});