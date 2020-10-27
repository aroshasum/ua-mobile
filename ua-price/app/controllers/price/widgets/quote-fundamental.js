import Ember from 'ember';
import QuoteBase from '../../../controllers/price/widgets/quote-base';
import priceWidgetConfig from '../../../config/price-widget-config';

export default QuoteBase.extend({
    panelFields: Ember.A(),

    onPrepareData: function () {
        this._super();
        this.renderPanelFields();
    },

    onLanguageChanged: function () {
        this.renderPanelFields();
    },

    renderPanelFields: function () {
        var panelFields = this.get('panelFields');
        panelFields.clear();
        this._super(priceWidgetConfig.quote.panelFundamental, panelFields);
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});