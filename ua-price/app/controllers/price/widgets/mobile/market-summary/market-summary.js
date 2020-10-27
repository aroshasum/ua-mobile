import Ember from 'ember';
import BaseArrayController from '../../../../base-array-controller';
import sharedService from '../../../../../models/shared/shared-service';
import ChartPanel from '../market-summary/components/chart-panel';
import SummaryChart from '../../mobile/components/summary-chart';
import utils from '../../../../../utils/utils';
import appEvents from '../../../../../app-events';
import ControllerFactory from '../../../../controller-factory';
import CashMap from '../../../../../components/stk-specific-components/cash-map';
import appConfig from '../../../../../config/app-config';

export default BaseArrayController.extend({
    chartId: 'indexChartMs',
    chartController: undefined,
    subWidgetArray: [],

    onLoadWidget: function () {
        var isDefaultExg = sharedService.getService('price').userDS.isPriceUserExchange(this.get('exg'));
        this.set('exg', isDefaultExg ? this.get('exg') : sharedService.userSettings.price.userDefaultExg);

        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
    },

    onPrepareData: function () {
        this.set('exchange', sharedService.getService('price').exchangeDS.getExchange(this.get('exg')));

        var mainIndex = this.get('exchange').mainIdx;
        this.set('index', sharedService.getService('price').stockDS.getStock(this.get('exg'), mainIndex ? mainIndex : sharedService.userSettings.price.defaultIndex, utils.AssetTypes.Indices));

        this._refreshSubWidgets();
    },

    onAddSubscription: function () {
        sharedService.getService('price').addExchangeRequest(this.get('exg'));
        sharedService.getService('price').addIndexRequest(this.get('exg'), this.get('exchange').mainIdx);
    },

    onRemoveSubscription: function () {
        sharedService.getService('price').removeExchangeRequest(this.get('exg'));
        sharedService.getService('price').removeIndexRequest(this.get('exg'), this.get('exchange').mainIdx);
    },

    onAfterRender: function () {
        var that = this;

        this.set('subWidgetArray', []);
        this._renderChart();

        Ember.run.later(function () {
            var route = that.container.lookup('route:application');
            var viewName = 'price/widgets/announcement/announcement';
            var marketNewsController = ControllerFactory.createController(that.container, 'controller:' + viewName);

            that.set('marketNewsController', marketNewsController);

            route.render(viewName, {
                into: 'price/containers/mobile/market-summary-tab',
                outlet: 'w2',
                controller: marketNewsController
            });

            var widgetDef = {id: 1, wn: 'price.widgets.announcement.announcement'};
            var widgetArgs = {widgetArgs: {showAnnTabs: false}};

            marketNewsController.initializeWidget(widgetDef, widgetArgs, that.widgetContainer, that.menuContent, that.tabContent);
            that.get('subWidgetArray')[that.subWidgetArray.length] = marketNewsController;
        }, 1);
    },

    onLanguageChanged: function (lang) {
        var marketNewsController = this.get('marketNewsController');

        if (marketNewsController) {
            marketNewsController.onLanguageChanged(lang);
        }

        this._renderChart();
    },

    onClearData: function () {
        this.set('stock', {});
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'));

        this.closeSubWidgets();
        this.set('subWidgetArray', []);
    },

    upsDownsNoChgValueArray: function () {
        var exg = this.get('exchange');
        var ups = exg ? exg.ups : undefined;
        var down = exg ? exg.dwns : undefined;
        var unchanged = exg ? exg.nChg : undefined;

        var maxValue = Math.max(ups, down, unchanged);

        var upsDownsNoChgValueArray = [{value: ups, barClass: 'progress-bar up-back-color', barWidth: ''},
            {value: down, barClass: 'progress-bar down-back-color', barWidth: ''},
            {value: unchanged, barClass: 'progress-bar highlight-back-color-2', barWidth: ''}];

        Ember.$.each(upsDownsNoChgValueArray, function (index, item) {
            var percentage = 0;

            if (isNaN(item.value) || item.value === 0 || maxValue === 0) {
                percentage = 0;
            }
            else {
                percentage = Math.round((item.value / maxValue) * 90) + 10;
            }

            item.barWidth = 'width:' + percentage + '%;';
        });

        return upsDownsNoChgValueArray;
    }.property('exchange.ups', 'exchange.dwns', 'exchange.nChg'),

    ytdCss: function () {
        return this.get('index.pctYtd') > 0 ? 'up-fore-color' : this.get('index.pctYtd') < 0 ? 'down-fore-color' : 'fore-color';
    }.property('index.pctYtd'),

    netCashCss: function () {
        return this.get('exchange.netCashPer') > 0 ? 'up-fore-color' : this.get('exchange.netCashPer') < 0 ? 'down-fore-color' : 'fore-color';
    }.property('exchange.netCashPer'),

    _renderChart: function () {
        var controllerString = 'controller:price/widgets/mobile/chart/quote-chart';
        var routeString = 'price/widgets/mobile/chart/quote-chart';
        var widgetKey = this.get('wkey') + '-chart';
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.set('sym', this.get('index.sym'));
        widgetController.set('exg', this.get('exchange.exg'));
        widgetController.set('inst', this.get('index.inst'));
        widgetController.set('wkey', widgetKey);
        widgetController.set('isShowTitle', false);
        widgetController.set('hideWidgetLink', true);
        widgetController.set('isDisableChartControls', true);
        widgetController.set('isShareIconDisabled', this.get('isShareIconDisabled'));

        widgetController.initializeWidget({wn: controllerString.split('/').pop()});
        var route = this.container.lookup('route:application');

        route.render(routeString, {
            into: 'price/widgets/mobile/market-summary/market-summary',
            outlet: 'marketChartOutlet',
            controller: widgetController
        });

        this.get('subWidgetArray')[this.subWidgetArray.length] = widgetController;
        appEvents.subscribeThemeChanged(widgetController, 'market-summary-chart');
    },

    _refreshSubWidgets: function () {
        var that = this;
        var subWidgetArray = this.get('subWidgetArray');

        Ember.$.each(subWidgetArray, function (index, widgetController) {
            if (widgetController) {
                widgetController.onWidgetKeysChange({
                    sym: that.get('index.sym'),
                    exg: that.get('exchange.exg'),
                    inst: that.get('index.inst')
                });
            }
        });
    },

    closeSubWidgets: function () {
        var subWidgetArray = this.get('subWidgetArray');

        Ember.$.each(subWidgetArray, function (index, widgetController) {
            if (widgetController && widgetController.closeWidget) {
                widgetController.closeWidget();
            }
        });
    },

    actions: {
        onNavigateTopStocks: function () {
            var marketMenuId = appConfig.widgetId.marketMenuId;
            var topStocksTabId = appConfig.widgetId.topStocksTabId;

            if (marketMenuId && topStocksTabId) {
                sharedService.getService('sharedUI').navigateMenu(marketMenuId, topStocksTabId);
            }
        }
    }
});

Ember.Handlebars.helper('chart-panel', ChartPanel);
Ember.Handlebars.helper('summary-chart', SummaryChart);
Ember.Handlebars.helper('cash-map', CashMap);
