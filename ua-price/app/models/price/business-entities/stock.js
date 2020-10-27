import Ember from 'ember';
import utils from '../../../utils/utils';
import priceConstants from '../price-constants';
import appConfig from '../../../config/app-config';
import languageDataStore from '../../../models/shared/language/language-data-store';

export default Ember.Object.extend({
    app: undefined,

    sym: '',               // Symbol
    symStat: '0',          // Symbol Status
    lDes: '',              // Long Description
    sDes: '',              // Short Description
    dSym: '',              // Display Symbol
    exg: '',               // Exchange
    inst: '',              // Instrument Type
    ast: '',               // Asset Type
    cid: '',               // Company Id
    sec: '',               // Sector Code
    subMkt: '',            // Sub Market Code
    open: 0,               // Open
    high: 0,               // High
    low: 0,                // Low
    cls: '',               // Close
    chg: 0,                // Change
    pctChg: 0,             // Percentage Change
    prvCls: 0,             // Previous Close
    tovr: 0,               // TurnOver
    vol: 0,                // Volume
    trades: 0,             // No Of Trades
    cur: '',               // Currency
    ltp: 0,                // Last Traded Price - need to add a related logic
    ltq: '',               // Last Traded Quantity
    ltd: '',               // Last Traded Date - need to map to the new columns
    ltt: '',               // Last Traded Time - need to map to the new columns
    bap: 0,                // Best Ask Price
    baq: 0,                // Best Ask Qty
    bbp: 0,                // Best Bid Price
    bbq: 0,                // Best Bid Qty
    tbq: 0,               // Total Bid Quantity
    taq: 0,               // Total Ask Quantity
    h52: 0,                // 52 Weeks High
    l52: 0,                // 52 Weeks Low
    per: '',               // P / E Ratio
    pbr: '',               // P / B Ratio
    eps: '',               // Earnings Per Share
    yld: '',               // Yield
    lot: 0,                // Lot Size
    uSym: '',              // Underline Symbol (for options)
    stkP: '',              // Strike Price
    expDt: '',             // Expire Date
    deci: 2,               // Decimal Places
    dcf: '',               // Decimal Correction Factor
    refValue: 0.0,          // Ref Value - This is there in RIA, Do we need this.
    vwap: 0,               // VWAP
    rng: '',               // Range
    pctRng: '',            // Percentage Range
    cshMp: '',             // Cash Map
    mktCap: '0',           // Market Cap
    mktCapChg: '',         // Market Cap Change
    pctYtd: '',            // Percentage Year To Date
    cit: '',               // Cash In Turn Over
    cot: '',               // Cash Out Turnover
    civ: 0,                // Cash In Volume
    cov: 0,                // Cash Out Volume
    min: 0,                // Min Price
    max: 0,                // Max Price
    cor: 0,                // Coupon Rate
    cof: 0,                // Coupon frequency
    pcd: 0,                // Previous Coupon Date
    fVal: 0,               // Face Value,
    bor: 0,                // Bid/Offer Ratio
    oInt: 0,               // Open Interest
    oIntC: 0,              // Open Interest Change%
    div: 0,                // Dividend
    edd: '',               // Ex-Dividend Date
    sp: 0,                 // Settlement Price
    matD: '',              // Maturity Date
    boT: 0,                // Bond Type
    outA: 0,               // Outstanding Amount
    setD: 0,               // Settlement Date
    dcm: 0,                // Day Count Method
    isMainIdx: false,      // IsMainIndex (Index type)
    lstShares: 0,          // Listed Shares
    lAnn: null,            // Top Announcement referance
    ann: '',               // Top Announcement header
    dcfs: '',              // Distressed  company flag
    cvwap: '',             // Closing VWAP
    intsV: '',             // Intrinsic value
    twap: 0,               // TWAP
    top: 0,                // Theoretical Open Price
    tcp: 0,                // Theoretical Close Price
    tov: 0,                // Theoretical Open Volume
    tcv: 0,                // Theoretical Close Volume
    av5d: 0,               // Average 5 Dat Volume
    isin: '',              // ISIN
    tick: 0,               // Symbol Tick Size
    shreCap: '',           // Share Capital
    issueAmnt: 0,          // Issue Amount
    dayCountMethod: '',    // Day Count Method
    stlmt: 0,              // Settlement type
    nms: 0,                // Normal Market Size
    sname: '',             // Symbol Session Name

    is52WeekHigh: function () {
        return (this.get('high') >= this.get('h52')) && (this.get('high') > 0 && this.get('h52') > 0);
    }.property('high', 'h52'),   // Reached 52 week high value

    is52WeekLow: function () {
        return (this.get('low') <= this.get('l52')) && (this.get('low') > 0 && this.get('l52') > 0);
    }.property('low', 'l52'),   //  Reached 52 week low value

    isTodayHigh: function () {
        return (this.get('ltp') >= this.get('max')) && (this.get('ltp') > 0 && this.get('max') > 0);
    }.property('ltp', 'max'),   //  Reached today's low value

    isTodayLow: function () {
        return (this.get('ltp') <= this.get('min')) && (this.get('ltp') > 0 && this.get('min') > 0);
    }.property('ltp', 'min'),   //  Reached today's low value

    isChangeNegative: function () {
        return this.get('pctChg') < 0;
    }.property('pctChg'),

    key: function () {
        return this.get('sym') + utils.Constants.StringConst.Tilde + this.get('exg');
    }.property('sym', 'exg'),  // Unique key to identify stock uniquely.

    dExg: function () {
        return this.get('exg');
    }.property('exg'),      // Display Exchange - This need to collect from the correct repository.

    dltt: function () {
        var noOfTrades = this.get('trades');
        var time = this.get('ltt');
        var displayTime = 0;

        if (noOfTrades > 0) {
            displayTime = utils.formatters.formatToTime(time, this.get('exg'));
        }

        return displayTime;
    }.property('ltt', 'trades'),      // Display Time

    bar: function () {
        var tbq, taq, val;

        tbq = this.get('tbq');
        taq = this.get('taq');

        if (tbq === 0 && taq === 0) {
            val = '';
        } else if (tbq === 0 || taq === 0) {
            val = 0;
        } else {
            val = tbq / taq;
        }

        return val;
    }.property('tbq', 'taq'), // Bid Ask Ratio

    spread: function () {
        var bbp = this.get('bbp');
        var bap = this.get('bap');
        var ltp = this.get('ltp');
        var spread = 0;

        if (bbp > 0 && bap > 0 && ltp > 0) {
            var diff = bap - bbp;

            if (diff > 0) {
                spread = (bap - bbp);
            }
        }

        return spread;
    }.property('bbp', 'bap'),  // Spread

    trend: function () {    // Trend
        var change = this.get('chg');
        return change > 0 ? 1 : change < 0 ? -1 : 0;
    }.property('chg'),

    calcNetCash: function () {
        var cashIn = this.get('cit');
        var cashOut = this.get('cot');
        var value = (cashIn - cashOut);

        this.set('netCash', isNaN(value) ? 0 : value);
        this.set('netCashPer', (cashIn - cashOut) * 100 / (cashIn + cashOut));
    }.observes('cit', 'cot'),

    isActive: function () {
        return this.get('symStat') !== priceConstants.SymbolStatus.Expired && this.get('symStat') !== priceConstants.SymbolStatus.Delisted;
    },

    dispProp2: function () {
        var dispConfig = appConfig.customisation.displayProperties;
        var property = dispConfig ? dispConfig.dispProp2 : 'lDes';

        return this.get(property);
    }.property('sDes'),

    dispProp3: function () {
        var dispConfig = appConfig.customisation.displayProperties;
        var property = dispConfig ? dispConfig.dispProp3 : 'cid';

        return this.get(property);
    }.property('sDes'),

    indexDispProp: function () {
        var dispConfig = appConfig.customisation.displayProperties;
        var property = (dispConfig && dispConfig.indexDispProp) ? dispConfig.indexDispProp : 'lDes';

        return this._getEditedValue(property);
    }.property('sDes'),

    instDes: function () {
        var instTypVal = this.get('inst');
        var instLang = this.app.lang.labels[utils.AssetTypes.InstrumentLangKeys[instTypVal]];

        return instLang ? instLang : '--';
    }.property('inst', 'app.lang'),

    _setDispProp1: function () {    // Symbol Text Based on config
        var dispConfig = appConfig.customisation.displayProperties;
        var property = (dispConfig && dispConfig.dispProp1) ? dispConfig.dispProp1 : 'dSym';

        return this._getEditedValue(property);
    },

    _getEditedValue: function (property) {
        var that = this;
        var dispValue = '';
        var dispValueArray = [];

        if (Ember.$.isArray(property)) {
            Ember.$.each(property, function (indexValue, propValue) {
                var valueForProp = that.get(propValue);

                if (valueForProp) {
                    dispValueArray[dispValueArray.length] = valueForProp;
                }
            });

            dispValue = dispValueArray.join(' - ');
        } else {
            dispValue = this.get(property);
        }

        return dispValue;
    },

    _defineDispProp1: function () {    // Dynamic dependent keys based on config
        var displayProperties = appConfig.customisation.displayProperties;
        var dispPropCollection = (displayProperties && displayProperties.dispProp1) ? displayProperties.dispProp1 : ['dSym'];

        if (dispPropCollection) {
            var argsArray = dispPropCollection.concat(this._setDispProp1);
            Ember.defineProperty(this, 'dispProp1', Ember.computed.apply(this, argsArray));
        }
    },

    init: function () {
        this._super();
        this.set('app', languageDataStore.getLanguageObj());
        this._defineDispProp1();
    },

    setData: function (symbolMessage) {
        var that = this;

        Ember.$.each(symbolMessage, function (key, value) {
            that.set(key, value);
        });
    }
});
