import TableCell from 'ember-table/views/table-cell';
import styleMixin from './table-mixins/style-mixin';

export default TableCell.extend(styleMixin, {
    templateName: 'table/views/tree-cell',

    title: (function () {
        return this.get('column.title');
    }).property(),

    firstValue: function () {
        return this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
    }.property('cellContent'),

    firstValueStyle: (function () {
        return this.get('row') ? this.get('row.firstValueStyle') : '';
    }).property('cellContent'),

    secondValue: function () {
        return this.get('cellContent') ? this.get('cellContent').secondValue : undefined;
    }.property('cellContent'),

    rowValues: (function () {
        return this.get('row');
    }).property('cellContent'),

    columnId: function () {
        return this.get('column.contentPath');
    }.property(),

    isExpandButton: function () {
        return this.get('columnId') === 'isExpanded';
    }.property('cellContent'),

    isRoot: function () {
        return this.get('row') ? this.get('row.isRoot') : false;
    }.property('cellContent'),

    isShrunk: function () {
        return this.get('row') ? this.get('row.isShrunk') : false;
    }.property('cellContent')
});

