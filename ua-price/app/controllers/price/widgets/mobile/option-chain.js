import Ember from 'ember';
import appEvents from '../../../../app-events';
import OptionChain from '../option-chain';
import priceWidgetConfig from '../../../../config/price-widget-config';

export default OptionChain.extend({
    oneWayContent: Ember.computed.oneWay('arrangedContent'),
    nearMoney: false,
    currentIndex: 0,
    enableQuoteSummary: false,
    rowHeight: '',

    onLoadWidget: function () {
        this._super();
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
        this.set('rowHeight', priceWidgetConfig.singleRowHeight);
    },

    onPrepareData: function () {
        this._super();
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym')));
    },

    setNearMoney: function () {
        var nearMoney = 1;
        var allOption = 0;
        var nearMonOption = this.get('nearMoney') ? nearMoney : allOption;
        var optionPeriod = this.get('defaultPeriod') ? this.get('defaultPeriod') : '';

        this._sendDataRequest({optPeriod: optionPeriod, optListType: 0, nearMon: nearMonOption});
    }.observes('nearMoney'),

    updatePercentageChangeCss: function () {
        var stock = this.get('stock');

        this.set('colorCSS', stock.pctChg > 0 ? 'up-fore-color' : stock.pctChg === 0 ? 'fore-color' : 'down-fore-color');
        this.set('ltpIconCSS', stock.pctChg > 0 ? 'glyphicon-triangle-top' : stock.pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
        this.set('backColorCSS', stock.pctChg > 0 ? 'up-back-color' : stock.pctChg === 0 ? 'toolbar-color' : 'down-back-color');
        this.set('fontColorCSS', stock.pctChg > 0 ? 'btn-txt-color' : stock.pctChg === 0 ? 'fore-color' : 'btn-txt-color');
    }.observes('stock', 'stock.pctChg'),

    onUnloadWidget: function () {
        this._super();
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    onLanguageChanged: function () {
        this._super();
        this.onLoadWidget();
        this.refreshTableComponent();
    },

    actions: {
        setOptionPeriod: function (periodOption) {
            var that = this;
            var optPeriodArray = this.get('optPeriodArray');

            Ember.$.each(optPeriodArray, function (key, value) {
                if (periodOption.code === value.code) {
                    that.set('currentIndex', key);
                }
            });

            this._setOptionPeriod(periodOption);
        },

        nextMonth: function (isForward) {
            var currentOptPeriodIndex = this.get('currentIndex');
            var optPeriodArray = this.get('optPeriodArray');

            var newOptPeriodCode = isForward ? ++currentOptPeriodIndex : --currentOptPeriodIndex;

            if (optPeriodArray && newOptPeriodCode > -1 && newOptPeriodCode < optPeriodArray.length) {
                this.set('currentIndex', newOptPeriodCode);
                this.set('currentOpt', optPeriodArray[newOptPeriodCode].code);

                this._setOptionPeriod(optPeriodArray[newOptPeriodCode]);
            }
        }
    }
});
