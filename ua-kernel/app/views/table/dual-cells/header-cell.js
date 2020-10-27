import HeaderCell from 'ember-table/views/header-cell';
import appConfig from '../../../config/app-config';

export default HeaderCell.extend({
    templateName: 'table/views/header-cell',

    firstValue: function () {
        return this.get('content.headerCellName');
    }.property('content.headerCellName'),

    headerTitleValue: function () {
        if (this.get('column.headerTitleName')) {
            return this.get('column.headerTitleName');
        } else {
            return this.get('column.headerCellName');
        }
    }.property('column.headerTitleName', 'column.headerCellName'),

    secondValue: function () {
        return this.get('content.headerCellSecondName');
    }.property('content.headerCellSecondName'),

    styles: (function () {
        return this.get('column.headerStyles') ? this.get('column.headerStyles') : '';
    }).property('cellContent'),

    conditionalStyles: (function () {
        return this.get('content').isSortSupported && this.get('content').isSorted ? 'sort-back-color' : '';        //  Access controller parameters from view
    }).property('cellContent', 'content.isSorted'),

    // Overwriting base methods to stop initializing below features in mobile.
    didInsertElement: function () {
        if (!appConfig.customisation.isMobile) {
            this._super();
        }
    },

    elementSizeDidChange: function () {
        if (!appConfig.customisation.isMobile) {
            this._super();
        }
    },

    recomputeResizableHandle: function () {
        if (!appConfig.customisation.isMobile) {
            this._super();
        }
    }
});