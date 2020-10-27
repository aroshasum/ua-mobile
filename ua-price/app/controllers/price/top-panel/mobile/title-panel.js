import Ember from 'ember';
import BaseWidgetContainer from '../../../base-widget-container';
import sharedService from '../../../../models/shared/shared-service';
import appConfig from '../../../../config/app-config';
import GlobalSearch from '../../../../components/mobile/global-search';

export default BaseWidgetContainer.extend({
    containerKey: 'titleBar',
    layouts: {},
    isMainNavShown: false,
    activeTabName: 'market',
    activeMainId: 0,
    activeTabId: '',
    activeTabCss: '',

    titlePanelContainerCss: '',
    inputContainerCss: '',
    defaultLink: '1',
    isSearchEnable: false,
    searchKey: '',
    isBackEnable: false,
    isArabic: sharedService.userSettings.currentLanguage === 'AR',

    sharedUIService: sharedService.getService('sharedUI'),

    options: {
        dragLockToAxis: true,
        dragBlockHorizontal: true
    },

    languageChanged: function () {
        this.set('activeTabName', this.get('app').lang.labels[this.get('activeTabKey')]);
        this.set('isArabic', sharedService.userSettings.currentLanguage === 'AR');
    },

    setActiveTabName: function (activeTab, activeMainId) {
        var activeTabName = activeTab.titleSubKey && !activeMainId ? activeTab.titleSubKey : activeTab.titleKey;
        var tabName = this.get('app').lang.labels[activeTabName];

        this.set('activeTabName', tabName);
        this.set('activeTabKey', activeTabName);

        if (tabName) {
            var minimumLabelLength = 13;
            this.set('activeTabCss', tabName.length < minimumLabelLength ? 'font-x-l' : '');
        }

        if (activeMainId) {
            this.set('activeMainId', activeMainId);
        }

        if (activeTab && activeTab.title) {
            this.set('activeTabId', activeTab.title);
        }

        if (this.sharedUIService.getService('leftPanel')) {
            this.sharedUIService.getService('leftPanel').hideMainMenu();
        }
    },

    onAfterRender: function () {
        this.set('inputContainerCss', 'hide-container pos-abs');
        this.set('titlePanelSearchArea', Ember.$('#titlePanelSearchArea'));
    },

    onSymbolSelected: function (isForceLoadMenu) {
        var watchListMenuId = appConfig.widgetId.watchListMenuId;
        var portfolioMenuId = appConfig.widgetId.portfolioMenuId;
        var quoteMenuId = appConfig.widgetId ? appConfig.widgetId.quoteMenuId : '';

        if (quoteMenuId && (isForceLoadMenu || (this.get('activeMainId') === watchListMenuId || this.get('activeMainId') === portfolioMenuId))) {
            this._navigateOnSymbolChange(watchListMenuId, quoteMenuId);
        }
    },

    renderAppTitleTemplate: function (templateName, comp) {
        var route = this.container.lookup('route:application');
        route.render(templateName, {
            into: 'price/top-panel/mobile/title-panel',
            outlet: 'titlePanelGLOutlet',
            controller: comp
        });
    },

    showSearchPopup: function () {
        var modal = this.get('topBarSymbolSearch');
        modal.send('showModalPopup');
    },

    closeSearchPopup: function () {
        var modal = this.get('topBarSymbolSearch');

        if (modal) {
            modal.send('closeModalPopup');
        }

        this.set('searchKey', '');
    },

    toggleDisplay: function (isCloseSearch, enableAddToWatchList, currentWatchListId, currentController) {
        var hideStyle = 'hide-container pos-abs';
        var fullWidth = 'full-width';

        this.set('isEnableAddToWatchList', enableAddToWatchList);
        this.set('currentWatchListId', currentWatchListId);
        this.set('invokeController', currentController);
        this.set('isEnableAddToPortfolio', currentController && currentController.isEnableAddToPortfolio);
        this.set('isEnableCompareSymbol', currentController && currentController.isEnableCompareSymbol);
        this.set('isEnableMarginSymbol', currentController && currentController.isEnableMarginSymbol);

        if (isCloseSearch || this.get('titlePanelContainerCss') === hideStyle) {
            this.set('titlePanelContainerCss', fullWidth);
            this.set('inputContainerCss', hideStyle);
            this.set('isSearchEnable', false);
            this.closeSearchPopup();
        } else {
            this.set('titlePanelContainerCss', hideStyle);
            this.set('inputContainerCss', fullWidth);
            this.set('isSearchEnable', true);

            this.get('titlePanelSearchArea').find('#titlePanelSeach')[0].focus();
            this.showSearchPopup();
            this.set('searchKey', '');
        }
    },

    loadMenuByConfig: function (menuId, isAddedToLastMenuStack) {
        var menuContent = this.get('appLayout').layout.mainPanel.content[menuId - 1];
        this.sharedUIService.getService('mainPanel').onRenderMenuItems(menuContent, undefined, undefined, !isAddedToLastMenuStack);
    },

    _navigateOnSymbolChange: function (menuId, tabId) {
        if (appConfig.customisation.isCompactMenuEnabled) {
            sharedService.getService('sharedUI').navigateMenu(menuId, tabId);
        } else {
            sharedService.getService('sharedUI').navigateMenu(tabId);
        }
    },

    actions: {
        toggleMainMenuView: function () {
            this.sharedUIService.getService('leftPanel').toggleMainMenuView();
        },

        showSearchPopup: function () {
            this.get('topBarSymbolSearch').send('showModalPopup');
        },

        closeSearchPopup: function () {
            this.closeSearchPopup();
        },

        toggleDisplay: function (isCloseSearch, enableAddToWatchList) {
            this.toggleDisplay(isCloseSearch, enableAddToWatchList);
        },

        widgetBackAction: function () {
            this.sharedUIService.getService('mainPanel').loadLastMenuFromStack();
            sharedService.getService('priceUI').resetLastMenuStack();    // Remove this if full stack is required.
        },

        onSearchSymbolSelected: function (stock) {
            var myFavoriteCustomWL = 0;
            var watchListId = this.get('currentWatchListId') ? this.get('currentWatchListId') : myFavoriteCustomWL;
            var quoteMenuId = appConfig.widgetId ? appConfig.widgetId.quoteMenuId : '';
            var watchListMenuId = appConfig.widgetId.watchListMenuId;
            var activeMenuId = this.get('activeMainId');
            var isCompactMenuEnabled = appConfig.customisation.isCompactMenuEnabled;
            var isLevelTwoDataAvailable = sharedService.getService('price').userDS.isLevelTwoDataAvailable(stock.inst);

            if (appConfig.customisation.isTradingEnabled) {
                var orderTicketMenuId = appConfig.widgetId.orderTicketMenuId;

                if (activeMenuId === orderTicketMenuId) {
                    sharedService.getService('tradeUI').showOrderTicket(this.container, undefined, stock);
                } else if (this.get('isEnableAddToWatchList')) {
                    sharedService.getService('price').watchListDS.addStocksToCustomWL(stock, watchListId);
                } else if (this.get('isEnableMarginSymbol')) {
                    this.get('invokeController').addSymbolToDeal(stock);
                } else if (quoteMenuId && (!isLevelTwoDataAvailable || activeMenuId !== quoteMenuId) && !isCompactMenuEnabled || (isCompactMenuEnabled && (activeMenuId !== watchListMenuId || this.get('activeTabId') === watchListMenuId))) {
                    this._navigateOnSymbolChange(watchListMenuId, quoteMenuId);
                }
            } else if (this.get('isEnableAddToWatchList')) {
                sharedService.getService('price').watchListDS.addStocksToCustomWL(stock, watchListId);
            } else if (this.get('isEnableCompareSymbol')) {
                this.get('invokeController').addToCompareSymbol(stock);
            } else if (this.get('isEnableAddToPortfolio')) {
                this.get('invokeController').addToPortfolioCollection(stock, myFavoriteCustomWL);
            } else if (quoteMenuId && (!isLevelTwoDataAvailable || activeMenuId !== quoteMenuId)) {
                this._navigateOnSymbolChange(watchListMenuId, quoteMenuId);
            }

            this.toggleDisplay(true);
        }
    }
});

Ember.Handlebars.helper('global-search-mobile', GlobalSearch);
