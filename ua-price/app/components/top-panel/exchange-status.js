import Ember from 'ember';
import PriceConstants from '../../models/price/price-constants';
import BaseComponent from './../base-component';
import utils from '../../utils/utils';
import layout from '../../templates/components/top-panel/exchange-status';
import appConfig from '../../config/app-config';

export default BaseComponent.extend({
    exchange: undefined,
    exchanges: undefined,
    disableMoreMarkets: true,
    currentIndex: undefined,

    marketTime: '', // Formatted market time
    mktTime: '',
    isEnabledTimer: false, // Status of timer for market time
    marketStatusCSS: '', // Market status colour. ex : Green Market Open , red Market close
    prevUpdatedBar: 0,

    // Market Open, Close remaining time bar and countdown data
    openExgTime: '0000',
    closeExgTime: '0000',

    openTimeIndex: 0,
    closeTimeIndex: 0,
    currentTimeIndex: 0,
    criticalTimeIndex: 0,

    criticalTimeMin: 25,
    isCriticalTime: false,
    isMarketOpen: false,

    openTimeHour: 0,
    openTimeMins: 0,

    bar: '',
    progressStyle: '',
    showTime: false,
    showTimeText: '',

    layout: layout,

    isTablet: appConfig.customisation.isTablet,

    topPanelSettings: {
        intZero: 0,
        emptyString: '',

        styles: {
            upColor: 'up-fore-color',
            downColor: 'down-fore-color',
            foreColor: 'fore-color'
        },

        timeInterval: {
            OneSecondInMillis: 1000,
            OneMinuteInMillis: 60000
        }
    },

    /* *
     * Update Market time of top panel
     * Observing exchange status and date and change ui accordingly
     * Observes : exchange.status and exchange.date
     */
    _updateMarketTime: function () {
        if (this.get('exchange.stat') === PriceConstants.MarketStatus.Close || this.get('exchange.stat') === PriceConstants.MarketStatus.PreClose) {
            var dateTimeStr = utils.formatters.formatToDate(this.exchange.date, this.get('exchange.exg'));
            this.set('isEnabledTimer', false);
            this.set('marketTime', dateTimeStr);
        } else {
            if (!this.get('isEnabledTimer')) {
                this.set('isEnabledTimer', true);
                this._updateClock();
            }
        }
    }.observes('exchange.date', 'exchange.stat'),

    _setMarketTime: function () {
        var marketTime = utils.formatters.getAdjustedDateTime(this.exchange.time, this.get('exchange.tzo'));
        this.set('mktTime', marketTime);
    }.observes('exchange.time'),

    exchangeArray: function () {
        var marketTime = utils.formatters.getAdjustedDateTime(this.exchange.time, this.get('exchange.tzo'));
        this.set('mktTime', marketTime);
    }.observes('exchanges.@each'),

    _updateClock: function () {
        var that = this;
        var sleepTime = this.topPanelSettings.timeInterval.OneSecondInMillis;

        Ember.run.once(this, this._updateUITime);

        setTimeout(function () {
            if (that.get('isEnabledTimer')) {
                that._updateClock();
            }
        }, sleepTime);
    },

    _updateUITime: function () {
        var time = this.get('mktTime');
        var dateTimeStr;

        if (utils.validators.isAvailable(time)) {
            time.setSeconds(time.getSeconds() + 1);
            this.set('mktTime', time);
            dateTimeStr = utils.formatters.convertToDisplayTimeFormat(time);
            this.set('marketTime', dateTimeStr);
        }
    },

    /* *
     * Change market status colour according to market status
     * Observes : exchange.stat
     */
    _updateMarketStatusColor: function () {
        var marketStatusCSS;
        var stat = this.get('exchange.stat');
        var marketStatusElement = Ember.$('#marketSummaryExchangeStatusContainer');

        if (stat === PriceConstants.MarketStatus.Close || stat === PriceConstants.MarketStatus.PreClose) {
            marketStatusCSS = this.topPanelSettings.styles.downColor;
            marketStatusElement.addClass('ms-top-bar-exchange-status-alert');
        } else {
            marketStatusCSS = this.topPanelSettings.styles.upColor;
            marketStatusElement.addClass('ms-top-bar-exchange-status-alert');
        }

        setTimeout(function () {
            marketStatusElement.removeClass('ms-top-bar-exchange-status-alert');
        }, 1000);

        this.set('marketStatusCSS', marketStatusCSS);
    }.observes('exchange.stat'),

    /* * Start of progress bar - time
     * Calculate market open, close bar percentage
     * @param hour market time hours (GMT hours + time zone offset) int
     * @param min market time minutes (GMT minutes) int
     */
    _calculateIndex: function (hour, min) {  // Args are int
        var openHour = this.get('openTimeHour'); // Market open hours
        var openMin = this.get('openTimeMin'); // Market open minutes
        var hourIndex = hour - openHour;
        var minIndex = min - openMin;

        if (hourIndex >= 0) {
            return hourIndex * 3600 + minIndex * 60;
        } else {
            return 0;
        }
    },

    _setInitialTimeIndices: function () {
        var exg = this.get('exchange');

        if (exg) {
            var openTime = exg.openTime;
            var closeTime = exg.closeTime;

            this.set('openExgTime', openTime);
            this.set('closeExgTime', closeTime);

            if (openTime && closeTime) {
                this.set('openTimeHour', parseInt(openTime.substr(0, 2), 10));
                this.set('openTimeMin', parseInt(openTime.substr(2, 2), 10));
                this.set('closeTimeIndex', this._calculateIndex(parseInt(closeTime.substr(0, 2), 10), parseInt(closeTime.substr(2, 2), 10)));

                var criticalMin = this.get('criticalTimeMin');
                this.set('criticalTimeIndex', this.get('closeTimeIndex') - criticalMin * 60);
            }
        }
    }.observes('exchange.tzo'),

    _updateProgressTime: (function () {
        var exg = this.get('exchange');

        if (exg && exg.time) {
            var currentTime = exg.time;
            var currentIndex = this._calculateIndex(parseInt(currentTime.substr(0, 2), 10) + exg.tzo, parseInt(currentTime.substr(2, 2), 10)) + parseInt(currentTime.substr(4, 2), 10);

            this.set('currentTimeIndex', currentIndex);

            if (exg.stat === PriceConstants.MarketStatus.Open && currentIndex >= 0) {
                this.set('isMarketOpen', true);
            } else if (exg.stat !== PriceConstants.MarketStatus.Open || currentIndex >= this.get('closeTimeIndex')) {
                this.set('isMarketOpen', false);
            }

            if (currentIndex >= this.get('criticalTimeIndex') && this.get('closeTimeIndex') >= currentIndex) {
                this.set('isCriticalTime', true);
            } else {
                this.set('isCriticalTime', false);
            }

            if (this.get('isMarketOpen')) {
                this._showProgressTimeBar();

                if (this.get('isCriticalTime')) {
                    var timeStamp = (this.get('closeTimeIndex') - currentIndex);
                    var timeStampInt = parseInt(timeStamp / 60, 10);
                    var space = utils.Constants.StringConst.Space;

                    if (!isNaN(timeStampInt)) {
                        this.set('showTime', true);

                        if (timeStampInt >= 2) {
                            this.set('showTimeText', [timeStampInt, this.get('app').lang.labels.minsLeft].join(space));
                        } else if (timeStampInt === 1 && timeStamp >= 60) {
                            this.set('showTimeText', [timeStampInt, this.get('app').lang.labels.minLeft].join(space));
                        } else {
                            this.set('showTimeText', [timeStampInt, this.get('app').lang.labels.secLeft].join(space));
                        }
                    }
                } else {
                    this.set('showTime', false);
                }
            } else {
                this.set('showTime', false);
            }
        }
    }).observes('exchange.time'),

    _showProgressTimeBar: function () {
        var bar;
        var style;
        var timeDiffInSecs = this.get('currentTimeIndex');
        var fullTimeDiffInSecs = this.get('closeTimeIndex');
        var prevUpdatedBar = this.get('prevUpdatedBar');

        if (fullTimeDiffInSecs) {
            var differenceInPercentage = (timeDiffInSecs / fullTimeDiffInSecs) * 100;
            differenceInPercentage = differenceInPercentage > 0 && differenceInPercentage <= 100 ? differenceInPercentage : 0;

            if (differenceInPercentage === 0 || Math.abs(differenceInPercentage - prevUpdatedBar) > 1) {
                this.set('prevUpdatedBar', differenceInPercentage);
                bar = 'width:' + differenceInPercentage + '%;';

                if (this.get('isCriticalTime')) {
                    style = 'progress-bar mkt-close-indicator';
                } else {
                    style = 'progress-bar';
                }

                this.set('bar', bar);
                this.set('progressStyle', style);
            }
        }
    },

    actions: {
        onPrepareData: function () {
            this._setInitialTimeIndices();
        },

        setExchange: function (exchg) {
            this.set('exchange', exchg);
            this.sendAction('onExchangeChanged', exchg);
        }
    }
});
