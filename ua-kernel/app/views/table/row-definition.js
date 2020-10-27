import Ember from 'ember';
import RowDefinition from 'ember-table/controllers/row';
import priceConstants from '../../models/price/price-constants';

export default RowDefinition.extend({
    isOddRow: Ember.computed(function () {
        if (this.get('parentController.isOddEvenRowStyleDisabled')) {
            return true;
        }

        var rowId = this.get('parentController').rowIndex(this);
        return rowId && (rowId % 2 !== 0);
    }).property('parentController.bodyContent.length'),

    isSymSuspended: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isSymSuspendedEnabled &&
        (this.get('content.dataObj.symStat') === priceConstants.SymbolStatus.Suspended || this.get('content.dataObj.symStat') === priceConstants.SymbolStatus.Halted) : false;
    }).property('content.dataObj.symStat'),

    symStatus: Ember.computed(function () {
        return this.get('content.dataObj.symStat');
    }).property('content.dataObj.symStat'),

    isEmptyRow: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isEmptyRowEnabled && this.get('content.dataObj.isEmpty') : false;
    }).property('content.dataObj.isEmpty'),

    isTodaysHigh: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isTodaysHighEnabled && this.get('content.dataObj.isTodayHigh') : false;
    }).property('content.dataObj.is52WeekHigh'),

    isTodaysLow: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isTodaysLowEnabled && this.get('content.dataObj.isTodayLow') : false;
    }).property('content.dataObj.is52WeekLow'),

    is52WeekHigh: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isFiftyTwoHEnabled && this.get('content.dataObj.is52WeekHigh') : false;
    }).property('content.dataObj.is52WeekHigh'),

    is52WeekLow: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isFiftyTwoLEnabled && this.get('content.dataObj.is52WeekLow') : false;
    }).property('content.dataObj.is52WeekLow'),

    isSelected: Ember.computed(function () {
        return this.get('parentController.indicatorConfig') ? this.get('parentController.indicatorConfig').isSelectedEnabled && this.get('content.dataObj.isSelected') : false;
    }).property('content.dataObj.isSelected')
});
