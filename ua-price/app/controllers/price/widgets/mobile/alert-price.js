import Ember from 'ember';
import AlertPrice from '../alert-price';
import priceWidgetConfig from '../../../../config/price-widget-config';

// Cell Views
import AlertSymbolCellMobile from '../../../../views/table/mobile/alert/alert-symbol-cell';
import AlertCriteriaCellMobile from '../../../../views/table/mobile/alert/alert-criteria-cell';
import AlertStatusCellMobile from '../../../../views/table/mobile/alert/alert-status-cell';
import ContextMenuMobile from '../../../../views/table/mobile/context-menu-cell';

export default AlertPrice.extend({
    contextPath: 'price/widgets/mobile/alert-context-panel',
    defaultColumnIds: priceWidgetConfig.alertHistory.defaultColumnIds,

    onLoadWidget: function () {
        this.setCellViewsScopeToGlobal();
        this.set('defaultColumnMapping', priceWidgetConfig.alertHistory.defaultColumnMapping);
        this.set('parameters', this.getDataForDropdown(priceWidgetConfig.alert.parameters));
        this.set('criteria', this.getDataForDropdown(priceWidgetConfig.alert.criteria));
        this.set('title', this.get('app').lang.labels.alerts);
        this.set('valueDecimalPlaces', this.get('settings').noOfDefaultDecimalsForValues);

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();

        if (this.get('isChildView')) {
            this.set('searchPopupTop', this.get('searchPopupHeights').childViewEnabledTop);
            this.set('tableHeight', 'alert-child-view-height');
        } else {
            this.set('searchPopupTop', this.get('searchPopupHeights').childViewDisabledTop);
            this.set('tableHeight', 'alert-container-height');
        }
    },

    setCellViewsScopeToGlobal: function () {
        this._super();
        Ember.AlertSymbolCellMobile = AlertSymbolCellMobile;
        Ember.AlertCriteriaCellMobile = AlertCriteriaCellMobile;
        Ember.AlertStatusCellMobile = AlertStatusCellMobile;
        Ember.ContextMenuMobile = ContextMenuMobile;
    },

    cellViewsForColumns: {
        alertSymbolMobile: 'Ember.AlertSymbolCellMobile',
        alertCriteriaMobile: 'Ember.AlertCriteriaCellMobile',
        alertStatusMobile: 'Ember.AlertStatusCellMobile',
        contextMenuMobile: 'Ember.ContextMenuMobile'
    },

    actions: {
        clickRow: function (selectedRow) {
            var target = event.target ? event.target : event.srcElement;
            var rowData = selectedRow.getProperties('exg', 'sym', 'inst', 'isEditEnabled');

            if (target) {
                var cellId = target.attributes && target.attributes.getNamedItem('cell-id') && target.attributes.getNamedItem('cell-id').value ?
                    target.attributes.getNamedItem('cell-id').value : '';
                var targetArray = Ember.$(target).parents('[cell-id=contextMenu]');
                var targetButtonArray = Ember.$(target).parents('[cell-id=menuPanel]');
                var width;

                if (rowData) {
                    this.set('rowData', rowData);
                }

                if (cellId === 'menuPanel' || (targetButtonArray && targetButtonArray.length > 0)) {
                    return;
                }

                if (targetArray.length > 0) {
                    target = targetArray[0];
                }

                if (target.style.width === '100%') {
                    target.style.removeProperty('width');
                    this.set('isContextPanel', false);
                } else {
                    width = '100%';
                    this.set('isContextPanel', true);

                    if (this.get('previousRow')) {
                        this.get('previousRow').style.removeProperty('width');
                    }
                }

                this.set('previousRow', target);
                target.style.width = width;
            }
        }
    }
});