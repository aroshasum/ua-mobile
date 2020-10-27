import Ember from 'ember';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    sym: '',               // Symbol
    chg: '',               // Change
    pctChg: '',            // Percentage change
    ltp: '',               // Last Trade Price
    vol: '',               // Volume
    trades: '',            // No of trades
    tovr: '',              // Turnover
    desc: '',              // Description
    dSym: '',              // Display Symbol

    dDesc: function () {
        return utils.formatters.convertUnicodeToNativeString(this.get('desc'));
    }.property('desc'),     // Display symbol description

    setData: function (topStockMsg) {
        var that = this;

        Ember.$.each(topStockMsg, function (key, value) {
            that.set(key, value);
        });
    }
});
