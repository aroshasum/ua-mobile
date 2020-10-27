import Ember from 'ember';
import subMarket from '../business-entities/sub-market';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    store: {},
    subMktMapByExg: {},

    getSubMarket: function (exchange, subMktCode) {
        var key = utils.keyGenerator.getKey(exchange, subMktCode);
        var currentStore = this.get('store');
        var subMktObj = currentStore[key];

        if (!subMktObj) {
            subMktObj = subMarket.create({
                marketId: subMktCode
            });

            if (utils.validators.isAvailable(subMktCode)) {
                this.addToOtherCollections(exchange, subMktObj);
            }

            currentStore[key] = subMktObj;
        }

        return subMktObj;
    },

    addToOtherCollections: function (exchange, subMktObj) {
        var subMktMapByExg = this.get('subMktMapByExg');

        if (subMktMapByExg[exchange]) {
            subMktMapByExg[exchange].pushObject(subMktObj);
        } else {
            subMktMapByExg[exchange] = Ember.A([subMktObj]);
        }
    },

    getSubMarketCollectionByExchange: function (exchange) {
        var subMktMapByExg = this.get('subMktMapByExg');

        if (!subMktMapByExg[exchange]) {
            subMktMapByExg[exchange] = Ember.A([]);
        }

        return subMktMapByExg[exchange];
    }
});
