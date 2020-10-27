import HeaderCell from './dual-cells/expanded-header-cell';
import ExpandedColumnMixin from './table-mixins/expanded-column-mixin';

export default HeaderCell.extend(ExpandedColumnMixin, {
    templateName: 'table/views/more-header-cell',

    headerNames: function () {
        return this.get('controller').headerNames;
    }.property('controller.headerNames'),

    isExpandedHeader: function () {
        return this.get('isExpandedView') && this.get('secondValue');
    }.property('isExpandedView'),

    disableExpand: function () {
        return this.get('controller').disableExpand;
    }.property('controller.disableExpand')
});