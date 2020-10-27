import Ember from 'ember';
import utils from '../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'components/stk-specific-components/fifty-two-wk-hl',
    prevBarUpdatedValue: 0,
    prevBarUpdatedSymbol: '',
    styles: '',

    didInsertElement: function () {
        this.setStyles();
    },

    fiftyTwoWkSettings: {
        styles: {
            green: 'up-back-color',
            red: 'down-back-color'
        }
    },

    fiftyTwoWkPosition: (function () {
        var stock = this.get('stock');
        var value = 0;

        if (stock) {
            var lowValue = stock.l52;
            var highValue = stock.h52;
            var currentValue = stock.ltp;
            var diff = highValue - lowValue;

            if (diff !== 0) {
                value = parseFloat((currentValue - lowValue) / diff * 100);
                value = value > 0 && value < 100 ? value : 0;
            }

            return utils.formatters.formatNumber(value, stock.deci);
        }

        return value;
    }).property('stock.ltp', 'stock.l52', 'stock.h52'),

    highValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.h52, stock.deci);
    }).property('stock.h52'),

    lowValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.l52, stock.deci);
    }).property('stock.l52'),

    setStyles: function () {
        var prevBarUpdatedValue = this.get('prevBarUpdatedValue');
        var progress = parseInt(this.get('fiftyTwoWkPosition'), 10);
        var backgroundColor = progress >= 0 && progress <= 50 ? this.fiftyTwoWkSettings.styles.red : this.fiftyTwoWkSettings.styles.green;
        var currentSymbol = this.get('stock.sym');

        if (progress === 0 || Math.abs(progress - prevBarUpdatedValue) > 5 || currentSymbol !== this.get('prevBarUpdatedSymbol')) {
            this.set('progressBarClass', backgroundColor);
            this.set('prevBarUpdatedValue', progress);
            this.set('prevBarUpdatedSymbol', currentSymbol);
            this.set('styles', 'width:' + progress + '%;');  // Used inline styles since width is dynamically
        }
    }.observes('fiftyTwoWkPosition')
});

