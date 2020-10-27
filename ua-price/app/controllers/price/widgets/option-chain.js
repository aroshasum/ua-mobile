import Ember from 'ember';
import TableController from '../../shared/table-controller';
import ControllerFactory from '../../controller-factory';
import sharedService from '../../../models/shared/shared-service';
import priceWidgetConfig from '../../../config/price-widget-config';
import appEvents from '../../../app-events';
import appConfig from '../../../config/app-config';

// Cell Views
import ClassicHeaderCell from '../../../views/table/classic-header-cell';
import HeaderCell from '../../../views/table/dual-cells/header-cell';
import Cell from '../../../views/table/cell';
import ButtonCell from '../../../views/table/button-cell';
import ButtonMenuCell from '../../../views/table/button-menu-cell';
import ClassicCell from '../../../views/table/classic-cell';
import ClassicProgressCell from '../../../views/table/classic-progress-cell';
import ChangeCell from '../../../views/table/change-cell';
import UpDownCell from '../../../views/table/up-down-cell';
import DotCell from '../../../views/table/dual-cells/dot-cell';
import DualArrowCell from '../../../views/table/dual-cells/dual-arrow-cell';
import DualChangeCell from '../../../views/table/dual-cells/dual-change-cell';
import DualTextCell from '../../../views/table/dual-cells/dual-text-cell';
import DualCell from '../../../views/table/dual-cells/dual-cell';
import ProgressCell from '../../../views/table/dual-cells/progress-cell';
import TableRow from '../../../views/table/table-row';

export default TableController.extend({
    optPeriods: undefined,
    optPeriodArray: undefined,
    nearMonArray: undefined,
    currentOptPeriod: undefined,
    currentNearMon: undefined,
    defaultPeriod: undefined,
    enableQuoteSummary: true,
    priceService: sharedService.getService('price'),
    rowHeight: '',

    isLoading: false,
    quoteSummaryWidget: undefined,
    content: Ember.A(),
    oneWayContent: Ember.computed.oneWay('arrangedContent'),
    callColumns: ['cDisSym', 'cLtp', 'cChg', 'cBbp', 'cBap', 'cVol'],
    putColumns: ['pDisSym', 'pLtp', 'pChg', 'pBbp', 'pBap', 'pVol'],
    defaultColumnIds: priceWidgetConfig.optionChain.defaultColumnIds,

    onLoadWidget: function () {
        this.setInitialWidgetParams();
        this._loadWidgetSymbol();

        this.set('searchID', {popup: 'searchPopup' + this.get('wkey'), search: 'search' + this.get('wkey')});
        this.set('defaultColumnMapping', priceWidgetConfig.optionChain.defaultColumnMapping);
        this.set('rowHeight', priceWidgetConfig.singleRowHeight);

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();

        if (this.get('enableQuoteSummary')) {
            this._renderQuoteSummary();
        }

        this.setCellViewsScopeToGlobal();
    },

    setInitialWidgetParams: function () {
        var paramObj = priceWidgetConfig.optionChain.paramsObject;

        if (paramObj) {
            this.set('sym', paramObj.sym ? paramObj.sym : this.get('sym'));
            this.set('exg', paramObj.exg ? paramObj.exg : this.get('exg'));
        }
    },

    onPrepareData: function () {
        this._loadWidgetSymbol();
        this._setNearMoneyContent();

        this.set('optPeriods', this.priceService.optionPeriodDS.getOptionPeriodList(this.get('exg'), this.get('sym')));
        this.onBaseSymbolChanged();
        this.setErrorMessage();
    },

    onAddSubscription: function () {
        this._sendDataRequest({optPeriod: '', optListType: 0, nearMon: 0, optType: 2});
        this.priceService.addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    onRemoveSubscription: function () {
        this._removeSymbolSubscription(this.get('content'));
        this.priceService.removeSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    onClearData: function () {
        this.set('optPeriods', Ember.A());
        this.set('optPeriodArray', Ember.A());
        this.set('nearMonArray', Ember.A());
        this.set('content', Ember.A());
        this.set('currentOptPeriod', undefined);
        this.set('currentNearMon', undefined);
        this.set('defaultPeriod', undefined);

        var quoteSummaryWidget = this.get('quoteSummaryWidget');

        if (quoteSummaryWidget && Ember.$.isFunction(quoteSummaryWidget.onClearData)) {
            quoteSummaryWidget.onClearData();
        }
    },

    onUnloadWidget: function () {
        var quoteSummaryWidget = this.get('quoteSummaryWidget');

        if (quoteSummaryWidget && Ember.$.isFunction(quoteSummaryWidget.onUnloadWidget)) {
            quoteSummaryWidget.onUnloadWidget();
        }

        this.set('quoteSummaryWidget', undefined);
    },

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.ClassicHeaderCell = ClassicHeaderCell;
        Ember.Cell = Cell;
        Ember.ClassicCell = ClassicCell;
        Ember.ClassicProgressCell = ClassicProgressCell;
        Ember.ChangeCell = ChangeCell;
        Ember.UpDownCell = UpDownCell;
        Ember.ButtonCell = ButtonCell;
        Ember.ButtonMenuCell = ButtonMenuCell;
        Ember.DotCell = DotCell;
        Ember.DualArrowCell = DualArrowCell;
        Ember.DualChangeCell = DualChangeCell;
        Ember.DualTextCell = DualTextCell;
        Ember.DualCell = DualCell;
        Ember.ProgressCell = ProgressCell;
        Ember.TableRow = TableRow;
    },

    cellViewsForColumns: {
        button: 'Ember.ButtonCell',
        buttonMenu: 'Ember.ButtonMenuCell',
        classicProgressCell: 'Ember.ClassicProgressCell',
        classicCell: 'Ember.ClassicCell',
        changeCell: 'Ember.ChangeCell',
        upDown: 'Ember.UpDownCell',
        dual: 'Ember.DualCell',
        dualText: 'Ember.DualTextCell',
        dualChange: 'Ember.DualChangeCell',
        progress: 'Ember.ProgressCell',
        dot: 'Ember.DotCell',
        dualArrow: 'Ember.DualArrowCell'
    },

    onBaseSymbolChanged: function () {
        var quoteSummaryWidget = this.get('quoteSummaryWidget');

        if (quoteSummaryWidget) {
            quoteSummaryWidget.onWidgetKeysChange({sym: this.get('sym'), exg: this.get('exg'), inst: this.get('inst')});
        }
    },

    onLanguageChanged: function () {
        this.set('columnDeclarations', []);
        this.set('lan', sharedService.userSettings.currentLanguage.toLowerCase());

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();

        this._setTimeLocale();
        this._loadOptionPeriods();
        this._setNearMoneyContent();
        this.setErrorMessage();

        this.toggleProperty('isRefreshed');
    },

    _setTimeLocale: function () {
        if (this.get('lan') === 'ar') {
            this.utils.moment.locale('ar-sa'); // set this instance to use Saudi Arabic
        } else {
            this.utils.moment.locale('en');
        }
    },

    _renderQuoteSummary: function () {
        var controllerString = 'controller:price/widgets/quote-summery';
        var routeString = 'price/widgets/quote-summery';
        var route = this.container.lookup('route:application');
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.set('sym', this.get('sym'));
        widgetController.set('exg', this.get('exg'));
        widgetController.set('inst', this.get('inst'));
        widgetController.set('isShowTitle', false);
        widgetController.set('wkey', 'option-chain' + this.get('wkey'));
        widgetController.set('addBorder', '');

        widgetController.initializeWidget({wn: controllerString});

        route.render(routeString, {
            into: 'price/widgets/option-chain',
            outlet: 'quoteSummary',
            controller: widgetController
        });

        this.set('quoteSummaryWidget', widgetController);
    },

    _sendDataRequest: function (params) {
        var that = this;
        var stockArr = this.priceService.optionStockDS.getOptionStockList(this.get('exg'), this.get('sym'), params.optPeriod);

        this.setRequestTimeout(4, 'content.length');

        if (stockArr.length > 0) {
            this.set('isLoading', true);
            that._onDataReceived(params.optPeriod);
        } else {
            this.priceService.sendOptionChainRequest({
                    sym: this.get('sym'),
                    exg: this.get('exg'),
                    inst: 0,
                    optPeriod: params.optPeriod,
                    optListType: params.optListType,
                    nearMon: params.nearMon,
                    optType: params.optType
                },
                function (defaultPeriod) {
                    if (!that.get('defaultPeriod')) {
                        that.set('defaultPeriod', defaultPeriod);
                    }

                    that._onDataReceived(that.get('defaultPeriod'));
                });

            this.set('isLoading', true);
        }
    },

    onCheckDataAvailability: function () {
        return this.get('content').length !== 0;
    },

    getNearMoneyStocks: function (stockArr) {
        return stockArr.filterBy('nearMon', '1');
    },

    _onDataReceived: function (defaultPeriod) {
        var stockArr = this.priceService.optionStockDS.getOptionStockList(this.get('exg'), this.get('sym'), defaultPeriod);
        var prevStocks = this.get('content');

        if (this.get('nearMoney')) {
            stockArr = this.getNearMoneyStocks(stockArr);
        }

        this.set('content', stockArr);
        this.set('isDataAvailable', true);
        this.set('isLoading', false);

        if (stockArr && stockArr.length > 0 && !appConfig.customisation.isMobile) {
            var stock = stockArr[0];
            appEvents.onSymbolChanged(stock.cStock.sym, stock.cStock.exg, stock.cStock.inst, this.get('selectedLink'));
        }

        this._updateSubscription(prevStocks, stockArr);
    },

    _updateSubscription: function (prevStockList, newStockList) {
        this._removeSymbolSubscription(prevStockList);
        this._addSymbolSubscription(newStockList);
    },

    _addSymbolSubscription: function (newStockList) {
        var that = this;
        var reqData = this._generateSymbolList(newStockList);

        if (reqData.symArray.length > 0) {
            // this.priceService.addSymbolListRequest(reqData.exg, reqData.symArray, this.utils.AssetTypes.Option);

            Ember.$.each(reqData.symArray, function (key, val) {
                that.priceService.addSymbolRequest(reqData.exg, val, that.utils.AssetTypes.Option);
            });
        }
    },

    _removeSymbolSubscription: function (prevStockList) {
        var that = this;
        var reqData = this._generateSymbolList(prevStockList);

        if (reqData.symArray.length > 0) {
            // this.priceService.removeSymbolListRequest(reqData.exg, reqData.symArray, this.utils.AssetTypes.Option);

            Ember.$.each(reqData.symArray, function (key, val) {
                that.priceService.removeSymbolRequest(reqData.exg, val, that.utils.AssetTypes.Option);
            });
        }
    },

    _generateSymbolList: function (stockList) {
        var exchange = '';
        var symbolArray = [];

        if (stockList) {
            Ember.$.each(stockList, function (key, val) {
                exchange = val.optExg;
                symbolArray[symbolArray.length] = val.get('cSym');
                symbolArray[symbolArray.length] = val.get('pSym');
            });
        }

        return {
            exg: exchange,
            symArray: symbolArray
        };
    },

    _setOptionPeriods: function () {
        Ember.run.once(this, this._loadOptionPeriods);
    }.observes('optPeriods.@each'),

    _loadOptionPeriods: function () {
        var format;
        var periodString;
        var that = this;
        var optPeriodList = [];
        var optPeriodArr = this.get('optPeriods').sortBy('optPrd');

        Ember.$.each(optPeriodArr, function (key, val) {
            if (val && val.optPrd) {
                if (val.optPrd.length === 8) {
                    periodString = val.optPrd;
                    format = 'DD MMM YYYY';
                } else if (val.optPrd.length === 6) {
                    periodString = val.optPrd + '01';
                    format = 'MMM YYYY';
                }

                optPeriodList[optPeriodList.length] = {
                    code: val.optPrd,
                    desc: that.utils.moment(that.utils.formatters.convertStringToDate(periodString)).format(format)
                };
            }
        });

        this.set('optPeriodArray', Ember.A(optPeriodList));

        if (optPeriodArr && optPeriodArr.length > 0) {
            this.set('currentOptPeriod', this.get('optPeriodArray')[0]);
        }
    },

    _setNearMoneyContent: function () {
        var allOpt = {code: 0, desc: this.get('app').lang.labels.all};
        var nearMoneyOpt = {code: 1, desc: this.get('app').lang.labels.nearMoney};

        this.set('nearMonArray', Ember.A([allOpt, nearMoneyOpt]));
        this.set('currentNearMon', this.get('nearMonArray')[1]);
        this.set('nearMoney', true);
    },

    _setOptionPeriod: function (periodOption) {
        // Check periodOption.code is date string or not (Date string has 8 characters)
        var optType = periodOption.code.length === 8 ? 1 : 0;

        this.set('defaultPeriod', periodOption.code);
        this._sendDataRequest({optPeriod: periodOption.code, optListType: 1, nearMon: 0, optType: optType});
    },

    _loadWidgetSymbol: function () {
        var insType = this.get('inst');

        if (insType === this.utils.AssetTypes.Option) {
            var optionStock = this.priceService.optionStockDS.getOptionStock(this.get('exg'), this.get('sym'));

            if (optionStock) {
                this.set('exg', optionStock.get('trdExg'));
                this.set('sym', optionStock.get('baseSym'));
                this.set('inst', optionStock.get('inst'));
            }
        }

        this.saveWidget({sym: this.get('sym'), exg: this.get('exg'), inst: this.get('inst')});
    },

    _clickRow: function (selectedRow, event) {
        var selectedLink = this.get('selectedLink');
        var selectedStock = this._getSelectedStock(selectedRow, event);

        if (selectedStock) {
            if (event && event.button === this.utils.Constants.MouseButtons.RightClick) {
                var rightClickComponent = 'component:symbol-click-menu-popup';
                this.menuComponent = this.container.lookup(rightClickComponent);

                if (!this.menuComponent) { // Create a symbol-click-menu-popup component object and call base-context-menu
                    this.menuComponent = this.container.lookupFactory(rightClickComponent).create({associatedController: this});
                } else {
                    this.menuComponent.associatedController = this;
                }

                var viewName = 'components/symbol-click-menu-popup';
                var modal = sharedService.getService('sharedUI').getService('modalPopupId');

                this.menuComponent.initialize(this.get('wkey'), selectedStock);

                if (appConfig.customisation.isTradingEnabled) {
                    this.menuComponent.fullContextMenu.insertAt(0, this.menuComponent.tradeContextMenu);
                }

                this.menuComponent.showPopup(this.menuComponent, viewName, modal);
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.rowRightClick, ['sym:', selectedStock.sym].join(''));
            } else {
                appEvents.onSymbolChanged(selectedStock.sym, selectedStock.exg, selectedStock.inst, selectedLink);
            }
        }
    },

    _openPopupWidget: function (selectedRow, event) {
        var selectedStock = this._getSelectedStock(selectedRow, event);

        // Close menu
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');
        modal.send('closeModalPopup');

        if (selectedStock) {
            sharedService.getService('priceUI').showPopupWidget({
                container: this.container,
                controllerString: 'view:symbol-popup-view'
            }, {tabId: 0, sym: selectedStock.sym, exg: selectedStock.exg, inst: selectedStock.inst});

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.rowDoubleClick, ['sym:', selectedStock.sym, '~', 'inst:', selectedStock.inst].join(''));
        }
    },

    _getSelectedStock: function (selectedRow, event) {
        var stock;
        var target = event.target ? event.target : event.srcElement;

        if (target && target.attributes) {
            var rowData;
            var targetCell = target.attributes.getNamedItem('cell-id');
            var cellId = targetCell && targetCell.value ? targetCell.value : '';

            if (this.callColumns.indexOf(cellId) > -1) { // In case target is the top most element (closest() is not working for IE)
                rowData = selectedRow.getProperties('cSym', 'cExg', 'cInst');
                stock = {sym: rowData.cSym, exg: rowData.cExg, inst: rowData.cInst};
            } else if (this.putColumns.indexOf(cellId) > -1) {
                rowData = selectedRow.getProperties('pSym', 'pExg', 'pInst');
                stock = {sym: rowData.pSym, exg: rowData.pExg, inst: rowData.pInst};
            } else {
                if (Ember.$(target).parents('[cell-id=cDisSym], [cell-id=cLtp], [cell-id=cChg], [cell-id=cBbp], [cell-id=cBap], [cell-id=cVol]').length > 0) {
                    rowData = selectedRow.getProperties('cSym', 'cExg', 'cInst');
                    stock = {sym: rowData.cSym, exg: rowData.cExg, inst: rowData.cInst};
                } else if (Ember.$(target).parents('[cell-id=pDisSym], [cell-id=pLtp], [cell-id=pChg], [cell-id=pBbp], [cell-id=pBap], [cell-id=pVol]').length > 0) {
                    rowData = selectedRow.getProperties('pSym', 'pExg', 'pInst');
                    stock = {sym: rowData.pSym, exg: rowData.pExg, inst: rowData.pInst};
                }
            }
        }

        return stock;
    },

    actions: {
        setOptionPeriod: function (periodOption) {
            this._setOptionPeriod(periodOption);
        },

        setNearMoney: function (nearMonOption) {
            var optionPeriod = this.get('defaultPeriod') ? this.get('defaultPeriod') : '';

            this.set('nearMoney', nearMonOption.code === 1);
            this._sendDataRequest({optPeriod: optionPeriod, optListType: 0, nearMon: nearMonOption.code});
        },

        clickRow: function (selectedRow, event) {
            this._clickRow(selectedRow, event);
        },

        doubleClickRow: function (selectedRow, event) {
            this._openPopupWidget(selectedRow, event);
        },

        setLink: function (option) {
            this.setWidgetLink(option);
        },

        changeSymbol: function (item) {
            this.set('exg', item.exg);
            this.set('sym', item.sym);
            this.set('inst', !isNaN(item.inst) ? parseInt(item.inst, 10) : undefined);

            this._loadWidgetSymbol();
            this.onWidgetKeysChange({sym: this.get('sym'), exg: this.get('exg'), inst: this.get('inst')});
        },

        fullScreenToggle: function () {
            this.toggleFullScreen('option-chain-' + this.get('wkey'), this.get('wkey'));
            this.toggleProperty('isRefreshed');

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['isFullScreenWL:', this.get('isFullScreenWL')].join(''));
        }
    }
});
