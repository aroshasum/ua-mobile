import Ember from 'ember';
import FiftyTwoWkHl from '../../../components/stk-specific-components/fifty-two-wk-hl';
import DaysRange from '../../../components/stk-specific-components/days-range';
import CashMap from '../../../components/stk-specific-components/cash-map';
import QuoteBase from '../../../controllers/price/widgets/quote-base';
import priceWidgetConfig from '../../../config/price-widget-config';

export default QuoteBase.extend({
    panelFields: Ember.A(),
    isShowTitle: true,
    daysRangeId: '',
    daysRangeValues: '',
    fiftyTowWkId: '',
    fiftyTowWkValues: '',
    cashMapId: '',
    cashMapValues: '',

    onLoadWidget: function () {
        var isShowTitle = this.get('hideTitle') ? !this.get('hideTitle') : true;

        this._super();
        this.set('isShowTitle', isShowTitle);
        this.set('isShowTitle', this.get('showTitle') || true);

        this.set('daysRangeId', ['daysRangeComp', this.get('wkey')].join('-'));
        this.set('fiftyTowWkId', ['fiftyTowWkComp', this.get('wkey')].join('-'));
        this.set('cashMapId', ['cashMapComp', this.get('wkey')].join('-'));
    },

    onPrepareData: function () {
        this._super();
        this.set('panelFields', Ember.A());
        this.renderPanelFields();
    },

    onLanguageChanged: function () {
        this.set('panelFields', Ember.A());
        this.renderPanelFields();
    },

    renderPanelFields: function () {
        this._super(priceWidgetConfig.quote.panelIntraday, this.get('panelFields'));
    },

    onAfterRender: function () {
        this._super();
        this.set('daysRangeValues', Ember.View.views[this.get('daysRangeId')]);
        this.set('fiftyTowWkValues', Ember.View.views[this.get('fiftyTowWkId')]);
        this.set('cashMapValues', Ember.View.views[this.get('cashMapId')]);
    },

    onClearData: function () {
        this._super();

        var panelFields = this.get('panelFields');

        Ember.$.each(panelFields, function (key, panelField) {
            if(!panelField.isDestroyed) {
                panelField.destroy();
            }
        });
    }
});

Ember.Handlebars.helper('fifty-two-wk-hl', FiftyTwoWkHl);
Ember.Handlebars.helper('days-range', DaysRange);
Ember.Handlebars.helper('cash-map', CashMap);
