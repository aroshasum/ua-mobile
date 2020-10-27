import DualCell from './dual-cells/dual-cell';

export default DualCell.extend({
    templateName: 'table/views/financial-title-cell',

    isLevelIncreased: (function () {
       return this.get('row.content') ? this.get('row.content.indent') === '1' : false;
    }).property('cellContent')
});
