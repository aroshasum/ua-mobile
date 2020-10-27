import Ember from 'ember';
import DualChangeCell from './dual-change-cell';
import ExpandedColumnMixin from '../table-mixins/expanded-column-mixin';
import sharedService from '../../../models/shared/shared-service';
import appConfig from '../../../config/app-config';

export default DualChangeCell.extend(ExpandedColumnMixin, {
    templateName: 'table/views/expanded-chg-cell',
    isColumnResizeEnabled: false,
    isTablet: appConfig.customisation.isTablet,
    isMobile: appConfig.customisation.isMobile,

    isIndexView: function () {
        return this.get('controller').isIndexView;
    }.property('controller.isIndexView'),

    styleFirstValue: Ember.computed(function () {
        var upStyle = 'up-back-color watch-list-border-radius watch-list-value-width dark-bg-fore-color';
        var downStyle = 'down-back-color watch-list-border-radius watch-list-value-width dark-bg-fore-color';
        var zeroStyle = 'no-changed-back-color watch-list-border-radius watch-list-value-width fore-color';

        if (this.get('isIndexView')) {
            upStyle = 'up-fore-color bold';
            downStyle = 'down-fore-color bold';
            zeroStyle = 'fade-fore-color bold';
        }

        return this.getPositiveNegativeStyle(this.get('firstValue'), upStyle, downStyle, zeroStyle);
    }).property('firstValue'),

    formattedThirdValue: Ember.computed(function () {
        return this.addFormat(this.get('cellContent') ? this.get('cellContent').thirdValue : undefined, false, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('cellContent'),

    formattedFirstValue: Ember.computed(function () {
        return this.addPercentageFormat(this.get('cellContent') ? this.get('cellContent').firstValue : undefined);
    }).property('cellContent'),

    formattedSecondValue: Ember.computed(function () {
        return this.addFormat(this.get('cellContent') ? this.get('cellContent').secondValue : undefined, true, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('cellContent')
});