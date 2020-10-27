// Data stores
import announcementDS from './announcements-data-store';
import marketDepthDS from './depth-data-store';
import exchangeDS from './exchange-data-store';
import ohlcDS from '../../chart/data-stores/ohlc-data-store';
import stockDS from './stock-data-store';
import gmsDS from './gms-data-store';
import SystemMetaDS from './system-meta-data-store';
import alertDS from './alert-data-store';
import topStockDS from './top-stocks-data-store';
import companyProfileDS from './company-profile-data-store';
import timeAndSalesDS from './time-and-sales-data-store';
import SearchDS from './search-data-store';
import sectorDS from './sector-data-store';
import subMarketDS from './sub-market-data-store';
import watchListDS from './watch-list-data-store';
import appConfig from '../../../config/app-config';
import optionStockDS from './option-stock-data-store';
import optionPeriodDS from './option-period-data-store';

export default (function () {
    var createAnnouncementDataStore = function (priceService) {
        return announcementDS.create({priceService: priceService, isCachingEnabled: !appConfig.customisation.isMobile});
    };

    var createMarketDepthDataStore = function (priceService) {
        return marketDepthDS(priceService);
    };

    var createExchangeDataStore = function (priceService) {
        return exchangeDS.create({priceService: priceService});
    };

    var createOHLCDataStore = function (priceService) {
        var ohlcDataStore = ohlcDS.create({priceService: priceService});
        ohlcDataStore.initialize();

        return ohlcDataStore;
    };

    var createStockDataStore = function (priceService) {
        var stockDataStore = stockDS.create({priceService: priceService});
        stockDataStore.initialize();

        return stockDataStore;
    };

    var createAlertDataStore = function (priceService) {
        return alertDS.create({priceService: priceService});
    };

    var createGMSDataStore = function (priceService) {
        return gmsDS.create({priceService: priceService});
    };

    var createSystemMetaDataStore = function (priceService) {
        return SystemMetaDS.create({priceService: priceService});
    };

    var createTopStockDataStore = function (priceService) {
        return topStockDS.create({priceService: priceService});
    };

    var createCompanyProfileDataStore = function (priceService) {
        return companyProfileDS(priceService);
    };

    var createTimeAndSalesDataStore = function (priceService) {
        return timeAndSalesDS.create({priceService: priceService});
    };

    var createSearchDataStore = function (priceService) {
        return SearchDS.create({priceService: priceService});
    };

    var createSectorDataStore = function (priceService) {
        return sectorDS.create({priceService: priceService});
    };

    var createSubMarketDataStore = function (priceService) {
        return subMarketDS.create({priceService: priceService});
    };

    var createWatchListDataStore = function (priceService) {
        return watchListDS.create({priceService: priceService});
    };

    var createFairValueDataStore = function () {
        // return fairValueDS.create({priceService: priceService});
        return {};
    };

    var createCorporateActionDataStore = function () {
        // return corporateActionDS.create({priceService: priceService});
        return {};
    };

    var createTheoreticalChartDataStore = function () {
        // var theoreticalDS = theoreticalChartDS.create({priceService: priceService});
        // theoreticalDS.initialize();
        //
        // return theoreticalDS;
        return {};
    };

    var createTheoreticalStockDataStore = function () {
        // return theoreticalStockDS.create({priceService: priceService});
        return {};
    };

    var createOptionStockDataStore = function (priceService) {
         return optionStockDS.create({priceService: priceService});
    };

    var createOptionPeriodDataStore = function (priceService) {
         return optionPeriodDS.create({priceService: priceService});
    };

    return {
        createAnnouncementDataStore: createAnnouncementDataStore,
        createMarketDepthDataStore: createMarketDepthDataStore,
        createExchangeDataStore: createExchangeDataStore,
        createOHLCDataStore: createOHLCDataStore,
        createStockDataStore: createStockDataStore,
        createAlertDataStore: createAlertDataStore,
        createGMSDataStore: createGMSDataStore,
        createSystemMetaDataStore: createSystemMetaDataStore,
        createTopStockDataStore: createTopStockDataStore,
        createCompanyProfileDataStore: createCompanyProfileDataStore,
        createTimeAndSalesDataStore: createTimeAndSalesDataStore,
        createSearchDataStore: createSearchDataStore,
        createSectorDataStore: createSectorDataStore,
        createSubMarketDataStore: createSubMarketDataStore,
        createWatchListDataStore: createWatchListDataStore,
        createFairValueDataStore: createFairValueDataStore,
        createCorporateActionDataStore: createCorporateActionDataStore,
        createTheoreticalChartDataStore: createTheoreticalChartDataStore,
        createTheoreticalStockDataStore: createTheoreticalStockDataStore,
        createOptionStockDataStore: createOptionStockDataStore,
        createOptionPeriodDataStore: createOptionPeriodDataStore
    };
})();
