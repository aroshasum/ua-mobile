import DualCell from './dual-cell';
import languageDataStore from '../../../models/shared/language/language-data-store';
import symbolIndicatorHelper from '../symbol-indicator-helper';
import priceConstants from '../../../models/price/price-constants';

export default DualCell.extend({
    templateName: 'table/views/dual_text-cell',
    app: languageDataStore.getLanguageObj(),

    dcfsToolTip: null,

    isndicatorAvailable: function () {
        return this.get('column.isndicatorAvailable');
    }.property('cellContent'),

    dcfsValue: function () {
        return this.get('row.dataObj.dcfs');
    }.property('row.dataObj.dcfs'),

    is52WeekHigh: function () {
        return this.get('row.dataObj.is52WeekHigh');
    }.property('row.dataObj.is52WeekHigh'),

    is52WeekLow: function () {
        return this.get('row.dataObj.is52WeekLow');
    }.property('row.dataObj.is52WeekLow'),

    isTodayHigh: function () {
        return this.get('row.dataObj.isTodayHigh');
    }.property('row.dataObj.isTodayHigh'),

    isTodayLow: function () {
        return this.get('row.dataObj.isTodayLow');
    }.property('row.dataObj.isTodayLow'),

    isStlmt: function () {
        return this.get('row.dataObj.stlmt');
    }.property('row.dataObj.stlmt'),

    isShariaSymbol: function () {
        return this.get('row.dataObj.isShariaSymbol');
    }.property('row.dataObj.isShariaSymbol'),

    dcfsStyle: (function () {
        var dcfsObj = symbolIndicatorHelper.formatDcfsValueStyle(this.get('dcfsValue'));
        this.set('dcfsToolTip', this.get('app').lang.labels[dcfsObj.dcfsToolTip]);

        return dcfsObj.dcfsClass;
    }).property('dcfsValue'),

    isAnnAvailable: function () {
        var rowProperties = this.getProperties('row');
        var row = rowProperties ? rowProperties.row : '';

        return row ? row.get('dataObj.ann') : false;
    }.property('row.dataObj.ann'),

    isSymSuspended: function () {
        return this.get('row.dataObj.isSymSuspended');
    }.property('row.dataObj.isSymSuspended'),

    symTitle: function () {
        var symTitle = '';
        var symbolStatus = this.get('row.dataObj.symStat');

        switch (symbolStatus) {
            case priceConstants.SymbolStatus.Suspended:
                symTitle = this.get('app').lang.labels.symSuspended;
                break;

            case priceConstants.SymbolStatus.Halted:
                symTitle = this.get('app').lang.labels.symHalted;
                break;
        }

        return symTitle;
    }.property('row.dataObj.symStat')
});
