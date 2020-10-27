import ClassicCell from '../table/classic-cell';

export default ClassicCell.extend({
    templateName: 'table/views/fs-color-cell',

    colorCode: function () {
        return this.get('row.colorCode');
    }.property('cellContent')
});