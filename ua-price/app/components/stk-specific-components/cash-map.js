import Ember from 'ember';
import utils from '../../utils/utils';
import appConfig from '../../config/app-config';

export default Ember.Component.extend({
    layoutName: 'components/stk-specific-components/cash-map',
    prevBarUpdatedValue: 0,
    prevBarUpdatedSymbol: '',
    isMobile: false,

    didInsertElement: function () {
        this.set('isMobile', appConfig.customisation.isMobile);
        this.setStyles();
    },

    cashMapSettings: {
        styles: {
            upForeColor: 'up-fore-color',
            downForeColor: 'down-fore-color',
            upBackColor: 'up-back-color',
            downBackColor: 'down-back-color'
        }
    },

    calculateCash: (function () {
        var stock = this.get('stock');
        var value;

        if (stock) {
            value = stock.cit / (stock.cit + stock.cot);
        }

        return isNaN(value) ? 0 : value * 100;
    }).property('stock.cit', 'stock.cot'),

    showValue: (function () {
        return utils.formatters.formatNumber(this.get('calculateCash'), 2) + '%';
    }).property('calculateCash'),

    setStyles: function () {
        var prevBarUpdatedValue = this.get('prevBarUpdatedValue');
        var progress = parseInt(this.get('calculateCash'), 10);
        var currentSymbol = this.get('stock.sym');

        if (progress === 0 || Math.abs(progress - prevBarUpdatedValue) > 5 || currentSymbol !== this.get('prevBarUpdatedSymbol')) {
            var progressBackStyle = progress >= 0 && progress <= 50 && !this.get('isMobile') ? this.cashMapSettings.styles.downBackColor : this.cashMapSettings.styles.upBackColor;
            this.set('prevBarUpdatedValue', progress);
            this.set('prevBarUpdatedSymbol', currentSymbol);
            this.set('progressBackStyle', progressBackStyle);
            this.set('progressWidth', 'width:' + progress + '%;');  // Used inline styles since width is dynamically
        }
    }.observes('calculateCash'),

    valueStyle: (function () {
        var calculateCash = this.get('calculateCash');

        return calculateCash > 50 ? this.cashMapSettings.styles.upForeColor : calculateCash !== 0 ? this.cashMapSettings.styles.downForeColor : this.cashMapSettings.styles.foreColor;
    }).property('calculateCash')
});

