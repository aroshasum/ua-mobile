import Ember from 'ember';
import priceConstants from '../price-constants';

export default Ember.Object.extend({
    type: '',               // Depth side (bid = 0 or offer = 1)
    lvl: '',                // Depth level
    prc: '',                // Price
    qty: '',                // Quantity
    splt: '',               // Number of splits
    per: '',                // Bar width percentage
    isHighestVol: false,       // Is highest Volume

    isBid: function () {
        return this.get('type') === priceConstants.MarketDepthSide.Bid;
    },

    setData: function (depthRecord) {
        var that = this;

        Ember.$.each(depthRecord, function (key, value) {
            that.set(key, value);
        });
    }
});
