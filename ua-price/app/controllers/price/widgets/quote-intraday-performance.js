import Ember from 'ember';
import FiftyTwoWkHl from '../../../components/stk-specific-components/fifty-two-wk-hl';
import DaysRange from '../../../components/stk-specific-components/days-range';
import CashMap from '../../../components/stk-specific-components/cash-map';
import QuoteBase from '../../../controllers/price/widgets/quote-base';
import priceWidgetConfig from '../../../config/price-widget-config';

export default QuoteBase.extend({
    dimensions: {
        w: 4,
        h: 30
    },

    panelFields: Ember.A(),

    onPrepareData: function () {
        this._super();
        this.renderPanelFields();
    },

    onAfterRender: function () {
        this.generateScrollBar();
    },

    onLanguageChanged: function () {
        this.renderPanelFields();
    },

    renderPanelFields: function () {
        var panelFields = this.get('panelFields');
        panelFields.clear();
        this._super(priceWidgetConfig.quote.panelIntraday, panelFields);
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});

Ember.Handlebars.helper('fifty-two-wk-hl', FiftyTwoWkHl);
Ember.Handlebars.helper('days-range', DaysRange);
Ember.Handlebars.helper('cash-map', CashMap);
