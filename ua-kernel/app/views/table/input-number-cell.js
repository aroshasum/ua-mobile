import Ember from 'ember';
import TableCell from 'ember-table/views/table-cell';

export default TableCell.extend({
    templateName: 'table/views/input-number-cell',
    currentValue: 0,

    updateArrayItem: function () {
        var rowData = this.get('row');

        if (rowData && rowData.content) {
            this.set('currentValue', rowData.content.ordValue);
        }
    }.observes('row', 'row.content.ordValue'),

    updateInputValue: function () {
        Ember.set(this.get('row'), 'content.ordValue', this.get('currentValue'));
    }.observes('currentValue')
});