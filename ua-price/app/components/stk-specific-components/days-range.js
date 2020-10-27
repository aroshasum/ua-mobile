import Ember from 'ember';
import utils from '../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'components/stk-specific-components/days-range',
    prevBarUpdatedValue: 0,
    prevBarUpdatedSymbol: '',
    styles: '',

    didInsertElement: function () {
        this.setStyles();
    },

    dayRangeSettings: {
        styles: {
            green: 'up-back-color',
            red: 'down-back-color'
        }
    },

    dayRangePosition: (function () {
        var stock = this.get('stock');
        var value = 0;

        if (stock) {
            var lowValue = stock.low;
            var highValue = stock.high;
            var currentValue = stock.ltp;
            var diff = highValue - lowValue;

            if (diff !== 0) {
                value = parseFloat((currentValue - lowValue) / diff * 100);
                value = value > 0 && value < 100 ? value : 0;
            }

            return utils.formatters.formatNumber(value, stock.deci);
        }
    }).property('stock.ltp', 'stock.low', 'stock.high'),

    highValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.high, stock.deci);
    }).property('stock.high'),

    lowValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.low, stock.deci);
    }).property('stock.low'),

    lastTradeValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.ltp, stock.deci);
    }).property('stock.ltp'),

    setStyles: function () {
        var prevBarUpdatedValue = this.get('prevBarUpdatedValue');
        var progress = parseInt(this.get('dayRangePosition'), 10);
        var currentSymbol = this.get('stock.sym');

        if (progress === 0 || Math.abs(progress - prevBarUpdatedValue) > 5 || currentSymbol !== this.get('prevBarUpdatedSymbol')) {
            var backgroundColor = progress >= 0 && progress <= 50 ? this.dayRangeSettings.styles.red : this.dayRangeSettings.styles.green;
            this.set('progressBarClass', backgroundColor);
            this.set('prevBarUpdatedValue', progress);
            this.set('prevBarUpdatedSymbol', currentSymbol);
            this.set('styles', 'width:' + progress + '%;');  // Used inline styles since width is dynamically
        }
    }.observes('dayRangePosition')
});

