import Ember from 'ember';
import utils from '../../../utils/utils';
import OptionPeriod from '../business-entities/option-period';

export default Ember.Object.extend({
    store: {},
    periodMap: {},

    getOptionPeriod: function (exchange, baseSymbol, optPeriod) {
        var key = utils.keyGenerator.getKey([exchange, baseSymbol].join('~'), optPeriod);
        var currentStore = this.get('store');
        var periodObj = currentStore[key];

        if (!periodObj) {
            periodObj = OptionPeriod.create({sym: baseSymbol, exg: exchange, optPrd: optPeriod});
            currentStore[key] = periodObj;

            this._addToOtherCollection(exchange, baseSymbol, periodObj);
        }

        return periodObj;
    },

    getOptionPeriodList: function (exchange, baseSymbol) {
        return this._getPeriodCollection(exchange, baseSymbol);
    },

    _addToOtherCollection: function (exchange, baseSymbol, periodObj) {
        this._getPeriodCollection(exchange, baseSymbol).pushObject(periodObj);
    },

    _getPeriodCollection: function (exchange, baseSymbol) {
        var periodMap = this.get('periodMap');

        if (!periodMap[exchange]) {
            periodMap[exchange] = {};
        }

        if (!periodMap[exchange][baseSymbol]) {
            periodMap[exchange][baseSymbol] = Ember.A();
        }

        return periodMap[exchange][baseSymbol];
    }
});
