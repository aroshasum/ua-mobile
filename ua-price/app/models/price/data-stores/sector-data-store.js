import Ember from 'ember';
import sector from '../business-entities/sector';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    store: {},
    sectorMapByExg: {},

    getSector: function (exchange, secCode) {
        var key = utils.keyGenerator.getKey(exchange, secCode);
        var currentStore = this.get('store');
        var sectorObj = currentStore[key];

        if (!sectorObj) {
            sectorObj = sector.create({
                sec: secCode
            });

            this.addToOtherCollections(exchange, sectorObj);
            currentStore[key] = sectorObj;
        }

        return sectorObj;
    },

    addToOtherCollections: function (exchange, sectorObj) {
        var currentStockMapByExg = this.get('sectorMapByExg');

        if (currentStockMapByExg[exchange]) {
            currentStockMapByExg[exchange].pushObject(sectorObj);
        } else {
            currentStockMapByExg[exchange] = Ember.A([sectorObj]);
        }
    },

    getSectorCollectionByExchange: function (exchange) {
        var sectorMapByExg = this.get('sectorMapByExg');

        if (!sectorMapByExg[exchange]) {
            sectorMapByExg[exchange] = Ember.A([]);
        }

        return sectorMapByExg[exchange];
    },

    addSectors: function (sectorArray) {
        var that = this;
        var sortedSectorArray = sectorArray.sortBy('desc');

        Ember.$.each(sortedSectorArray, function (key, val) {
            var sectorObj = that.getSector(val.exg, val.sec);

            sectorObj.setData({
                des: utils.formatters.convertUnicodeToNativeString(val.desc)
            });
        });
    }
});
