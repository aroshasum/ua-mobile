import Ember from 'ember';
import ExpandedCell from './expanded-cell';
import utils from '../../../utils/utils';
import symbolIndicatorHelper from '../symbol-indicator-helper';
import languageDataStore from '../../../models/shared/language/language-data-store';
import priceWidgetConfig from '../../../config/price-widget-config';
import appConfig from '../../../config/app-config';
import sharedService from '../../../models/shared/shared-service';

export default ExpandedCell.extend({
    templateName: 'table/views/expanded-symbol-cell',
    app: languageDataStore.getLanguageObj(),
    thirdCell: undefined,
    fourthCell: undefined,

    defineDisplayCells: function () {
        var thirdCell, fourthCell;
        var displayProperties = appConfig.customisation.displayProperties;
        var cellCollection = displayProperties && displayProperties.watchList ? displayProperties.watchList.expandedFirstCell : undefined;

        if (cellCollection && cellCollection.length > 1) {
            thirdCell = cellCollection[0];
            fourthCell = cellCollection[1];

            this.set('thirdCell', thirdCell.key);
            this.set('fourthCell', fourthCell.key);
        }

        // Set Language label
        this.set('thirdCellLabel', thirdCell ? this.get('app.lang.labels.' + thirdCell.langKey) : this.get('app.lang.labels.open'));
        this.set('fourthCellLabel', fourthCell ? this.get('app.lang.labels.' + fourthCell.langKey) : this.get('app.lang.labels.high'));

        var thirdCellValue = thirdCell ? ['row.' + thirdCell.key] : ['cellContent'];
        var fourthCellValue = fourthCell ? ['row.' + fourthCell.key] : ['row.high'];

        Ember.defineProperty(this, 'formattedThirdValue', Ember.computed.apply(this, thirdCellValue.concat(this._getFormattedThirdValue)));
        Ember.defineProperty(this, 'formattedFourthValue', Ember.computed.apply(this, fourthCellValue.concat(this._getFormattedFourthValue)));
    }.on('init'),

    _getFormattedThirdValue: function () {
        var thirdCell = this.get('thirdCell');
        var cellValue = thirdCell ? this.get('row.' + thirdCell) : this.get('cellContent.thirdValue');

        return utils.formatters.formatNumber(cellValue, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    },

    _getFormattedFourthValue: function () {
        var fourthCell = this.get('fourthCell');
        var cellValue = fourthCell ? this.get('row.' + fourthCell) : this.get('row.high');

        return utils.formatters.formatNumber(cellValue, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    },

    formattedFifthValue: Ember.computed(function () {
        var displayValue = this.get('formattedFirstValue');
        var dispConfig = appConfig.customisation.displayProperties;
        var dispProp1 = dispConfig && dispConfig.dispProp1 ? dispConfig.dispProp1 : '';

        if (dispProp1) {
            displayValue = this.get('row.dispProp1');
        }

        return displayValue;
    }).property('row.sDes'),

    styleFourthValue: Ember.computed(function () {
        return this.get('column.fourthValueStyle') ? this.get('column.fourthValueStyle') : '';
    }).property('formattedFourthValue'),

    // indicator properties
    isndicatorAvailable: function () {
        return this.get('column.isndicatorAvailable');
    }.property('cellContent'),

    isShariaSymbol: function () {
        return this.get('row.isShariaSymbol');
    }.property('row.isShariaSymbol'),

    dcfsValue: function () {
        return this.get('row') ? this.get('row.dcfs') : undefined;
    }.property('row.dcfs'),

    is52WeekHigh: function () {
        return this.get('row') ? this.get('row.is52WeekHigh') : false;
    }.property('row.is52WeekHigh'),

    is52WeekLow: function () {
        return this.get('row') ? this.get('row.is52WeekLow') : false;
    }.property('row.is52WeekLow'),

    isTodayHigh: function () {
        return this.get('row') ? this.get('row.isTodayHigh') : false;
    }.property('row.isTodayHigh'),

    isTodayLow: function () {
        return this.get('row') ? this.get('row.isTodayLow') : false;
    }.property('row.isTodayLow'),

    isStlmt: function () {
        return this.get('row') ? this.get('row.stlmt') : false;
    }.property('row.stlmt'),

    dcfsStyle: (function () {
        var dcfsObj = symbolIndicatorHelper.formatDcfsValueStyle(this.get('dcfsValue'));
        this.set('dcfsToolTip', this.get('app').lang.labels[dcfsObj.dcfsToolTip]);

        return dcfsObj.dcfsClass;
    }).property('dcfsValue'),

    isAnnAvailable: function () {
        var rowProperties = this.getProperties('row');
        var row = rowProperties ? rowProperties.row : '';
        var isAnnAvailable = false;

        if (row) {
            isAnnAvailable = row.get('ann');
            this.set('annToolTip', this.get('app').lang.labels.annAvailable);
        }

        return isAnnAvailable;
    }.property('cellContent'),

    isSymSuspended: function () {
        return this.get('row.isSymSuspended');
    }.property('row.isSymSuspended'),

    setDisplaySymbol: function () {
        this.set('isDisplayConfigTwo', priceWidgetConfig.watchList.symbolCellLayout === 2);
    }.on('init')
});