import Ember from 'ember';
import utils from '../../../../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'price/widgets/mobile/components/fifty-two-wk-hl',

    position: (function () {
        var stock = this.get('stock');
        var value = 0;

        if (stock) {
            var lowValue = stock.l52;
            var highValue = stock.h52;
            var currentValue = stock.ltp;
            var diff = highValue - lowValue;

            if (diff !== 0) {
                value = parseInt((currentValue - lowValue) / diff * 100, 10);
                value = value > 0 && value <= 100 ? value : 0;
            }

            return value;
        }

        return value;
    }).property('stock.ltp', 'stock.l52', 'stock.h52'),

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
        return utils.formatters.formatNumber(stock.h52, stock.deci);
    }).property('stock.h52'),

    lowValue: (function () {
        var stock = this.get('stock');
        return utils.formatters.formatNumber(stock.l52, stock.deci);
    }).property('stock.l52'),

    styles: (function () {
        return 'left:' + this.get('position') + '%;';
    }).property('position')
});

