import TableCell from 'ember-table/views/table-cell';
import blinkMixin from './table-mixins/blink-mixin';
import conditionMixin from './table-mixins/condition-mixin';
import formatterMixin from './table-mixins/formatter-mixin';
import styleMixin from './table-mixins/style-mixin';

export default TableCell.extend(blinkMixin, conditionMixin, formatterMixin, styleMixin, {
    templateName: 'table/views/cell-cell',

    columnId: function () {
        return this.get('column.contentPath');
    }.property()
});
