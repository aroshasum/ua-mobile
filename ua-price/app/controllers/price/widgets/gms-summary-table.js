import Ember from 'ember';
import BaseArrayController from '../../base-array-controller';
import appConfig from '../../../config/app-config';
import appEvents from '../../../app-events';
import LanguageDataStore from '../../../models/shared/language/language-data-store';
import PriceConstants from '../../../models/price/price-constants';
import sharedService from '../../../models/shared/shared-service';
import UIEntity from '../../../models/shared/business-entities/entity-ui-wrapper';
import gmsTabPanel from '../../../components/gms-tab-panel';

/* TODO: [Uditha]
 1. Set the correct title for non mobile version
 2. Fix icon alignments
 3. Delete pending comments
 */
export default BaseArrayController.extend({
    indexArrowCssUp: 'glyphicon glyphicon-triangle-top up-fore-color',
    indexArrowCssDown: 'glyphicon glyphicon-triangle-bottom down-fore-color',
    assetType: null,
    gmsSymbolsByAssetType: Ember.A(),
    gmsSummary: Ember.A(),
    menuComponent: null,
    widgetTitle: '',

    app: LanguageDataStore.getLanguageObj(),
    isMobile: appConfig.customisation.isMobile,
    isTablet: appConfig.customisation.isTablet,
    priceService: sharedService.getService('price'),
    gmsDS: sharedService.getService('price').gmsDS,
    menuContent: {},
    isWidgetHeaderDisable: false,

    countryDetails: [
        {
            countryCodes: ['tr', 'sa', 'kw', 'ae', 'qa', 'eg', 'om', 'bh', 'jo'],
            langKey: 'middleEast'
        },

        {
            countryCodes: ['uk', 'de'],
            langKey: 'europe'
        },

        {
            countryCodes: ['lk', 'bd'],
            langKey: 'asia'
        },

        {
            countryCodes: ['us'],
            langKey: 'usa'
        },

        {
            countryCodes: ['ma', 'tn'],
            langKey: 'northAfrica'
        }
    ],

    onLoadWidget: function () {
        this.set('isWidgetHeaderDisable', this.isMobile || this.isTablet);
        this.set('menuContent', this.widgetContainer.menuContent);
    },

    onPrepareData: function () {
        this.loadContent();
    },

    onAddSubscription: function () {
        this.priceService.gmsDS.sendGmsRequest(sharedService.userSettings.currentLanguage);
    },

    onLanguageChanged: function () {
        var currentAssetType = this.get('assetType');
        var args = {assetType: currentAssetType};

        this.refreshWidget(args);
    },

    onGMSDataUpdated: function () {
        if (this.get('gmsDS.status') === this.utils.Constants.ReqStatus.Success) {
            this.loadContent();
        }
    }.observes('gmsDS.status'),

    loadContent: function () {
        var app = this.get('app');
        var assetType = this.get('assetType');
        var gmsItems = Ember.Object.create();

        if (this.isTablet) {
            this.set('gmsSymbolsByAssetType', Ember.A());
        } else {
            this.gmsSymbolsByAssetType.clear();
        }

        this.set('widgetTitle', app.lang.labels.gms);

        if (!this.utils.flagGenerator.getFlagGenerateStatus()) {
            this.utils.flagGenerator.generateFlagIconStyles();
        }

        if (assetType && assetType !== PriceConstants.GmsType.Summary) {
            gmsItems = this.createBindingCollection(assetType);

            if (!this.isMobile) {
                this.setFontStyle(gmsItems, assetType);
            }
        }

        switch (assetType) {
            case PriceConstants.GmsType.Commodities:
                gmsItems.set('title', app.lang.labels.commodities);
                this.setCommoditiesIcons(gmsItems);
                break;

            case PriceConstants.GmsType.Currencies:
                gmsItems.set('title', app.lang.labels.currencies);
                this.setCurrencyIcon(gmsItems);
                break;

            case PriceConstants.GmsType.Indices:
                gmsItems.set('title', app.lang.labels.indices);
                this.setCountryDetails(gmsItems);
                break;

            default:
                this.set('title', app.lang.labels.gms);

                if (!this.isTablet) {
                    // Add Indices summary symbols
                    gmsItems = this.createBindingCollection(PriceConstants.GmsType.Indices, true);
                    gmsItems.set('title', app.lang.labels.indices);
                    this.setCountryDetails(gmsItems);

                    // Add commodities summary symbols
                    gmsItems = this.createBindingCollection(PriceConstants.GmsType.Commodities, true);
                    gmsItems.set('title', app.lang.labels.commodities);
                    this.setCommoditiesIcons(gmsItems);

                    // Add currency summary symbols
                    gmsItems = this.createBindingCollection(PriceConstants.GmsType.Currencies, true);
                    gmsItems.set('title', app.lang.labels.currencies);
                    this.setCurrencyIcon(gmsItems);
                }
        }
    },

    createBindingCollection: function (assetType, isSummary) {
        var gmsUICollection = Ember.A();
        var storedCollection = this.priceService.gmsDS.getGmsCollectionByAssetType(assetType);
        var symbolsByAssetType = this.get('gmsSymbolsByAssetType');

        if (isSummary) {
            storedCollection = this.priceService.gmsDS.getSummaryCollectionByAssetType(assetType);
        }

        if (storedCollection && storedCollection.length > 0) {
            Ember.$.each(storedCollection, function (prop, gmsObj) {
                gmsUICollection.pushObject(UIEntity.create({entity: gmsObj}));
            });
        }

        symbolsByAssetType.pushObject(gmsUICollection);

        return gmsUICollection;
    },

    bindData: function () {
        Ember.run.once(this, this.sendDataRequests);
    }.observes('gmsSymbolsByAssetType.@each'),

    setCommoditiesIcons: function (gmsSymbols) {
        // TODO: [satheeqh] Need to move this to config level

        Ember.$.each(gmsSymbols, function (prop, gmsObj) {
            var symbolCode = gmsObj.entity.sym;
            var cssValue = 'font-xx-l comm-icon ';

            switch (symbolCode) {
                case 'EBROUSDBR.SP':
                    cssValue = cssValue + 'icon-brent-crude';
                    break;

                case 'EWTIUSDBR.SP':
                    cssValue = cssValue + 'icon-wti-crude';
                    break;

                case 'SXAUUSDOZ.SP':
                    cssValue = cssValue + 'icon-gold';
                    break;

                case 'SXAGUSDOZ.SP':
                    cssValue = cssValue + 'icon-silver';
                    break;

                case 'SXPTUSDOZ.SP':
                    cssValue = cssValue + 'icon-platinum';
                    break;

                case 'SXPDUSDOZ.SP':
                    cssValue = cssValue + 'icon-palladium';
                    break;
            }

            Ember.set(gmsObj, 'icon', cssValue);
        });
    },

    setCountryDetails: function (gmsSymbols) {
        var that = this;
        var countryHeader =  '';

        Ember.$.each(gmsSymbols, function (prop, gmsObj) {
            if (!countryHeader || countryHeader !== that.getTerritoryEntry(gmsObj.entity.cCode)) {
                gmsObj.isHeaderAvailable = that.isTablet;
                countryHeader = that.getTerritoryEntry(gmsObj.entity.cCode);
                gmsObj.countryHeader = countryHeader;
            }

            gmsObj.icon = 'class-' + gmsObj.entity.cCode;
            gmsObj.containerCss = 'pad-m-l';
        });
    },

    getTerritoryEntry: function (countryCode) {
        var that = this;
        var territoryEntry = '';
        var countryDetails = this.countryDetails;

        Ember.$.each(countryDetails, function (key, detailObj) {
            if (detailObj.countryCodes.indexOf(countryCode) > -1) {
                territoryEntry = that.get('app').lang.labels[detailObj.langKey];

                return false;
            }
        });

        return territoryEntry;
    },

    setCurrencyIcon: function (gmsSymbols) {
        Ember.$.each(gmsSymbols, function (prop, gmsObj) {
            gmsObj.icon = 'fa fa-money font-xxx-l';
        });
    },

    setFontStyle: function (gmsSymbls, assetType) {
        var summarySymbols = this.priceService.gmsDS.getSummaryCollectionByAssetType(assetType);

        Ember.$.each(gmsSymbls, function (prop, item) {
            item.set('css', 'symbol-fore-color');

            if (summarySymbols.indexOf(item.entity.sym) > -1) {
                item.set('css', 'highlight-fore-color');
            }
        });
    },

    sendDataRequests: function () {
        var gmsByAssetType = this.get('gmsSymbolsByAssetType');
        var that = this;

        Ember.$.each(gmsByAssetType, function (assetIndex, gms) {
            Ember.$.each(gms, function (prop, item) {
                var gmsObj = item.entity;
                that.priceService.addSymbolRequest(gmsObj.exg, gmsObj.sym, gmsObj.inst);
            });
        });
    },

    onUnloadWidget: function () {
        this.clearData();
    },

    clearData: function () {    // Since onClearData is called on single-click on table rows, clearData() is called instead of onClearData from onUnloadWidget
        var gmsByAssetType = this.get('gmsSymbolsByAssetType');
        var that = this;

        Ember.$.each(gmsByAssetType, function (assetIndex, gms) {
            Ember.$.each(gms, function (prop, item) {
                var gmsObj = item.entity;
                that.priceService.removeSymbolRequest(gmsObj.exg, gmsObj.sym, gmsObj.inst);
            });
        });

        this.set('assetType', null);
        this.set('menuComponent', null);
    },

    onAfterRender: function () {
        this.bindEvents();

        if (!this.isMobile) {
            Ember.$('.nano').nanoScroller();
        }
    },

    bindEvents: function () {
        this.clickEventHandler = this.onWidgetClick.bind(this);
        var widget = this.getWidgetTable();

        if (widget.addEventListener) { // For all major browsers, except IE 8 and earlier
            widget.addEventListener('mousedown', this.clickEventHandler);
        } else if (widget.attachEvent) { // For IE 8 and earlier versions
            widget.attachEvent('onclick', this.clickEventHandler);
            widget.attachEvent('onmousedown', this.clickEventHandler);
        }
    },

    getWidgetTable: function () {
        var widgetTable = Ember.$('#' + 'div-' + this.get('wkey'));

        if (widgetTable && widgetTable.length > 0) {
            widgetTable = widgetTable[0];
        }

        return widgetTable;
    },

    _generateFullContextMenu: function () {
        this.menuComponent = this.container.lookup('component:symbol-click-menu-popup');

        if (!this.menuComponent) { // Create a symbol-click-menu-popup component if object is already not
            this.menuComponent = this.container.lookupFactory('component:symbol-click-menu-popup').create();
        }

        if (this.menuComponent.fullContextMenu.length === 1) {
            if (appConfig.customisation.isTradingEnabled) {
                this.menuComponent.fullContextMenu.insertAt(0, this.menuComponent.tradeContextMenu);
            }
        }
    },

    onWidgetClick: function (event) {
        var gmsRow = Ember.$(event.target).parentsUntil(Ember.$('#gms-'));
        var gmsRowId = gmsRow.attr('id');

        if (gmsRowId) {
            var gmsIdArray = gmsRowId.split('-');
            var sym = gmsIdArray[1];
            var exg = gmsIdArray[2];
            var stock = this.priceService.stockDS.getStock(exg, sym);

            if (stock) {
                this.clickRow(stock, event);
            }
        }
    },

    clickRow: function (stock, event) {
        if (stock) {
            if (this.isMobile) {
                var titleBar = sharedService.getService('sharedUI').getService('titleBar');

                if (titleBar && titleBar.onSymbolSelected) {
                    titleBar.onSymbolSelected(true);
                }

                appEvents.onSymbolChanged(stock.sym, stock.exg, stock.inst, this.get('selectedLink'));
            } else {
                var selectedLink = this.get('selectedLink');
                this._generateFullContextMenu();
                this.menuComponent.initialize(this.get('wkey'), stock);

                if (stock && stock.sym) {
                    // Set symbol details on symbol-click-menu-popup
                    this.menuComponent.set('selectedSymbol', {sym: stock.sym, exg: stock.exg, inst: stock.inst});
                }

                if (selectedLink) {
                    if (event.button !== 2) {
                        appEvents.onSymbolChanged(stock.sym, stock.exg, stock.inst, selectedLink);
                    }
                }

                if (event && event.button === 2) {
                    var viewName = 'components/symbol-click-menu-popup';
                    var modal = sharedService.getService('sharedUI').getService('modalPopupId');

                    this.menuComponent.showPopup(this.menuComponent, viewName, modal); // Todo [Anushka] view popup to right click
                }
            }
        }
    },

    actions: {
        doubleClickRow: function (symbol) {
            if (!this.isMobile) {
                if (symbol) {
                    var sym = symbol.sym;
                    var exg = symbol.exg;
                    var inst = this.priceService.stockDS.getStock(exg, sym).inst;

                    sharedService.getService('priceUI').showPopupWidget({
                        container: this.container,
                        controllerString: 'view:symbol-popup-view'
                    }, {tabId: 0, sym: sym, exg: exg, inst: inst});
                }
            }
        },

        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});

Ember.Handlebars.helper('gms-tab-panel', gmsTabPanel);
