import Ember from 'ember';
import ExpandedCell from './expanded-cell';
import utils from '../../../utils/utils';
import languageDataStore from '../../../models/shared/language/language-data-store';
import appConfig from '../../../config/app-config';
import sharedService from '../../../models/shared/shared-service';

export default ExpandedCell.extend({
    templateName: 'table/views/expanded-ltp-cell',
    app: languageDataStore.getLanguageObj(),
    thirdCell: undefined,

    defineFormattedThirdValue: function () {
        var displayProperty = appConfig.customisation.displayProperties;
        var thirdCell = displayProperty && displayProperty.watchList ? displayProperty.watchList.expandedSecondCell : undefined;
        var cellCollection = thirdCell ? ['row.' + thirdCell.key] : ['row.low'];
        var argsArray = cellCollection.concat(this._getFormattedThirdValue);

        if (thirdCell) {
            this.set('thirdCell', thirdCell.key);
        }

        this.set('thirdCellLabel', thirdCell ? this.get('app.lang.labels.' + thirdCell.langKey) : this.get('app.lang.labels.low'));
        Ember.defineProperty(this, 'formattedThirdValue', Ember.computed.apply(this, argsArray));
    }.on('init'),

    _getFormattedThirdValue: function () {
        var thirdCell = this.get('thirdCell');
        var cellValue = thirdCell ? this.get('row.' + thirdCell) : this.get('row.low');

        return utils.formatters.formatNumber(cellValue, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }
});