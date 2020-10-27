import TableCell from 'ember-table/views/table-cell';

export default TableCell.extend({
    templateName: 'table/views/flag-cell',

    firstValueStyle: (function () {
        return this.get('row.content.flagCss');
    }).property('row.content.flagCss')
});

