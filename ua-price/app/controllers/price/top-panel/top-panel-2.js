import Ember from 'ember';
import TopPanel from './top-panel';
import mainIndexChart from './../../../components/top-panel/main-index-chart-2';
import exchangeStatus from './../../../components/top-panel/exchange-status-2';

export default TopPanel.extend({
    exgStatusArea: 'top-panel/exchange-status-2',

    _callComponentsMethod: function (method) {
        var mainIndexChartComponent = Ember.View.views['price-top-panel-main-index-chart-2'];
        var exchangeStatusCmponent = Ember.View.views['price-top-panel-exchange-status-2'];
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
            if (exchangeStatusCmponent) {
                exchangeStatusCmponent.send(method, this.get('exg'));
            }
        } catch (e) {
            this.utils.logger.logError(e);
        }
    },

    netCashPerCss: function () {
        var netCashPer = this.get('exchange.netCashPer');

        return netCashPer >= 0 ? 'up-fore-color' : 'down-fore-color';
    }.property('exchange.netCashPer'),

    cashInPerCss: function () {
        var cashInPer = this.get('exchange.cashInPer');

        return cashInPer >= 50 ? 'up-fore-color' : 'down-fore-color';
    }.property('exchange.cashInPer')
});

Ember.Handlebars.helper('main-index-chart-2', mainIndexChart);
Ember.Handlebars.helper('exchange-status-2', exchangeStatus);