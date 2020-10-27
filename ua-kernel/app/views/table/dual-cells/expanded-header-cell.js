import HeaderCell from './header-cell';
import ExpandedColumnMixin from '../table-mixins/expanded-column-mixin';

export default HeaderCell.extend(ExpandedColumnMixin, {
    templateName: 'table/views/expanded-header-cell',

    thirdValue: function () {
        return this.get('content.headerCellThirdName');
    }.property('content.headerCellThirdName'),

    isExpandedHeader: function () {
        return this.get('isExpandedView') && this.get('secondValue');
    }.property('isExpandedView'),

    secondHeaderStyle: function () {
        return this.get('content.secondHeaderStyle');
    }.property('content.secondHeaderStyle'),

    firstHeaderStyle: function () {
        return this.get('content') ? this.get('content').firstHeaderStyle : undefined;
    }.property('content.firstHeaderStyle'),

    thirdHeaderStyle: function () {
        return this.get('content') ? this.get('content').thirdHeaderStyle : undefined;
    }.property('content.thirdHeaderStyle')
});