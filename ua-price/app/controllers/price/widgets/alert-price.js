import Ember from 'ember';
import TableController from '../../shared/table-controller';
import sharedService from '../../../models/shared/shared-service';
import priceWidgetConfig from '../../../config/price-widget-config';
import appConfig from '../../../config/app-config';
import appEvents from '../../../app-events';

// Cell Views
import HeaderCell from '../../../views/table/dual-cells/header-cell';
import ExpandedHeaderCell from '../../../views/table/dual-cells/expanded-header-cell';
import AlertSymbolCell from '../../../views/table/alert/alert-symbol-cell';
import AlertCriteriaCell from '../../../views/table/alert/alert-criteria-cell';
import AlertStatusCell from '../../../views/table/alert/alert-status-cell';
import AlertMenuCell from '../../../views/table/alert/alert-menu-cell';
import TableRow from '../../../views/table/table-row';

export default TableController.extend({
    title: 'alerts',
    alertArray: Ember.A(),
    content: Ember.A(),
    alertInfo: {},

    // Alert Place Properties
    searchKey: '',
    parameters: null,
    selectedParameter: null,
    criteria: null,
    selectedCriteria: null,
    currentToken: '',
    value: null,
    stock: {},
    isEditAlert: false,
    valueDecimalPlaces: '',
    searchPopupTop: '',
    tableHeight: '',

    wkey: 'alert-price',

    priceService: sharedService.getService('price'),
    defaultColumnIds: priceWidgetConfig.alertHistory.defaultColumnIds,

    isTablet: appConfig.customisation.isTablet,

    settings: {
        noOfDefaultDecimalsForValues: 2,   // No of Decimals allowed from server for alert
        noOfDecimalsForIntValue: 0
    },

    searchPopupHeights: {
        childViewEnabledTop: '95px',
        childViewDisabledTop: '55px'
    },

    onLoadWidget: function () {
        this.setCellViewsScopeToGlobal();
        this.set('defaultColumnMapping', priceWidgetConfig.alertHistory.defaultColumnMapping);
        this.set('parameters', this.getDataForDropdown(priceWidgetConfig.alert.parameters));
        this.set('criteria', this.getDataForDropdown(priceWidgetConfig.alert.criteria));
        this.set('title', this.get('app').lang.labels.alerts);
        this.set('valueDecimalPlaces', this.get('settings').noOfDefaultDecimalsForValues);

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();

        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onPrepareData: function () {
        this.setErrorMessage();
        this.priceService.sendAlertHistoryRequest();
        this.setRequestTimeout(4, 'content.length');

        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym')));
        this.toggleAlertEditProperties();
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    onCheckDataAvailability: function () {
        return this.get('content').length !== 0;
    },

    onResizeWidget: function () {
        this.toggleProperty('isRefreshed');
    },

    defaultCriteria: function () {
        var defCriteria = '';
        var defCriteriaIndex = 0;

        if (this.get('criteria')) {
            defCriteria = this.get('criteria')[defCriteriaIndex];
            this.set('selectedCriteria', defCriteria.value);
        }

        return defCriteria;
    }.property(),

    getDataForDropdown: function (data) {
        var lanStore = this.get('app').lang.labels;

        return Ember.$.map(data, function (val) {
            val.caption = lanStore[val.lanKey] || val.lanKey;

            return val;
        });
    },

    isAddAlertDisabled: function () {
        return !this.get('stock') || !Ember.$.isNumeric(this.get('value'));
    }.property('stock', 'value'),

    alertValuePlaceHolder: function () {
        return this.get('app').lang.labels.value + ' ';
    }.property('app.lang.labels.value'),

    defaultParameter: function () {
        var defParameter = '';
        var defParameterIdx = 0;

        if (this.get('parameters')) {
            defParameter = this.get('parameters')[defParameterIdx];

            this.set('currentParameter', defParameter);
            this.set('selectedParameter', defParameter.value);
        }

        return defParameter;
    }.property(),

    // Rearrange all alerts as selected symbol alerts on top and others sorted by symbol code
    refineAlertArray: function () {
        var stock = this.get('stock');
        var alertArray = this.priceService.alertDS.getAllAlerts();
        var sortedArray = alertArray.sortBy('sym');
        var selectedSymbolsArray = [];
        var otherSymbolsArray = [];

        Ember.$.each(sortedArray, function (id, alertItem) {
            if (stock.sym === alertItem.sym) {
                selectedSymbolsArray[selectedSymbolsArray.length] = alertItem;
            } else {
                otherSymbolsArray[otherSymbolsArray.length] = alertItem;
            }
        });

        var refinedArray = selectedSymbolsArray.concat(otherSymbolsArray);

        this.set('alertArray', Ember.A(refinedArray));
        this.loadContent();
    }.observes('stock', 'priceService.alertDS.alertToggle'),

    loadContent: function () {
        var alertList = this.get('alertArray');
        this.set('content', alertList);
    },

    onClearData: function () {
        this.set('content', Ember.A());
        this.set('alertArray', Ember.A());
    },

    onLanguageChanged: function () {
        this.set('columnDeclarations', []);
        this.onLoadWidget();
        this.refreshTableComponent();
        this.toggleAlertEditProperties();
    },

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.ExpandedHeaderCell = ExpandedHeaderCell;
        Ember.AlertSymbolCell = AlertSymbolCell;
        Ember.AlertCriteriaCell = AlertCriteriaCell;
        Ember.AlertStatusCell = AlertStatusCell;
        Ember.AlertMenuCell = AlertMenuCell;
        Ember.TableRow = TableRow;
    },

    cellViewsForColumns: {
        alertSymbol: 'Ember.AlertSymbolCell',
        alertCriteria: 'Ember.AlertCriteriaCell',
        alertStatus: 'Ember.AlertStatusCell',
        alertContextMenu: 'Ember.AlertMenuCell'
    },

    _getAlertFilter: function () {
        var currentParameter = this.get('currentParameter');
        var selectedCriteria = this.get('selectedCriteria');
        var singleConditionValue = 0;

        var value = this.get('value');
        var valueSeparator = '#';
        var paramSeparator = '$';

        return singleConditionValue + paramSeparator + currentParameter.field + valueSeparator + selectedCriteria + valueSeparator + value;
    },

    setSymbolKey: function () {
        var stock = this.get('stock');
        this.set('searchKey', stock.get('dispProp1') ? stock.get('dispProp1') : stock.sym);

        if (this.get('alertSymbolSearch')) {
            this.get('alertSymbolSearch').send('closeModalPopup');
        }
    }.observes('stock'),

    setUpdateAlertParameters: function (rowValueContent) {
        var paramIndex = 0;
        var parameterConfig = priceWidgetConfig.alert.parameters;

        this.set('selectedCriteria', rowValueContent.crit);
        this.set('value', rowValueContent.val);
        this.set('currentToken', rowValueContent.token);

        Ember.$.each(parameterConfig, function (index, parameter) {
            if (parameter.lanKey === rowValueContent.param) {
                paramIndex = index;

                return false;
            }
        });

        this.set('selectedParameter', parameterConfig[paramIndex].value);
        this.set('currentParameter', parameterConfig[paramIndex]);
        this.set('stock', this.priceService.stockDS.getStock(rowValueContent.exg, rowValueContent.sym, rowValueContent.inst));

    },

    toggleAlertEditProperties: function () {
        var alertButtonText = this.get('app').lang.labels.addAlert;

        if (this.get('isEditAlert')) {
            alertButtonText = this.get('app').lang.labels.save;
        } else {
            this.set('currentToken', '');
        }

        this.set('alertButtonText', alertButtonText);
    }.observes('isEditAlert'),

    onSearchKeyChange: function () {
        if (!this.get('searchKey')) {
            this.set('isEditAlert', false);

            if (this.get('alertSymbolSearch')) {
                this.get('alertSymbolSearch').send('closeModalPopup');
            }
        } else if (this.get('alertSymbolSearch')) {
            this.get('alertSymbolSearch').send('showModalPopup');
        }
    }.observes('searchKey'),

    actions: {
        setParameter: function (option) {
            this.set('selectedParameter', option.value);
            this.set('currentParameter', option);

            this.set('valueDecimalPlaces', option.isDecimalAllowed ? this.get('settings').noOfDefaultDecimalsForValues : this.get('settings').noOfDecimalsForIntValue);
            this.set('value', null);
        },

        setCriteria: function (option) {
            this.set('selectedCriteria', option.value);
        },

        showSearchPopup: function () {
            var modal = this.get('alertSymbolSearch');
            modal.send('showModalPopup');
        },

        closeSearchPopup: function () {
            var modal = this.get('alertSymbolSearch');
            modal.send('closeModalPopup');
        },

        onSymbolSelected: function (stock) {
            this.set('stock', stock);
            this.set('searchKey', stock.get('dispProp1') ? stock.get('dispProp1') : stock.sym);
            this.set('isEditAlert', false);
        },

        setLink: function (option) {
            this.setWidgetLink(option);
        },

        addAlert: function () {
            var stock = this.get('stock');

            if (stock && stock.sym) {
                this.priceService.sendAlertPlaceRequest(stock.exg, stock.sym, stock.inst, this._getAlertFilter(), this.get('currentToken'), this.get('isEditAlert'));
            }

            this.set('value', null);
            this.set('isEditAlert', false);
        },

        updateAlert: function (isEdit, rowValues) {
            var rowValueContent = rowValues && rowValues.get('content') ? rowValues.get('content') : '';
            var isDelete = !isEdit;

            if (rowValueContent) {
                if (isEdit && rowValueContent.get('isEditEnabled')) {
                    this.set('isEditAlert', true);
                    this.setUpdateAlertParameters(rowValueContent);
                } else if (isDelete) {
                    this.priceService.sendAlertUnsubscribeRequest(rowValueContent.exg, rowValueContent.sym, rowValueContent.inst, rowValueContent.token);
                }

                if (this.get('previousRow') && (rowValueContent.get('isEditEnabled') || isDelete)) {
                    this.get('previousRow').style.removeProperty('width');
                    this.set('isContextPanel', false);
                }
            }
        }
    }
});