/* global c3 */

import Ember from 'ember';
import d3 from 'd3';
import utils from '../../../utils/utils';
import BaseComponent from '../../../components/base-component';
import layout from '../../../templates/price/top-panel/cash-maps';
import priceConstants from '../../../models/price/price-constants';
import appConfig from '../../../config/app-config';
import sharedService from '../../../models/shared/shared-service';
import appEvents from '../../../app-events';

export default BaseComponent.extend({
    exchange: undefined,

    dataStatus: false,

    netCashPerChart: null,
    cashMapChart: null,

    isTablet: function () {
        return appConfig.customisation.isTablet;
    }.property(),

    netCashPerChartData: {
        columns: [['netCashPer', 0], ['netCashPerRem', 0]],
        lastUpdatedChartValue: 0,
        lastUpdatedNetCashValue: 0
    },

    cashMapChartData: {
        columns: [['cashIn', 0], ['cashOut', 0]],
        lastUpdatedChartValue: 0,
        lastUpdatedCashInValue: 0
    },

    chartDrawingThreshold: 2,
    chartValueUpdatingThreshold: 0.5,

    noOfDecimalPlaces: 2,
    intZero: 0,

    styles: {
        chartDefaultColor: '#262932',
        cashInColor: '#2ecc72',
        cashOutColor: '#ff6b6b'
    },

    layout: layout,

    onInit: function () {
        appEvents.subscribeThemeChanged(this, 'cash-map');
    }.on('init'),

    themeChanged: function () {
        this._updateNetCashPerChart();
    },

    _drawNetCashPerChart: function () {
        var that = this;

        this.netCashPerChart = c3.generate({
            data: {
                columns: that.netCashPerChartData.columns,
                type: 'donut',
                order: null
            },
            color: {
                pattern: ['#2ecc71', '#262932']
            },
            donut: {
                title: '',
                width: 3,
                label: {
                    show: false
                }
            },
            bindto: '#net_cash_chart',
            size: {
                width: 82,
                height: 82
            },
            legend: {
                hide: true
            },
            tooltip: {
                show: false
            }
        });
    },

    _drawCashMapChart: function () {
        var that = this;

        this.cashMapChart = c3.generate({
            data: {
                columns: that.cashMapChartData.columns,
                type: 'donut',
                order: null
            },
            color: {
                pattern: [that.styles.cashInColor, that.styles.cashOutColor]
            },
            donut: {
                title: '',
                width: 3,
                label: {
                    show: false
                }
            },
            bindto: '#cash_map_chart',
            size: {
                width: 82,
                height: 82
            },
            legend: {
                hide: true
            },
            tooltip: {
                show: false
            }
        });
    },

    _getCashInPer: function () {
        return this.get('exchange.cashInPer');
    },

    _updateCashMapChart: function () {
        var cashInPer = this.get('cashMapChartData.lastUpdatedCashInValue');
        var chartDefaultColor = this.styles.chartDefaultColor;
        var cashInColor = this.styles.cashInColor;
        var cashOutColor = this.styles.cashOutColor;
        var titleValue = cashInPer;
        var chartDataColumns = this.get('cashMapChartData.columns');

        if (this.cashMapChart === null) {
            this._drawCashMapChart();
        } else if (this.get('cashMapChartData.isChartUpdated')) {
            this.cashMapChart.load({
                columns: chartDataColumns
            });

            this.set('cashMapChartData.isChartUpdated', false);
        }

        if (!cashInPer) {
            titleValue = '0.00';

            if (this.cashMapChart.data.colors() &&
                this.cashMapChart.data.colors().cashIn === cashInColor) {
                this.cashMapChart.data.colors({cashIn: chartDefaultColor, cashOut: chartDefaultColor});
            }
        } else if (cashInPer && this.cashMapChart.data.colors() &&
            this.cashMapChart.data.colors().cashIn === this.styles.chartDefaultColor) {
            this.cashMapChart.data.colors({cashIn: cashInColor, cashOut: cashOutColor});
        }

        titleValue = utils.formatters.formatNumber(titleValue, this.get('noOfDecimalPlaces'));
        var cashInPerArray = titleValue.toString().split('.');
        var label = d3.select('#cash_map_chart text.c3-chart-arcs-title');

        Ember.$('.c3-chart-arcs-title', Ember.$(this.cashMapChart.element)).empty();
        label.insert('tspan').text(cashInPerArray[0]).attr('x', -7).attr('y', 4).attr('class', 'prominat');
        label.insert('tspan').text('.' + cashInPerArray[1]).attr('x', 6).attr('y', 4).attr('class', 'symbols-title');
    },

    bindCashMapChartData: function () {
        var cashInPer = Math.abs(this._getCashInPer());

        if (isNaN(cashInPer)) {
            cashInPer = 0;
        } else {
            cashInPer = Math.round(cashInPer * 1e2) / 1e2;    // TODO [arosha] move this to Formatters in case of high usages
        }

        if (!this.get('isTablet')) {
            var isCashMapUpdated = false;
            var lastUpdatedChartValue = this.get('cashMapChartData').lastUpdatedChartValue;
            var lastUpdatedCashInValue = this.get('cashMapChartData').lastUpdatedCashInValue;

            if (cashInPer === 0 || Math.abs(cashInPer - lastUpdatedCashInValue) > this.chartValueUpdatingThreshold) {
                lastUpdatedCashInValue = cashInPer;

                if (cashInPer === 0 || Math.abs(cashInPer - lastUpdatedChartValue) > this.chartDrawingThreshold) {
                    isCashMapUpdated = true;
                    lastUpdatedChartValue = cashInPer;
                }

                var chartDataColumns = [['cashIn', cashInPer], ['cashOut', (100 - cashInPer)]];
                this.set('cashMapChartData', {
                    columns: chartDataColumns,
                    lastUpdatedChartValue: lastUpdatedChartValue,
                    lastUpdatedCashInValue: lastUpdatedCashInValue,
                    isChartUpdated: isCashMapUpdated
                });

                Ember.run.debounce(this, this._updateCashMapChart, priceConstants.TimeIntervals.CashMapChartRefreshInterval);
            }
        } else {
            this.set('cashInPerValue', cashInPer === 0 ? 0 : cashInPer.toFixed(2));
        }
    }.observes('exchange.cashInPer'),

    _updateNetCashPerChart: function () {
        var chartColumns = this.get('netCashPerChartData.columns');
        var netCashPer = this.get('netCashPerChartData.lastUpdatedNetCashValue');

        if (this.netCashPerChart === null) {
            this._drawNetCashPerChart();
        } else if (this.get('netCashPerChartData.isChartUpdated')) {
            this.netCashPerChart.load({
                columns: chartColumns
            });

            this.set('netCashPerChartData.isChartUpdated', false);
        }

        var netCashPerColour = netCashPer > 0 ? '#2ecc71' : '#ff6b6b';
        var netCashPerValue = utils.formatters.formatNumber(netCashPer, 2);
        var netCashPerArray = netCashPerValue.split('.');
        var label = d3.select('#net_cash_chart text.c3-chart-arcs-title');
        var netCashPerRemColor = '#d2d2d2';

        if (sharedService.userSettings.get('currentTheme') === 'theme1') {
            netCashPerRemColor = '#505966';
        }

        Ember.$('.c3-chart-arcs-title', Ember.$(this.netCashPerChart.element)).empty();
        label.insert('tspan').text(netCashPerArray[0]).attr('x', -7).attr('y', 4).attr('class', 'prominat');
        label.insert('tspan').text('.' + netCashPerArray[1]).attr('x', 6).attr('y', 4).attr('class', 'symbols-title');

        this.netCashPerChart.data.colors({
            netCashPer: netCashPerColour,
            netCashPerRem: netCashPerRemColor
        });
    },

    bindNetCashPerChartData: function () {
        var netCashPer = this.get('exchange.netCashPer');

        if (isNaN(netCashPer)) {
            netCashPer = 0;
        }

        var netCashPerAbs = Math.abs(netCashPer);

        if (!this.get('isTablet')) {
            var isChartUpdated = false;
            var lastUpdatedChartValue = this.get('netCashPerChartData').lastUpdatedChartValue;
            var lastUpdatedNetCashValue = this.get('netCashPerChartData').lastUpdatedNetCashValue;

            if (isNaN(netCashPerAbs)) {
                netCashPerAbs = 0;
            }

            if (netCashPer === 0 || Math.abs(netCashPer - lastUpdatedNetCashValue) > this.chartValueUpdatingThreshold) {
                lastUpdatedNetCashValue = netCashPer;

                if (netCashPer === 0 || Math.abs(netCashPer - lastUpdatedChartValue) > this.chartDrawingThreshold) {
                    isChartUpdated = true;
                    lastUpdatedChartValue = netCashPer;
                }

                var chartColumns = [['netCashPerRem', (100 - netCashPerAbs)], ['netCashPer', netCashPerAbs]];

                if (netCashPer > this.intZero) {
                    chartColumns = [['netCashPer', netCashPerAbs], ['netCashPerRem', (100 - netCashPerAbs)]];
                }

                this.set('netCashPerChartData', {
                    columns: chartColumns,
                    lastUpdatedChartValue: lastUpdatedChartValue,
                    lastUpdatedNetCashValue: lastUpdatedNetCashValue,
                    isChartUpdated: isChartUpdated
                });

                Ember.run.debounce(this, this._updateNetCashPerChart, priceConstants.TimeIntervals.CashMapChartRefreshInterval);
            }
        } else {
            this.set('netCashPerValue', !netCashPerAbs ? 0 : netCashPerAbs.toFixed(2));
        }
    }.observes('exchange.netCashPer')
});