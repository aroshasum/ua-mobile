import Ember from 'ember';

export default Ember.Object.extend({
    id: '',                // Market id - Unique identifier
    exg: '',               // Exchange
    sym: '',               // Symbol
    dcf: '',               // Correction Factor
    stat: '',              // Market Status
    vol: '',               // Volume
    tovr: '',              // TurnOver
    cat: '',               // Category
    sec: '',               // Sector
    sou: '',               // Source
    cid: '',               // Company Id
    cnm: '',               // Company Name
    symt: '',              // Number of Symbols Traded
    trades: '',            // No Of Trades
    ups: '',               // UPs
    dwns: '',              // Downs
    nChg: '',              // No Change
    cio: '',               // Cash In No of Orders
    civ: '',               // Cash In Volume
    cit: '',               // Cash In Turn Over
    coo: '',               // Cash Out No of Orders
    cov: '',               // Cash Out Volume
    cot: '',               // Cash Out Turnover

    setData: function (marketMessage) {
        Ember.$.each(marketMessage, function (key, value) {
            this[key] = value;
        });
    }
});
