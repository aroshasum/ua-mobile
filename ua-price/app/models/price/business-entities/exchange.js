import Ember from 'ember';
import languageDataStore from '../../../models/shared/language/language-data-store';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    app: undefined,

    exg: '',               // Exchange
    des: '',               // Description
    sDes: '',              // Short Description
    dcf: '',               // Decimal Correction Factor
    dep: '',               // Decimal Places
    de: '',                // Display exchange
    stat: '',              // Market Status
    cur: '',               // Currency
    delTime: '',           // Market Data Delayed Time (in minutes)
    country: '',           // Country Code
    tzo: '',               // Time zone offset
    date: '',              // Market Date
    time: '',              // Market Time
    led: '',               // Last Eod Date - Need to check the usage of this
    ups: '',               // UPs
    dwns: '',              // Downs
    nChg: '',              // No Change
    symt: '',              // Number of Symbols Traded
    vol: '',               // Volume
    tovr: '',              // TurnOver
    trades: '',            // No Of Trades
    mktCap: '',            // Market Capitalisation
    mboal: 0,              // MboAdvancedLimit
    mbol: 0,
    mbpal: 0,              // MbpAdvancedLimit
    mbpl: 0,
    mboae: false,          // IsAdvancedMboEnabled
    mbpae: false,          // IsAdvancedMbpEnabled
    virtual: false,        // IsVirtual Exchange
    cio: '',               // Cash In No of Orders
    civ: '',               // Cash In Volume
    cit: '',               // Cash In Turn Over
    coo: '',               // Cash Out No of Orders
    cov: '',               // Cash Out Volume
    cot: '',               // Cash Out Turnover
    netCashPer: '',        // Net Cash per
    cashInPer: '',         // Cash in per
    mainIdx: '',           // Main index
    newsProv: '',          // News Provider
    openTime: '',          // Market Open Time
    closeTime: '',         // Market Close Time
    statStr: '',           // Market Status String
    subMarketArray: undefined, // Sub Markets
    tick: 0,               // Exchange Tick Size
    statStrLong: '',
    brokerMapping: {},     // Broker Mapping
    exgOtherDesc: '',      // Exchange Other Description

    init: function () {
        this._super();
        this.set('app', languageDataStore.getLanguageObj());
    },

    adjustedMktTime: function () {
        var adjustedTime = utils.formatters.getAdjustedDateTime(this.get('time'), this.get('tzo'));
        var displayTime = utils.formatters.convertToDisplayTimeFormat(adjustedTime);

        return displayTime;
    }.property('time'),

    mktTime: function () {
        return this.get('date') + '' + this.get('time');
    }.property('date', 'time'),

    setStatStr: function () {
        this.set('statStr', this.app.lang.labels['mktStatus_' + this.get('stat')]); // Market Status String
    }.observes('stat', 'des'),      // Description is changed with language

    setStatStrLong: function () {      // Market Status String Long
        if (this.app.lang.labels['mktStatusLong_' + this.get('stat')]){
           // return this.app.lang.labels['mktStatusLong_' + this.get('stat')];
            this.set('statStrLong', this.app.lang.labels['mktStatusLong_' + this.get('stat')]);
        } else {
          //  return this.get('statStr');
            this.set('statStrLong', this.app.lang.labels['mktStatus_' + this.get('stat')]);
        }
    }.observes('stat', 'des'),

    calculateCashPer: function () {
        var cashInTurnOver = this.get('cit');
        var cashOutTurnOver = this.get('cot');

        this.set('cashInPer', (cashInTurnOver) * 100 / (cashInTurnOver + cashOutTurnOver));
        this.set('netCashPer', (cashInTurnOver - cashOutTurnOver) * 100 / (cashInTurnOver + cashOutTurnOver));
    }.observes('cit', 'cot'),

    getBrokerDescription: function (brokerCode) {
        var brokerMapping = this.get('brokerMapping');
        var brokerDes = brokerMapping[brokerCode];

        return brokerDes ? brokerDes : sharedService.userSettings.displayFormat.noValue;
    },

    setData: function (exchangeMessage) {
        var that = this;

        Ember.$.each(exchangeMessage, function (key, value) {
            that.set(key, value);
        });
    }
});

