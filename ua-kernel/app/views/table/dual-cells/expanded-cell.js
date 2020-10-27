import Ember from 'ember';
import DualCell from './dual-cell';
import ExpandedColumnMixin from '../table-mixins/expanded-column-mixin';
import sharedService from '../../../models/shared/shared-service';
import appConfig from '../../../config/app-config';

export default DualCell.extend(ExpandedColumnMixin, {
    templateName: 'table/views/expanded-cell',
    isTablet: appConfig.customisation.isTablet,
    isMobile: appConfig.customisation.isMobile,

    formattedThirdValue: Ember.computed(function () {
        return this.addFormat(this.get('cellContent') ? this.get('cellContent').thirdValue : undefined, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('cellContent'),

    styleThirdValue: Ember.computed(function () {
        return this.get('column.thirdValueStyle') ? this.get('column.thirdValueStyle') : '';
    }).property('formattedThirdValue')
});