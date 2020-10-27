import TableCell from 'ember-table/views/table-cell';
import languageDataStore from '../../models/shared/language/language-data-store';

export default TableCell.extend({
    templateName: 'table/views/button-cell',

    initializeCell: function () {
        this.set('app', languageDataStore.getLanguageObj());
    }.on('didInsertElement'),

    iconClass: (function () {
        return this.get('column.iconClass');
    }).property(),

    rowValues: (function () {
        return this.getProperties('row') ? this.getProperties('row').row : undefined;
    }).property('cellContent'),

    title: (function () {
        return this.get('column.title');
    }).property(),

    firstValueStyle: (function () {
        var row = this.getProperties('row') && this.getProperties('row').row ? this.getProperties('row').row : '';

        return row && row.get('firstValueStyle') ? row.get('firstValueStyle') : '';
    }).property('cellContent'),

    styleFirstValue: (function () {
        return this.get('column.firstValueStyle') ? this.get('column.firstValueStyle') : '';
    }).property('cellContent'),

    displayStyle: (function () {
        var status = this.get('cellContent') ? this.get('cellContent').firstValue : undefined;

        return status === false ? 'disable-style' : '';
    }).property('cellContent.firstValue'),

    buttonStyle: (function () {
        return this.get('column.buttonStyle');
    }).property()
});

