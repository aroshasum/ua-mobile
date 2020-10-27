import Ember from 'ember';
import depthRecord from './depth-record';
import PriceConstants from '../price-constants';

export default Ember.Object.extend({
    sym: '',                                            // Symbol
    exg: '',                                            // Exchange
    dt: PriceConstants.MarketDepthType.DepthByPrice,         // Depth Type (DepthByPrice: 1, DepthByOrder: 2)
    bidRecords: null,                                   // Bid side records
    offerRecords: null,                                 // Offer side records

    // Calculation related params
    minBidQty: Number.MAX_VALUE,
    maxBidQty: 0,
    minOfferQty: Number.MAX_VALUE,
    maxOfferQty: 0,

    init: function () {
        this._super();
        this.set('bidRecords', Ember.A());
        this.set('offerRecords', Ember.A());
    },

    setData: function (depthMessage, depthType) {
        // TODO: [Amila] Review the depth logic for ISE as it needs an additional processing (i.e prices are coming as negative values)
        var that = this;
        var recordArray;
        var rec;
        var skipBid = false;
        var skipOffer = false;

        Ember.$.each(depthMessage, function (key, value) {
            // If both sides have qty 0 we are done with processing.
            if (skipBid && skipOffer) {
                return false;
            }

            // Load the correct container first
            if (value.type === PriceConstants.MarketDepthSide.Bid) {
                if (skipBid) {
                    return false;
                }
                recordArray = that.get('bidRecords');
            } else {
                if (skipOffer) {
                    return false;
                }
                recordArray = that.get('offerRecords');
            }

            if (value.qty === 0) {
                // Apply the depth reset logic
                // Reset logic :    For both market depth types if the quantity
                //                  received as 0, then all the records after that including
                //                  the current record with 0 qty should be removed.
                if (value.type === PriceConstants.MarketDepthSide.Bid) {
                    skipBid = true;
                } else {
                    skipOffer = true;
                }

                var itemToBeRemoved = [];
                recordArray.forEach(function (item, index) {
                    if (value.lvl <= index) {
                        itemToBeRemoved.push(item);
                    }
                });

                if (itemToBeRemoved.length > 0) {
                    recordArray.removeAt(value.lvl, itemToBeRemoved.length);
                }
            } else {
                // Check for the existence of the level, if not create a new one
                rec = recordArray.objectAt(value.lvl);
                if (!rec) {
                    rec = depthRecord.create();
                    recordArray.pushObject(rec);
                }

                // Set the depth record values
                rec.setData(value);

                if (depthType === PriceConstants.MarketDepthType.DepthByOrder) {
                    // Fill the sequence manually
                    rec.set('splt', value.lvl + 1);
                }
            }
        });

        // TODO: [Amila] Below 2 methods needs to be refactored. Calculating min and max values logic needs to be revised
        if (this.get('bidRecords').length > 0) {
            that.calculateBidBarValues();
        }

        if (this.get('offerRecords').length > 0) {
            that.calculateOfferBarValues();
        }
    },

    calculateBidBarValues: function () {
        // Bid side calculations
        var that = this;
        var highestVolIndex = -1, tempVal;
        var arrRecords = that.get('bidRecords');

        that.set('minBidQty', Number.MAX_VALUE);
        that.set('maxBidQty', 0);

        arrRecords.forEach(function (item, index) {
            tempVal = parseInt(item.qty, 10);

            if (index === 0) {
                item.set('isBestPrice', true);
            }

            if (tempVal < that.get('minBidQty')) {
                that.set('minBidQty', tempVal);
            }

            if (tempVal > that.get('maxBidQty')) {
                that.set('maxBidQty', tempVal);
                highestVolIndex = index;
            }
        });

        // Now calculate the percentages
        var min = that.get('minBidQty');
        var max = that.get('maxBidQty');
        arrRecords.forEach(function (item) {
            var percentage = 20 + (100 * (parseInt(item.qty, 10) - min) / (max - min) * 0.80);
            item.set('per', 'width:' + percentage + '%');

            if (highestVolIndex > -1) {
                if (item.get('qty') === max) {
                    item.set('isHighestVol', true);
                } else {
                    item.set('isHighestVol', false);
                }
            }
        });
    },

    calculateOfferBarValues: function () {
        // Offer side calculations
        var that = this;
        var highestVolIndex = -1, tempVal;
        var arrRecords = that.get('offerRecords');

        that.set('minOfferQty', Number.MAX_VALUE);
        that.set('maxOfferQty', 0);

        arrRecords.forEach(function (item, index) {
            tempVal = parseInt(item.qty, 10);

            if (index === 0) {
                item.set('isBestPrice', true);
            }

            if (tempVal < that.get('minOfferQty')) {
                that.set('minOfferQty', tempVal);
            }

            if (tempVal > that.get('maxOfferQty')) {
                that.set('maxOfferQty', tempVal);
                highestVolIndex = index;
            }
        });

        // Now calculate the percentages
        var min = that.get('minOfferQty');
        var max = that.get('maxOfferQty');
        arrRecords.forEach(function (item) {
            var percentage = 20 + (100 * (parseInt(item.qty, 10) - min) / (max - min)) * 0.8;
            item.set('per', 'width:' + percentage + '%');

            if (highestVolIndex > -1) {
                if (item.get('qty') === max) {
                    item.set('isHighestVol', true);
                } else {
                    item.set('isHighestVol', false);
                }
            }
        });
    }
});