import Ember from 'ember';
import DualCell from '../dual-cells/dual-cell';
import priceWidgetConfig from '../../../config/price-widget-config';
import languageDataStore from '../../../models/shared/language/language-data-store';
import utils from '../../../utils/utils';
import sharedService from '../../../models/shared/shared-service';

export default DualCell.extend({
    templateName: 'table/views/alert/alert-criteria-cell',
    app: languageDataStore.getLanguageObj(),

    firstValue: Ember.computed(function () {
        var param = this.get('row') ? this.get('row.param') : undefined;

        if (param) {
            var lanStore = this.get('app').lang.labels;
            param = lanStore[param] ? lanStore[param] : param;
        }

        return param;
    }).property('row.param'),

    secondValue: Ember.computed(function () {
        return utils.formatters.formatNumber(this.get('row') ? this.get('row.val') : undefined, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('row.val'),

    thirdValue: Ember.computed(function () {
        return this.get('row') ? this.get('row.crit') : undefined;
    }).property('row.crit'),

    fourthValue: Ember.computed(function () {
        var critText = this.get('thirdValue');
        var that = this;

        Ember.$.each(priceWidgetConfig.alert.criteria, function (key, crit) {
            if (crit.value === critText) {
                var lanStore = that.get('app').lang.labels;
                critText = lanStore[crit.lanKey] ? lanStore[crit.lanKey] : crit.lanKey;

                return false;
            }
        });

        return critText;
    }).property('thirdValue'),

    styleFirstValue: Ember.computed(function () {
        return this.get('column.firstValueStyle') ? this.get('column.firstValueStyle') : '';
    }).property('firstValue')
});