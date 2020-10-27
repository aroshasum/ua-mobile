import Ember from 'ember';
import DualCell from '../dual-cells/dual-cell';
import languageDataStore from '../../../models/shared/language/language-data-store';
import priceConstants from '../../../models/price/price-constants';

export default DualCell.extend({
    templateName: 'table/views/alert/alert-status-cell',
    app: languageDataStore.getLanguageObj(),

    formattedFirstValue: Ember.computed(function () {
        var status = this.get('row') ? this.get('row.status') : undefined;

        if (status) {
            var lanStore = this.get('app').lang.labels;
            status = lanStore[status] ? lanStore[status] : status;
        }

        return status;
    }).property('row.status'),

    styleFirstValue: Ember.computed(function () {
        var backColor = 'down-back-color';
        var status = this.get('row') ? this.get('row.status') : undefined;
        var statusConstants = priceConstants.AlertStatus;

        switch (status) {
            case statusConstants.Active:
                backColor = 'highlight-back-color-1';
                break;

            case statusConstants.Triggered:
                backColor = 'up-back-color';
                break;
        }

        return backColor;
    }).property('row.status')
});