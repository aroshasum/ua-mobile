import Ember from 'ember';
import sharedService from '../../../../../../models/shared/shared-service';
import formatters from '../../../../../../utils/formatters';
import responsiveHandler from '../../../../../../helpers/responsive-handler';
import appEvents from '../../../../../../app-events';
import BaseComponent from '../../../../../../components/base-component';

export default BaseComponent.extend({
    layoutName: 'price/widgets/mobile/market-summary/components/market-status-panel',
    priceService: sharedService.getService('price'),

    exchange: '',
    marketTime: '',
    isEnabledTimer: false,
    colorCss: 'down-fore-color',
    wkey: 'market-status-panel-mobile',

    onLoad: function () {
        this.set('selectedLink', this.get('selectedLink') ? this.get('selectedLink') : 1);
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        this._setExchange();
    }.on('init'),

    _setExchange: function () {
        var userExg = sharedService.userState.globalArgs.exg;
        var isDefaultExg = sharedService.getService('price').userDS.isPriceUserExchange(userExg);

        userExg = isDefaultExg ? userExg : sharedService.userSettings.price.userDefaultExg;

        this.priceService.addExchangeRequest(userExg);
        this.set('exchange', this.priceService.exchangeDS.getExchange(userExg));
    },

    onClear: function () {
        this.priceService.removeExchangeRequest(this.get('exchange.exg'));
    }.on('willDestroyElement'),

    isMoreMarketAvailable: function () {
        return this.priceService.userDS.get('isMultipleUserExchangesAvailable');
    }.property('priceService.userDS.isMultipleUserExchangesAvailable'),

    isSubMarketAvailable: function () {
        var exgCode = this.get('exchange.exg');

        return this.get('isShowSubMarketDropdown') && exgCode && this.priceService.exchangeDS.isSubMarketAvailable(exgCode);
    }.property('exchange'),

    updateMarketTime: function () {
        if (this.exchange.get('stat') === 3) {
            var dateTimeStr = formatters.formatToDate(this.exchange.date, this.exchange.get('tzo'));
            this.set('isEnabledTimer', false);
            this.set('marketTime', dateTimeStr);
            // this.set('colorCss', 'down-fore-color'); // this css will update from 'updateMarketStatusColorCss' method below
        } else {
            this.set('isEnabledTimer', true);
        }
    }.observes('exchange.date', 'exchange.stat'),

    updateMarketStatusColorCss: function () {
        var stat = this.exchange.get('stat');

        if (stat === 2 || stat === 1) {
            this.set('colorCss', 'up-fore-color');
        } else if (stat === 3 || stat === 4) {
            this.set('colorCss', 'down-fore-color');
        }
    }.observes('exchange.stat'),

    setMarketTime: function () {
        if (this.get('isEnabledTimer') && this.get('exchange')) {
            var adjustedTime = formatters.getAdjustedDateTime(this.get('exchange').time, this.exchange.get('tzo'));
            this.set('marketTime', formatters.convertToDisplayTimeFormat(adjustedTime));
            // this.set('colorCss', 'up-fore-color'); // this css will update from 'updateMarketStatusColorCss' method below
        }
    }.observes('exchange.time'),

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        if (responsiveArgs.responsiveLevel >= 1) {
            controller.set('lblClass', 'wdgttl-drp-dwn-btn-width font-x-l');
        } else {
            controller.set('lblClass', 'font-x-l');
        }
    },

    onResize: function () {
        var that = this;

        if (that.responsive) {
            var resHandler = that.responsive;

            // Call onResize when values are changed
            Ember.run.debounce(resHandler, 'onResize', 1);
        }
    },

    initializeResponsive: function () {
        var that = this;

        Ember.run.next(function () {
            that.set('responsive', responsiveHandler.create({
                controller: that,
                widgetId: 'market-status-panel',
                callback: that.onResponsive
            }));

            that.responsive.addList('subMarket-free', [
                {id: 'subMarketDropdown', width: 5, responsiveMarginRatio: 2}
            ]);

            that.responsive.initialize();
        });
    }.on('didInsertElement'),

    actions: {
        setWlExchange: function (exchg) {
            this.priceService.exchangeDS.getExchangeMetadata(exchg.code, true);
            appEvents.onExchangeChanged(this.get('selectedLink'), exchg.code);

            this.onClear();
            this._setExchange();
        },

        subMarketChange: function (mktId) {
            appEvents.onSubMarketChanged(this.get('selectedLink'), mktId);
            this.onResize();
        }
    }
});