import ClassicCell from '../table/classic-cell';

export default ClassicCell.extend({
    templateName: 'table/views/technical-score-color-cell',

    changeColor: (function () {
        if (this.get('row.content')) {
            return this.get('row.content.signal') === 'B' ? 'up-fore-color' : 'down-fore-color';
        } else {
            return 'widget-back-color';
        }
    }).property('cellContent')
});