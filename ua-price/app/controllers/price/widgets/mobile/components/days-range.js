import Ember from 'ember';
import utils from '../../../../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'price/widgets/mobile/components/days-range',

    position: (function () {
        var stock = this.get('stock');
        var value = 0;

        if (stock) {
            var lowValue = stock.low;
            var highValue = stock.high;
            var currentValue = stock.ltp;
            var diff = highValue - lowValue;

            if (diff !== 0) {
                value = parseInt((currentValue - lowValue) / diff * 100, 10);
                value = value > 0 && value <= 100 ? value : 0;
            }

            return value;
        }
    }).property('stock.ltp', 'stock.low', 'stock.high'),

    dotColor: (function () {
        var position = this.get('position');

        if (position < 50) {
            return this.get('fiftyTwoWkLowColor') ? this.get('fiftyTwoWkLowColor') : 'down-back-color';
        } else if (position === 50 || position > 50) {
            return this.get('fiftyTwoWkHighColor') ? this.get('fiftyTwoWkHighColor') : 'up-back-color';
        }
    }).property('position'),

    highValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.high, stock.deci);
    }).property('stock.high'),

    lowValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.low, stock.deci);
    }).property('stock.low'),

    styles: (function () {
        return 'left:' + this.get('position') + '%;';
    }).property('position')
});

