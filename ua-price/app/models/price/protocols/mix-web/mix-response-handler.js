import Ember from 'ember';
import PriceConstants from '../../price-constants';
import searchResultItem from '../../../../models/price/business-entities/search-result-item';
import utils from '../../../../utils/utils';
import sharedService from '../../../shared/shared-service';
import appConfig from '../../../../config/app-config';
import priceWidgetConfig from '../../../../config/price-widget-config';

// TODO: [Bashitha] Refactor entire class to avoid response processing duplicate codes and to achieve better reusable and readable functions
export default (function () {
    var processExchangeMetadataResponse = function (dataObj, language, exchange) {
        var priceService = sharedService.getService('price');

        try {
            var headerArr;
            var isMetaChanged = false;
            var metaData = priceService.priceMeta.get('metaData');
            var isSecondaryLan = sharedService.userSettings.currentLanguage !== language;
            var isDelayed = priceService.userDS.isExchangeDelayed(exchange);

            var logPhrase = 'processExchangeMetadataResponse - ' + exchange;
            var delayedPhrase = isDelayed ? ' - delayed' : ' - real time';

            utils.logger.logTrace(logPhrase + delayedPhrase);
            priceService.stockDS.beginBulkSymbolAddition();

            // Process the WL section
            if (dataObj.HED.WL && dataObj.DAT.WL && dataObj.HED.WL.TD && dataObj.DAT.WL.TD) {
                headerArr = _getHeaderIndexList(dataObj.HED.WL.TD, ['EXCHANGE', 'SYMBOL', 'INSTRUMENT_TYPE', 'ISIN_CODE',
                    'SYMBOL_DESCRIPTION', 'SECTOR', 'CURRENCY', 'SHRT_DSC', 'DECIMAL_PLACES', 'CORRECTION_FACTOR',
                    'MARKET_ID', 'LOT_SIZE', 'COMPANY_CODE', 'EQUITY_SYMBOL', 'STRIKE_PRICE', 'EXP_DATE', 'AST', 'DS', 'TSZ']);

                processExchangeWatchlist(headerArr, dataObj.DAT.WL.TD, isSecondaryLan, isDelayed);

                metaData[exchange].DAT.WL = dataObj.DAT.WL;
                metaData[exchange].HED.WL = dataObj.HED.WL;
                metaData[exchange].DAT.VRS.WL = dataObj.DAT.VRS.WL;

                isMetaChanged = true;
            }

            if (dataObj.HED.SRC && dataObj.DAT.SRC && dataObj.HED.SRC.SD && dataObj.DAT.SRC.SD) {
                metaData[exchange].HED.SRC = metaData[exchange].HED.SRC || {};
                metaData[exchange].DAT.SRC = metaData[exchange].DAT.SRC || {};

                // Exchange Definition
                headerArr = _getHeaderIndexList(dataObj.HED.SRC.SD, ['EXCHANGE', 'CURRENCY', 'LONG_DSC', 'CTRY_CODE',
                    'DECIMAL_PLACES', 'TZ_ID', 'DISP_CODE', 'DELAY_TIME', 'IS_VIR_EX', 'DCF', 'OPEN_TIME', 'CLOSE_TIME', 'OFFSET', 'TICK_SIZE']);

                _updateExchangeMetadata('SD', dataObj, exchange, metaData);
                var exchangeObj = processExchangeDefinition(headerArr, dataObj, isSecondaryLan, isDelayed);

                // News providers
                headerArr = _getHeaderIndexList(dataObj.HED.SRC.NWSP, ['ID', 'DES', 'PARNT']);
                _updateExchangeMetadata('NWSP', dataObj, exchange, metaData);

                if (exchangeObj && headerArr && dataObj.DAT.SRC.NWSP) {
                    processExchangeNewsProviders(exchangeObj, headerArr, dataObj.DAT.SRC.NWSP, isSecondaryLan);
                }

                // Broker Mapping
                headerArr = _getHeaderIndexList(dataObj.HED.SRC.BROKERS, ['NAME', 'DESC']);
                _updateExchangeMetadata('BROKERS', dataObj, exchange, metaData);

                if (exchangeObj && headerArr && dataObj.DAT.SRC.BROKERS) {
                    processBrokerMapping(exchangeObj, headerArr, dataObj.DAT.SRC.BROKERS, isSecondaryLan);
                }

                // Sector Definition
                headerArr = _getHeaderIndexList(dataObj.HED.SRC.SCTD, ['SECTOR', 'SECT_DSC']);
                _updateExchangeMetadata('SCTD', dataObj, exchange, metaData);

                if (exchangeObj && headerArr && dataObj.DAT.SRC.SCTD) {
                    processSectorDefinition(exchangeObj.get('exg'), headerArr, dataObj.DAT.SRC.SCTD, isSecondaryLan);
                }

                // Sub Markets
                headerArr = _getHeaderIndexList(dataObj.HED.SRC.SMD, ['MARKET_ID', 'LONG_DSC', 'DEF', 'IS_MKT_SUMMARY']);
                _updateExchangeMetadata('SMD', dataObj, exchange, metaData);

                if (exchangeObj && headerArr && dataObj.DAT.SRC.SMD) {
                    processExchangeSubMarkets(exchangeObj, headerArr, dataObj.DAT.SRC.SMD, isSecondaryLan);
                }

                // Indices
                if (dataObj.HED.SRC && dataObj.DAT.SRC && dataObj.HED.SRC.ID && dataObj.DAT.SRC.ID) {
                    // Process the Index list
                    headerArr = _getHeaderIndexList(dataObj.HED.SRC.ID, ['EXCHANGE', 'SYMBOL', 'INSTRUMENT_TYPE', 'INDEX_TYPE',
                        'SYMBOL_DESCRIPTION', 'SECTOR', 'CURRENCY', 'SHRT_DSC', 'DECIMAL_PLACES', 'CORRECTION_FACTOR', 'DS']);

                    _updateExchangeMetadata('ID', dataObj, exchange, metaData);
                    processExchangeIndices(headerArr, dataObj.DAT.SRC.ID, isSecondaryLan, isDelayed);
                }

                // Process the version info and persist
                metaData[exchange].DAT.SRC = dataObj.DAT.SRC;
                metaData[exchange].HED.SRC = dataObj.HED.SRC;
                metaData[exchange].DAT.VRS.SRC = dataObj.DAT.VRS.SRC;

                isMetaChanged = true;
            }

            if (isMetaChanged) {
                priceService.priceMeta.save(language);
            }
        } catch (e) {
            utils.logger.logError('Error in processing the exchange master data response : ' + e);
        }

        if (isMetaChanged) {
            var exgObj = priceService.exchangeDS.getExchange(exchange);
            var dlsObj = priceService.systemMetaDS.getSystemMetaDataByKey('DLS_TZ', exgObj.tzId);

            priceService.exchangeDS.setTimeZoneValue(exgObj, dlsObj);
        }

        priceService.stockDS.endBulkSymbolAddition();
        priceService.onPriceMetaReady(true); // Pass true when price meta success
    };

    var processDelayedPriceMasterInfo = function (loopArray, checkArray) {
        var language = sharedService.userSettings.currentLanguage;

        loopArray.forEach(function (exg) {
            if (exg && checkArray.indexOf(exg) < 0) {
                processExchangeMetadataResponse(sharedService.getService('price').priceMeta.getExgMetaObj(exg), language, exg);
            }
        });
    };

    var processDelayedPriceMeta = function () {
        var previousDelayedExchanges = Ember.appGlobal.priceUser.delayedExchanges;
        var currentDelayedExchanges = sharedService.getService('price').userDS.delayedExchg;

        utils.logger.logTrace('processDelayedPriceMeta - previous delayed exchanges - ' + previousDelayedExchanges.join(''));
        utils.logger.logTrace('processDelayedPriceMeta - current delayed exchanges - ' + currentDelayedExchanges.join(''));

        processDelayedPriceMasterInfo(currentDelayedExchanges, previousDelayedExchanges); // If a delayed exchange newly added
        processDelayedPriceMasterInfo(previousDelayedExchanges, currentDelayedExchanges); // If a delayed exchange removed
    };

    var processExchangeWatchlist = function (headerArr, dataArr, isSecondaryLan, isDelayed) {
        try {
            if (!isSecondaryLan) {
                var dtArray, stockObj, exchangeCode, symbolCode, instrumentType, subMarket, companyId;

                Ember.$.each(dataArr, function (key, val) {
                    dtArray = val.split(utils.Constants.StringConst.Pipe);
                    exchangeCode = dtArray[headerArr.EXCHANGE];
                    symbolCode = dtArray[headerArr.SYMBOL];
                    instrumentType = parseInt(dtArray[headerArr.INSTRUMENT_TYPE], 10);
                    subMarket = dtArray[headerArr.MARKET_ID];
                    companyId = dtArray[headerArr.COMPANY_CODE];
                    companyId = companyId ? parseInt(companyId, 10) : companyId;

                    stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode, instrumentType, subMarket);
                    sharedService.getService('price').stockDS.removeFromValidationStockMap(exchangeCode, symbolCode);

                    stockObj.setData({
                        lDes: utils.formatters.convertUnicodeToNativeString(dtArray[headerArr.SYMBOL_DESCRIPTION]),
                        sDes: utils.formatters.convertUnicodeToNativeString(dtArray[headerArr.SHRT_DSC]),
                        sec: dtArray[headerArr.SECTOR],
                        cur: dtArray[headerArr.CURRENCY],
                        deci: dtArray[headerArr.DECIMAL_PLACES],
                        dcf: dtArray[headerArr.CORRECTION_FACTOR],
                        subMkt: dtArray[headerArr.MARKET_ID],
                        lot: dtArray[headerArr.LOT_SIZE],
                        cid: companyId,
                        uSym: dtArray[headerArr.EQUITY_SYMBOL],
                        stkP: dtArray[headerArr.STRIKE_PRICE],
                        expDt: dtArray[headerArr.EXP_DATE],
                        ast: dtArray[headerArr.AST],
                        isin: dtArray[headerArr.ISIN_CODE],
                        tick: dtArray[headerArr.TSZ]
                    });

                    var displaySym = dtArray[headerArr.DS] ? dtArray[headerArr.DS] : symbolCode;
                    displaySym = isDelayed ? [displaySym, utils.Constants.Delayed].join(' ') : displaySym;
                    stockObj.set('dSym', displaySym);
                });
            }
        } catch (e) {
            utils.logger.logError('Error in processing the exchange master data response : ' + e);
        }
    };

    var processExchangeDefinition = function (headerArr, dataObj, isSecondaryLan, isDelayed) {
        var exchangeObj;

        try {
            if (!isSecondaryLan) {
                var dataArr, dtArray, exchangeCode = null;
                dataArr = dataObj.DAT.SRC.SD;

                Ember.$.each(dataArr, function (key, val) {
                    dtArray = val.split(utils.Constants.StringConst.Pipe);
                    exchangeCode = dtArray[headerArr.EXCHANGE];
                    exchangeObj = sharedService.getService('price').exchangeDS.getExchange(exchangeCode);

                    exchangeObj.setData({
                        cur: dtArray[headerArr.CURRENCY],
                        des: utils.formatters.convertUnicodeToNativeString(isDelayed ? [dtArray[headerArr.LONG_DSC], utils.Constants.Delayed].join(' ') : dtArray[headerArr.LONG_DSC]),
                        country: dtArray[headerArr.CTRY_CODE],
                        dep: parseInt(dtArray[headerArr.DECIMAL_PLACES], 10),
                        delTime: parseInt(dtArray[headerArr.DELAY_TIME], 10),
                        virtual: (dtArray[headerArr.IS_VIR_EX] === '1'),
                        dcf: parseInt(dtArray[headerArr.DCF], 10),
                        openTime: dtArray[headerArr.OPEN_TIME],
                        closeTime: dtArray[headerArr.CLOSE_TIME],
                        tzo: _formatTimeZoneOffset(dtArray[headerArr.OFFSET]),
                        tick: dtArray[headerArr.TICK_SIZE],
                        tzId: dtArray[headerArr.TZ_ID]
                    });

                    var displayExg = dtArray[headerArr.DISP_CODE] ? dtArray[headerArr.DISP_CODE] : exchangeCode;
                    displayExg = isDelayed ? [displayExg, utils.Constants.Delayed].join(' ') : displayExg;
                    exchangeObj.set('de', displayExg);

                    utils.logger.logTrace('processExchangeDefinition - ' + exchangeCode + ' - display exchange - ' + displayExg);

                    // Return the exchange object
                    // RT = 306 request protocol supports only single market, but received as an array
                    // Therefore this function process only the first index value of the iteration
                    // If multiple objects found, skip rest of the objects as it conflicts with other properties like-
                    // -news providers, sub market etc. as they does not support multi market by protocol itself
                    // If multi market support introduces to the RT = 306 request, this function should be changed accordingly
                    return false;
                });
            }
        } catch (e) {
            utils.logger.logError('Error in processing the exchange definition data response : ' + e);
        }

        return exchangeObj;
    };

    var processSectorDefinition = function (exchange, headerArr, dataArr, isSecondaryLan) {
        try {
            if (!isSecondaryLan) {
                var sectorArray = [];

                Ember.$.each(dataArr, function (key, val) {
                    var sectorFields = val.split(utils.Constants.StringConst.Pipe);
                    sectorArray[key] = {sec: sectorFields[headerArr.SECTOR], desc: sectorFields[headerArr.SECT_DSC], exg: exchange};
                });

                sharedService.getService('price').sectorDS.addSectors(sectorArray);
            }
        } catch (e) {
            utils.logger.logError('Error in processing the sector definition data response : ' + e);
        }
    };

    var processExchangeIndices = function (headerArr, dataArr, isSecondaryLan, isDelayed) {
        try {
            if (!isSecondaryLan) {
                var dtArray, stockObj, exchangeCode, symbolCode, instrumentType, isMainIndex, mainIndex;
                var mainIndexCount = 0;

                Ember.$.each(dataArr, function (key, val) {
                    dtArray = val.split(utils.Constants.StringConst.Pipe);
                    exchangeCode = dtArray[headerArr.EXCHANGE];
                    symbolCode = dtArray[headerArr.SYMBOL];
                    instrumentType = parseInt(dtArray[headerArr.INSTRUMENT_TYPE], 10);
                    isMainIndex = (dtArray[headerArr.INDEX_TYPE] === 'IM');

                    if (isMainIndex) {
                        mainIndex = symbolCode;
                        mainIndexCount++;
                    }

                    stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode, utils.AssetTypes.Indices);
                    sharedService.getService('price').stockDS.removeFromValidationStockMap(exchangeCode, symbolCode);

                    stockObj.setData({
                        isMainIdx: isMainIndex,
                        lDes: utils.formatters.convertUnicodeToNativeString(dtArray[headerArr.SYMBOL_DESCRIPTION]),
                        inst: instrumentType,
                        sec: dtArray[headerArr.SECTOR],
                        cur: dtArray[headerArr.CURRENCY],
                        sDes: utils.formatters.convertUnicodeToNativeString(dtArray[headerArr.SHRT_DSC]),
                        deci: dtArray[headerArr.DECIMAL_PLACES],
                        dcf: dtArray[headerArr.CORRECTION_FACTOR],
                        ast: 8
                    });

                    var displaySym = dtArray[headerArr.DS] ? dtArray[headerArr.DS] : symbolCode;
                    displaySym = isDelayed ? [displaySym, utils.Constants.Delayed].join(' ') : displaySym;
                    stockObj.set('dSym', displaySym);
                });

                if (exchangeCode) {
                    var mainIdx = mainIndexCount > 1 ? sharedService.userSettings.price.defaultIndex : mainIndex;

                    if (mainIdx) {
                        var exchangeObj = sharedService.getService('price').exchangeDS.getExchange(exchangeCode);
                        exchangeObj.setData({'mainIdx': mainIdx});
                    }
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing the exchange indices data response : ' + e);
        }
    };

    var processExchangeNewsProviders = function (exchangeObj, headerArr, dataArr, isSecondaryLan) {
        try {
            var newsProvider;

            if (!isSecondaryLan && dataArr.length > 0) {
                Ember.$.each(dataArr, function (key, newsProv) {
                    var newsProvArray = newsProv.split(utils.Constants.StringConst.Pipe);

                    if (newsProvArray[headerArr.PARNT] === 'MUBASHER') {
                        newsProvider = newsProvArray[headerArr.ID];
                        return false;
                    }
                });

                newsProvider = utils.validators.isAvailable(newsProvider) ? newsProvider :
                    dataArr[0].split(utils.Constants.StringConst.Pipe)[headerArr.ID];

                exchangeObj.setData({
                    newsProv: newsProvider
                });
            }
        }
        catch (e) {
            utils.logger.logError('Error in processing the exchange news provider response : ' + e);
        }
    };

    var processBrokerMapping = function (exchangeObj, headerArr, dataArr, isSecondaryLan) {
        try {
            if (!isSecondaryLan && dataArr.length > 0) {
                var brokerMapping = {};

                Ember.$.each(dataArr, function (key, val) {
                    var dtArray = val.split(utils.Constants.StringConst.Pipe);
                    brokerMapping[dtArray[headerArr.NAME]] = dtArray[headerArr.DESC];
                });

                exchangeObj.setData({
                    brokerMapping: brokerMapping
                });
            }
        }
        catch (e) {
            utils.logger.logError('Error in processing the broker mapping response : ' + e);
        }
    };

    var processExchangeSubMarkets = function (exchangeObj, headerArr, dataArr, isSecondaryLan) {
        try {
            if (!isSecondaryLan) {
                // If only one sub market available, considers as sub markets not available
                // Symbols are not tagged to the sub market in this scenario
                // Therefore symbols are not loaded in application widgets

                // Commented 'if' block to fixed issue occur in KSE setup
                // Issue : Sending MKT code as "-1"

                // if (dataArr.length > 1) {
                    var allowedSubMktsByExg = _getAllowedSubMktsByExchange(exchangeObj.exg);

                    Ember.$.each(dataArr, function (key, val) {
                        var dtArray = val.split(utils.Constants.StringConst.Pipe);
                        var subMktCode = dtArray[headerArr.MARKET_ID];
                        var exchange = exchangeObj.exg;

                        var defaultSubMkt = appConfig.customisation.defaultSubMarket[exchange];

                        if (allowedSubMktsByExg.length === 0 || allowedSubMktsByExg.contains(subMktCode)) {
                            var subMarketObj = sharedService.getService('price').subMarketDS.getSubMarket(exchange, subMktCode);

                            // Gives priority to default sub market configured in application (price-constants)
                            // This is to avoid data issues from backend and gives correct output to users
                            // If default sub market is not configured in application, it will get from backend response
                            subMarketObj.setData({
                                marketId: subMktCode,
                                lDes: utils.formatters.convertUnicodeToNativeString(dtArray[headerArr.LONG_DSC]),
                                def: defaultSubMkt ? subMktCode === defaultSubMkt ? '1' : '0' : dtArray[headerArr.DEF],
                                isMktSummary: dtArray[headerArr.IS_MKT_SUMMARY]
                            });
                        }
                    });
                // }

                // This will set sub market array with zero items if market does not have sub markets
                // Market data subscription is being sent based on this logic
                // Therefore it is required not to have sub market array undefined
                if (!exchangeObj.get('subMarketArray')) {
                    exchangeObj.set('subMarketArray', sharedService.getService('price').subMarketDS.getSubMarketCollectionByExchange(exchangeObj.exg));
                }
            }
        }
        catch (e) {
            utils.logger.logError('Error in processing the exchange sub market response : ' + e);
        }
    };

    //
    // SubMarket Symbol Response
    //
    var processExchangeSymbolResponse = function (dataObj, exchange, language) {
        sharedService.getService('price').stockDS.beginBulkSymbolAddition();

        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, symbolCode, exchangeCode, instrumentType, stockObj, symHedIdxList, headerFields, subMarket, allowedSubMktsByExg, companyId;
                var isDelayed = sharedService.getService('price').userDS.isExchangeDelayed(exchange);

                if (dataObj.DAT.TD) {
                    var symbolMeta = sharedService.getService('price').priceSymbolMeta.get('metaData');
                    var defaultSubMkt = sharedService.getService('price').exchangeDS.getDefaultSubMarket(exchange);

                    // Update symbol meta data
                    headerFields = ['EXCHANGE', 'SYMBOL', 'INSTRUMENT_TYPE', 'SYMBOL_DESCRIPTION', 'SHRT_DSC',
                        'DECIMAL_PLACES', 'CURRENCY', 'COMPANY_CODE', 'ISIN_CODE', 'SECTOR', 'MARKET_ID', 'TSZ', 'DS'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.TD, headerFields);
                    allowedSubMktsByExg = _getAllowedSubMktsByExchange(exchange);

                    Ember.$.each(dataObj.DAT.TD, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        subMarket = dtArray[symHedIdxList.MARKET_ID];

                        exchangeCode = dtArray[symHedIdxList.EXCHANGE];

                        // If only few sub markets allowed this will filter symbols related to those sub markets
                        // Else this will accept all the symbols for all the sub markets
                        if (allowedSubMktsByExg.length === 0 || allowedSubMktsByExg.contains(subMarket)) {
                            // Process only symbols which are not in default sub market of the exchange
                            // Default sub market symbols are processed in RT = 306 response
                            // Skip those in this processing to avoid unnecessary overhead of duplicate symbol processing
                            // This response (RT = 303) and RT = 306 response receiving order does not affect the logic as-
                            // somehow both responses should be received at client level
                            // If any response fails, it considers as error situation and sends the request again when needed
                            if (subMarket !== defaultSubMkt) {
                                symbolCode = dtArray[symHedIdxList.SYMBOL];
                                exchangeCode = dtArray[symHedIdxList.EXCHANGE];
                                instrumentType = parseInt(dtArray[symHedIdxList.INSTRUMENT_TYPE], 10);

                                stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode, instrumentType, subMarket);

                                companyId = dtArray[symHedIdxList.COMPANY_CODE];
                                companyId = companyId ? parseInt(companyId, 10) : companyId;

                                stockObj.setData({
                                    sym: symbolCode,
                                    exg: exchangeCode,
                                    inst: parseInt(dtArray[symHedIdxList.INSTRUMENT_TYPE], 10),
                                    deci: dtArray[symHedIdxList.DECIMAL_PLACES],
                                    lDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.SYMBOL_DESCRIPTION]),
                                    sDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.SHRT_DSC]),
                                    sec: dtArray[symHedIdxList.SECTOR],
                                    tick: dtArray[symHedIdxList.TSZ],
                                    cid: companyId
                                });

                                var displaySym = dtArray[symHedIdxList.DS] ? dtArray[symHedIdxList.DS] : symbolCode;
                                displaySym = isDelayed ? [displaySym, utils.Constants.Delayed].join(' ') : displaySym;
                                stockObj.set('dSym', displaySym);
                            }
                        }
                    });

                    symbolMeta[exchange].DAT.TD = dataObj.DAT.TD;
                    symbolMeta[exchange].HED.TD = dataObj.HED.TD;
                    symbolMeta[exchange].DAT.VRS[0] = parseInt(dataObj.DAT.VRS[0], 10);

                    sharedService.getService('price').priceSymbolMeta.save(language);
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol response : ' + e);
        }

        sharedService.getService('price').stockDS.endBulkSymbolAddition();
    };

    //
    // Alert Specific Requests
    //
    var processAlertHistoryResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, alertTS, alertObj, alertHedIdxList, headerFields;

                if (dataObj.DAT.HPALERT) {
                    headerFields = ['ATO', 'AST', 'TS', 'S', 'AP',
                        'ACR', 'AV', 'ATV', 'TTS', 'ACK', 'FACR', 'FATV'];
                    alertHedIdxList = _getHeaderIndexList(dataObj.HED.HPALERT, headerFields);

                    Ember.$.each(dataObj.DAT.HPALERT, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        alertTS = dtArray[alertHedIdxList.ATO];
                        alertObj = sharedService.getService('price').alertDS.getAlert(alertTS);

                        alertObj.setData({
                            sym: dtArray[alertHedIdxList.S],
                            status: dtArray[alertHedIdxList.AST],
                            tval: dtArray[alertHedIdxList.ATV],
                            tts: dtArray[alertHedIdxList.TTS]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol response : ' + e);
        }
    };

    // Gms Summary response
    var processGmsSummaryResponse = function (dataObj) {
        var reqStatus = utils.Constants.ReqStatus;

        try {
            if (dataObj.DAT && dataObj.HED) {
                var countryCode, exgCode, dtArray, instrumentType, gmsObj, symHedIdxList, headerFields, symbolDetail, symbolCode, assetType, deci;

                if (dataObj.DAT.GMS) {
                    var userExg = sharedService.getService('price').userDS.get('allExg');
                    var delayedExg = sharedService.getService('price').userDS.get('delayedExchg');

                    headerFields = ['S', 'SYMT', 'R', 'PRI', 'ISG', 'CON', 'DFNS', 'CLF', 'DES', 'DEP', 'SDES', 'PRIS', 'ALTS', 'DT'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.GMS, headerFields);

                    Ember.$.each(dataObj.DAT.GMS, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        assetType = parseInt(dtArray[symHedIdxList.SYMT], 10);
                        countryCode = dtArray[symHedIdxList.CON].toLowerCase();
                        symbolDetail = dtArray[symHedIdxList.S].split(utils.Constants.StringConst.Tilde);
                        instrumentType = parseInt(symbolDetail[1], 10);
                        symbolCode = symbolDetail[2];
                        exgCode = symbolDetail[0];
                        deci = dtArray[symHedIdxList.DEP];

                        var exchange = 'GLOBAL';
                        var sDescription = dtArray[symHedIdxList.SDES];

                        if (userExg.length > 0) {
                            Ember.$.each(userExg, function (index, value) {
                                if (symbolDetail.indexOf(value) === 0) {
                                    exchange = value;
                                }
                            });
                        }

                        if (delayedExg.length > 0) {
                            if (delayedExg.indexOf(exgCode) > -1) {
                                sDescription = [dtArray[symHedIdxList.SDES], utils.Constants.Delayed].join(' ');
                            }
                        }

                        gmsObj = sharedService.getService('price').gmsDS.getGms(exchange, symbolCode, assetType, instrumentType);

                        gmsObj.setData({
                            sym: symbolCode,
                            inst: instrumentType,
                            lDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.DES]),
                            sDes: utils.formatters.convertUnicodeToNativeString(sDescription),
                            cCode: countryCode,
                            ast: assetType,
                            deci: deci
                        });
                    });

                    sharedService.getService('price').gmsDS.set('status', reqStatus.Success);
                }
            }
        } catch (e) {
            sharedService.getService('price').gmsDS.status = reqStatus.Failed;
            utils.logger.logError('Error in processing gms summary response : ' + e);
        }
    };

    // System Meta Data Response
    var processSystemMetaDataResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var tzId, sDate, eDate, dls, dlsTzObj, symHedIdxList, headerFields, dtArray;

                if (dataObj.DAT.DLS_TZ) {
                    headerFields = ['TZ_ID', 'SDATE', 'EDATE', 'DLS_OS'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.DLS_TZ, headerFields);

                    Ember.$.each(dataObj.DAT.DLS_TZ, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        tzId = dtArray[symHedIdxList.TZ_ID];
                        sDate = dtArray[symHedIdxList.SDATE];
                        eDate = dtArray[symHedIdxList.EDATE];
                        dls = symHedIdxList.DLS_OS ? parseInt(dtArray[symHedIdxList.DLS_OS]) : 0;

                        dlsTzObj = sharedService.getService('price').systemMetaDS.getSystemMetaDataByKey('DLS_TZ', tzId);

                        dlsTzObj.setData({
                            tzId: tzId,
                            sDate: sDate,
                            eDate: eDate,
                            dls: dls
                        });
                    });

                    var dlsObj = sharedService.getService('price').systemMetaDS.getSystemMetaDataByType('DLS_TZ');
                    sharedService.getService('price').exchangeDS.updateOffsetTime(dlsObj);
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing system meta data response : ' + e);
        }
    };

    var processSymbolValidationResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, symbolCode, exchangeCode, instrumentType, stockObj, symHedIdxList, headerFields;

                if (dataObj.DAT.SYM) {
                    // Update symbol meta data
                    var userExg = sharedService.getService('price').userDS.get('allExg');
                    var delayedExg = sharedService.getService('price').userDS.get('delayedExchg');

                    headerFields = ['E', 'S', 'INS', 'SEC', 'SDES', 'DES', 'CUR', 'DEF', 'DS', 'DEP'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.SYM, headerFields);

                    Ember.$.each(dataObj.DAT.SYM, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        symbolCode = dtArray[symHedIdxList.S];
                        exchangeCode = dtArray[symHedIdxList.E];
                        instrumentType = parseInt(dtArray[symHedIdxList.INS], 10);
                        stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode, instrumentType);

                        var exchange = 'GLOBAL';
                        var displaySymbol = dtArray[symHedIdxList.DS] ? dtArray[symHedIdxList.DS] : symbolCode;

                        if (userExg.length > 0) {
                            Ember.$.each(userExg, function (index, value) {
                                if (exchangeCode === value) {
                                    exchange = value;
                                }
                            });
                        }

                        if (delayedExg.length > 0) {
                            if (delayedExg.indexOf(exchangeCode) > -1) {
                                displaySymbol = [displaySymbol, utils.Constants.Delayed].join(' ');
                            }
                        }

                        stockObj.setData({
                            sym: symbolCode,
                            exg: exchange,
                            inst: instrumentType,
                            lDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.DES]),
                            sDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.SDES]),
                            sec: dtArray[symHedIdxList.SEC],
                            dcf: dtArray[symHedIdxList.DEF],
                            cur: dtArray[symHedIdxList.CUR],
                            dSym: displaySymbol,
                            deci: dtArray[symHedIdxList.DEP]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol validation response : ' + e);
        }
    };

    var processSymbolSearchResponse = function (dataObj, searchKey, notifyFn, searchNumber) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, resultItem, symHedIdxList, headerFields, searchResultArray, resultArray, config;
                resultArray = dataObj.DAT.SYMS;

                if (resultArray) {
                    var delayedExg = sharedService.getService('price').userDS.get('delayedExchg');

                    headerFields = ['E', 'S', 'INS', 'SDES', 'DES', 'DS', 'SYMT', 'MC', 'DEP', 'SYMC'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.SYMS, headerFields);
                    searchResultArray = Ember.A();
                    config = priceWidgetConfig.globalSearch.groups;

                    Ember.$.each(resultArray, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        resultItem = searchResultItem.create();

                        var symbolCode = dtArray[symHedIdxList.S];
                        var exchangeCode = dtArray[symHedIdxList.E];
                        var displayExchange = dtArray[symHedIdxList.E];
                        var ast = dtArray[symHedIdxList.SYMT];
                        var exgObj = sharedService.getService('price').exchangeDS.getExchange(exchangeCode);
                        var groupingObj = config[ast] ? config[ast] : config.other;
                        var displaySymbol = dtArray[symHedIdxList.DS] ? dtArray[symHedIdxList.DS] : symbolCode;

                        if (delayedExg.length > 0) {
                            if (delayedExg.indexOf(exchangeCode) > -1) {
                                displaySymbol = [displaySymbol, utils.Constants.Delayed].join(' ');
                                displayExchange = [displayExchange, utils.Constants.Delayed].join(' ');
                            }
                        }

                        resultItem.setData({
                            sym: symbolCode,
                            exg: exchangeCode,
                            dSym: utils.validators.isAvailable(displaySymbol) ? displaySymbol : symbolCode,
                            de: utils.validators.isAvailable(exgObj.de) ? exgObj.de : displayExchange,
                            inst: dtArray[symHedIdxList.INS],
                            ast: ast,
                            subMkt: dtArray[symHedIdxList.MC],
                            groupingObj: groupingObj,
                            lDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.DES]),
                            sDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.SDES]),
                            deci: dtArray[symHedIdxList.DEP],
                            cid: dtArray[symHedIdxList.SYMC]
                        });

                        searchResultArray.pushObject(resultItem);
                    });

                    if (Ember.$.isFunction(notifyFn)) {
                        var isSearchResultAvailable = searchResultArray.length > 0;
                        notifyFn(isSearchResultAvailable, searchKey, searchResultArray, searchNumber);
                    }
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol search response : ' + e);

            if (Ember.$.isFunction(notifyFn)) {
                notifyFn(false);
            }
        }
    };

    //
    // News & announcement specific response
    //
    var processAnnouncementBodyResponse = function (dataObj, reqSuccessFn, reqFailureFn) {
        try {
            if (dataObj.DAT && dataObj.DAT.ANN) {
                var dtIdxList = _getHeaderIndexList(dataObj.HED.ANN, ['ID', 'BOD']);
                var record = dataObj.DAT.ANN.split(utils.Constants.StringConst.Pipe);
                var annId = record[dtIdxList.ID];
                var body = record[dtIdxList.BOD];

                if (annId && body) {
                    sharedService.getService('price').announcementDS.getAnnouncement(annId, PriceConstants.ResponseType.Data.ResponseAnnouncement).set('bod', body);

                    if (Ember.$.isFunction(reqSuccessFn)) {
                        reqSuccessFn(annId);
                    }
                }
            } else {
                if (Ember.$.isFunction(reqFailureFn)) {
                    reqFailureFn();
                }
            }
        } catch (e) {
            if (Ember.$.isFunction(reqFailureFn)) {
                reqFailureFn();
            }

            utils.logger.logError('Error in processing announcement body response : ' + e);
        }
    };

    var processNewsBodyResponse = function (dataObj, reqSuccessFn, reqFailureFn) {
        try {
            if (dataObj.DAT && dataObj.DAT.NWS) {
                var dtIdxList = _getHeaderIndexList(dataObj.HED.NWS, ['ID', 'BOD']);
                var record = dataObj.DAT.NWS.split(utils.Constants.StringConst.Pipe);
                var annId = record[dtIdxList.ID];
                var body = record[dtIdxList.BOD];

                if (annId && body) {
                    sharedService.getService('price').announcementDS.getAnnouncement(annId, PriceConstants.ResponseType.Data.ResponseNews).set('bod', body);

                    if (Ember.$.isFunction(reqSuccessFn)) {
                        reqSuccessFn(annId);
                    }
                }
            } else {
                if (Ember.$.isFunction(reqFailureFn)) {
                    reqFailureFn();
                }
            }
        } catch (e) {
            if (Ember.$.isFunction(reqFailureFn)) {
                reqFailureFn();
            }

            utils.logger.logError('Error in processing news body response : ' + e);
        }
    };

    var processAnnouncementSearchResponse = function (dataObj, announcementCollection, reqSuccessFn, reqFailureFn) {
        try {
            var existingIdList = announcementCollection.mapBy('id');

            if (dataObj.DAT && dataObj.DAT.ANNL) {
                var annHedIdxList = _getHeaderIndexList(dataObj.HED.ANNL, ['ID', 'E', 'S', 'HED', 'DT', 'L']);

                Ember.$.each(dataObj.DAT.ANNL, function (key, val) {
                    var dtArray = val.split(utils.Constants.StringConst.Pipe);
                    var annId = dtArray[annHedIdxList.ID];
                    var exg = dtArray[annHedIdxList.E];
                    var sym = dtArray[annHedIdxList.S];
                    var annObj = sharedService.getService('price').announcementDS.getAnnouncement(annId, PriceConstants.ResponseType.Data.ResponseAnnouncement, sym, exg);

                    annObj.setData({
                        type: PriceConstants.ResponseType.Data.ResponseAnnouncement,
                        exg: exg,
                        sym: sym,
                        hed: dtArray[annHedIdxList.HED],
                        dt: dtArray[annHedIdxList.DT],
                        ln: dtArray[annHedIdxList.L],
                        id: annId
                    });

                    _addNewsAnnToCollection(existingIdList, annId, announcementCollection, annObj);
                });

                if (Ember.$.isFunction(reqSuccessFn)) {
                    if (dataObj.DAT.ANNL.length > 0) {
                        reqSuccessFn(true);
                    } else {
                        reqSuccessFn(false);
                    }
                }
            }
        } catch (e) {
            if (Ember.$.isFunction(reqFailureFn)) {
                reqFailureFn();
            }

            utils.logger.logError('Error in processing announcement search response : ' + e);
        }
    };

    var processNewsSearchResponse = function (dataObj, newsCollection, reqSuccessFn, reqFailureFn) {
        try {
            var existingIdList = newsCollection.mapBy('id');

            if (dataObj.DAT && dataObj.DAT.NWSL) {
                var annHedIdxList = _getHeaderIndexList(dataObj.HED.NWSL, ['ID', 'E', 'S', 'HED', 'DT', 'L']);

                Ember.$.each(dataObj.DAT.NWSL, function (key, val) {
                    var dtArray = val.split(utils.Constants.StringConst.Pipe);
                    var newsId = dtArray[annHedIdxList.ID];
                    var exg = dtArray[annHedIdxList.E];
                    var sym = dtArray[annHedIdxList.S];
                    var annObj = sharedService.getService('price').announcementDS.getAnnouncement(newsId, PriceConstants.ResponseType.Data.ResponseNews, sym, exg);

                    annObj.setData({
                        type: PriceConstants.ResponseType.Data.ResponseNews,
                        exg: exg,
                        sym: sym,
                        hed: dtArray[annHedIdxList.HED],
                        dt: dtArray[annHedIdxList.DT],
                        ln: dtArray[annHedIdxList.L],
                        id: newsId
                    });

                    _addNewsAnnToCollection(existingIdList, newsId, newsCollection, annObj);
                });

                if (Ember.$.isFunction(reqSuccessFn)) {
                    if (dataObj.DAT.NWSL.length > 0) {
                        reqSuccessFn(true);
                    } else {
                        reqSuccessFn(false);
                    }

                } else {
                    if (Ember.$.isFunction(reqFailureFn)) {
                        reqFailureFn();
                    }
                }
            }
        } catch (e) {
            if (Ember.$.isFunction(reqFailureFn)) {
                reqFailureFn();
            }

            utils.logger.logError('Error in processing news search response : ' + e);
        }
    };

    //
    // Chart specific response
    //
    var processChartResponse = function (dtObj, chartCategory, reqSuccessFn, reqFailureFn) {
        try {
            if (dtObj.DAT && dtObj.HED) {
                var sym, exg, symInfo, ohlcRecHedIdxList, pt, date, symHedIdxList, ohlcSeries;
                symHedIdxList = dtObj.HED.S.split(utils.Constants.StringConst.Comma).indicesOf(['E', 'S']);
                symInfo = dtObj.DAT.S.split(utils.Constants.StringConst.Comma);
                sym = symInfo[symHedIdxList.S];
                exg = symInfo[symHedIdxList.E];
                ohlcRecHedIdxList = dtObj.HED.HIS.split(utils.Constants.StringConst.Comma).indicesOf(
                    ['DT', 'OP', 'HIG', 'LOW', 'CLS', 'VOL', 'TOVR', 'PER', 'PBR']
                );
                ohlcSeries = sharedService.getService('price').ohlcDS.getOHLCSeries(exg, sym, chartCategory);

                // If data is already available, flush them.
                // Note: Flushing and re-generating the array is efficient than search and insertion the missing points
                if (ohlcSeries.ohlcDataPoints) {
                    ohlcSeries.ohlcDataPoints.length = 0;
                }

                // Load exchange object for obtaining the timezone
                var exgObj = sharedService.getService('price').exchangeDS.getExchange(exg);

                Ember.$.each(dtObj.DAT.HIS, function (key, val) {
                    pt = parseInt(val[ohlcRecHedIdxList.DT], 10) * PriceConstants.UnixTimestampByMilliSeconds;
                    date = utils.formatters.convertToUTCDate(pt, exgObj.tzo);

                    ohlcSeries.setData({
                        dt: date,
                        open: val[ohlcRecHedIdxList.OP],
                        high: val[ohlcRecHedIdxList.HIG],
                        low: val[ohlcRecHedIdxList.LOW],
                        close: val[ohlcRecHedIdxList.CLS],
                        volume: val[ohlcRecHedIdxList.VOL],
                        turnover: val[ohlcRecHedIdxList.TOVR],
                        per: val[ohlcRecHedIdxList.PER],
                        pbr: val[ohlcRecHedIdxList.PBR]
                    }, false);
                });

                if (Ember.$.isFunction(reqSuccessFn) && ohlcSeries.ohlcDataPoints && ohlcSeries.ohlcDataPoints.length > 0) {
                    reqSuccessFn();
                } else {
                    reqFailureFn();
                }

                sharedService.getService('price').ohlcDS.onChartDataReady(utils.keyGenerator.getKey(exg, sym));
            }
        }
        catch (e) {
            utils.logger.logError('Error in Intraday chart data : ' + e);
        }
    };

    var processTOPVChartResponse = function (dtObj, chartCategory, reqSuccessFn, reqFailureFn) {
        try {
            if (dtObj.DAT && dtObj.HED) {
                var sym, exg, symInfo, ohlcRecHedIdxList, pt, date, symHedIdxList, ohlcSeries;
                symHedIdxList = dtObj.HED.S.split(utils.Constants.StringConst.Comma).indicesOf(['E', 'S']);
                symInfo = dtObj.DAT.S.split(utils.Constants.StringConst.Comma);
                sym = symInfo[symHedIdxList.S];
                exg = symInfo[symHedIdxList.E];
                ohlcRecHedIdxList = dtObj.HED.HIS.split(utils.Constants.StringConst.Comma).indicesOf(
                    ['DT', 'OP', 'HIG', 'LOW', 'CLS', 'VOL', 'TOVR']
                );
                ohlcSeries = sharedService.getService('price').theoreticalChartDS.getOHLCSeries(exg, sym, chartCategory);

                // If data is already available, flush them.
                // Note: Flushing and re-generating the array is efficient than search and insertion the missing points
                if (ohlcSeries.ohlcDataPoints) {
                    ohlcSeries.ohlcDataPoints.length = 0;
                }

                // Load exchange object for obtaining the timezone
                var exgObj = sharedService.getService('price').exchangeDS.getExchange(exg);

                Ember.$.each(dtObj.DAT.HIS, function (key, val) {
                    pt = parseInt(val[ohlcRecHedIdxList.DT], 10) * PriceConstants.UnixTimestampByMilliSeconds;
                    date = utils.formatters.convertToUTCDate(pt, exgObj.tzo);

                    ohlcSeries.setData({
                        dt: date,
                        open: val[ohlcRecHedIdxList.OP],
                        high: val[ohlcRecHedIdxList.HIG],
                        low: val[ohlcRecHedIdxList.LOW],
                        close: val[ohlcRecHedIdxList.CLS],
                        volume: val[ohlcRecHedIdxList.VOL],
                        turnover: val[ohlcRecHedIdxList.TOVR]
                    }, false);
                });

                if (Ember.$.isFunction(reqSuccessFn) && ohlcSeries.ohlcDataPoints && ohlcSeries.ohlcDataPoints.length > 0) {
                    reqSuccessFn();
                } else {
                    reqFailureFn(dtObj.STAT ? dtObj.STAT.HIS : '');
                }

                sharedService.getService('price').theoreticalChartDS.onChartDataReady(utils.keyGenerator.getKey(exg, sym));
            }
        }
        catch (e) {
            utils.logger.logError('Error in Intraday chart data : ' + e);
        }
    };

    //
    // Company Profile specific response
    //
    var processCompanyProfileResponse = function (dataObj, exchange, symbol, language) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, cpObj, cpDataList;
                cpObj = sharedService.getService('price').companyProfileDS.getCompanyProfile(exchange, symbol, language);
                var stock = sharedService.getService('price').stockDS.getStock(exchange, symbol, language);

                if (dataObj.DAT.COMPINF.CP) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.CP, ['LOGO', 'COMP_NAME', 'ISIN_CODE', 'ADDR_1', 'PHN',
                        'FAX', 'EMAIL', 'WEB', 'TRD_NAME', 'COMP_CURRENCY', 'COUNTRY_DESC', 'MAIN_ACTIVITY', 'COMPANY_ID']);

                    Ember.$.each(dataObj.DAT.COMPINF.CP, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);

                        cpObj.setData({
                            logo: dtArray[cpDataList.LOGO],
                            compName: dtArray[cpDataList.COMP_NAME],
                            des: dtArray[cpDataList.MAIN_ACTIVITY],
                            isin: dtArray[cpDataList.ISIN_CODE],
                            addr: dtArray[cpDataList.ADDR_1],
                            phn: dtArray[cpDataList.PHN],
                            fax: dtArray[cpDataList.FAX],
                            email: dtArray[cpDataList.EMAIL],
                            web: dtArray[cpDataList.WEB],
                            trdName: dtArray[cpDataList.TRD_NAME],
                            currency: dtArray[cpDataList.COMP_CURRENCY],
                            country: dtArray[cpDataList.COUNTRY_DESC],
                            listedShr: stock.mktCap,
                            mktCap1: stock.lstShares,
                            compID: dtArray[cpDataList.COMPANY_ID]
                        });
                    });
                }

                if (dataObj.DAT.COMPINF.STK) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.STK, ['ISIN_CODE', 'LISTING_DATE', 'MARKETCAP', 'FREE_FLOAT', 'PAR_VALUE', 'PAID_CAP', 'BBGID', 'SECTOR']);

                    Ember.$.each(dataObj.DAT.COMPINF.STK, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);

                        cpObj.setData({
                            isin: dtArray[cpDataList.ISIN_CODE],
                            stkLstOn: dtArray[cpDataList.LISTING_DATE],
                            mktCap: dtArray[cpDataList.MARKETCAP],
                            freeFltShr: dtArray[cpDataList.FREE_FLOAT],
                            parVal: dtArray[cpDataList.PAR_VALUE],
                            paidCap: dtArray[cpDataList.PAID_CAP],
                            bbgid: dtArray[cpDataList.BBGID],
                            sector: dtArray[cpDataList.SECTOR]
                        });
                    });
                }

                if (dataObj.DAT.COMPINF.INMGT) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.INMGT, ['INDIVIDUAL_NAME', 'DESIGNATION', 'MGT_START_DATE', 'SORT_ORDER']);

                    var cpMObj;

                    Ember.$.each(dataObj.DAT.COMPINF.INMGT, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        cpMObj = sharedService.getService('price').companyProfileDS.createCompanyManagement();

                        cpMObj.setData({
                            name: dtArray[cpDataList.INDIVIDUAL_NAME],
                            desig: dtArray[cpDataList.DESIGNATION],
                            date: dtArray[cpDataList.MGT_START_DATE],
                            sortOrder: dtArray[cpDataList.SORT_ORDER]
                        });

                        cpObj.compManagement.pushObject(cpMObj);
                    });
                }

                if (dataObj.DAT.COMPINF.OWN_IND) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.OWN_IND, ['INDIVIDUAL_NAME', 'OWN_PCT_IND']);
                    var cposobj;

                    Ember.$.each(dataObj.DAT.COMPINF.OWN_IND, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        cposobj = sharedService.getService('price').companyProfileDS.createCompanyOwners();

                        cposobj.setData({
                            ownerName: dtArray[cpDataList.INDIVIDUAL_NAME],
                            sherPrs: dtArray[cpDataList.OWN_PCT_IND]
                        });

                        cpObj.compOwners.pushObject(cposobj);
                    });
                }

                if (dataObj.DAT.COMPINF.CPCLS) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.CPCLS, ['SHRT_DSC', 'CLASSIFICATION_ID']);

                    Ember.$.each(dataObj.DAT.COMPINF.CPCLS, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);

                        if (dtArray [cpDataList.CLASSIFICATION_ID] === 'GICSL3') {
                            cpObj.setData({
                                indGrp: dtArray[cpDataList.SHRT_DSC]
                            });
                        } else if (dtArray [cpDataList.CLASSIFICATION_ID] === 'GICSL4') {

                            cpObj.setData({
                                subInd: dtArray[cpDataList.SHRT_DSC]
                            });
                        }
                    });
                }

                if (dataObj.DAT.COMPINF.SUBS) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.SUBS, ['SUBS_COMP_NAME', 'OWN_PCT']);
                    var cpsubobj;

                    Ember.$.each(dataObj.DAT.COMPINF.SUBS, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        cpsubobj = sharedService.getService('price').companyProfileDS.createCompanySubsidiaries();

                        cpsubobj.setData({
                            subsiName: dtArray[cpDataList.SUBS_COMP_NAME],
                            subsiSherPrs: dtArray[cpDataList.OWN_PCT]
                        });

                        cpObj.compSubsidiaries.pushObject(cpsubobj);
                    });
                }

                if (dataObj.DAT.COMPINF.AUD) {
                    cpDataList = _getHeaderIndexList(dataObj.HED.COMPINF.AUD, ['AUD_COMP_NAME']);

                    Ember.$.each(dataObj.DAT.COMPINF.AUD, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);

                        cpObj.setData({
                            auditor: dtArray[cpDataList.AUD_COMP_NAME]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in Company Profile Data : ' + e);
        }
    };

    // TODO : [Rasika] Need to add response status processing, Error Handling
    var processTimeAndSalesBacklogResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var noOfDuplicate = 0;
                var dtArray, symbolCode, exchangeCode, symInfo, trdObj, symHedIdxList, tsHedIdxList, headerFields, backlogLastTrade, isFullMarket;

                if (dataObj.HED.S && dataObj.DAT.S) {
                    symHedIdxList = dataObj.HED.S.split(utils.Constants.StringConst.Pipe).indicesOf(['E', 'S']);
                    symInfo = dataObj.DAT.S.split(utils.Constants.StringConst.Pipe);
                    symbolCode = symInfo[symHedIdxList.S];
                } else if (dataObj.HED.E && dataObj.DAT.E) {
                    isFullMarket = true;
                    symHedIdxList = dataObj.HED.E.split(utils.Constants.StringConst.Pipe).indicesOf(['E']);
                    symInfo = dataObj.DAT.E.split(utils.Constants.StringConst.Pipe);
                }

                exchangeCode = symInfo[symHedIdxList.E];

                if (dataObj.DAT.TS) {
                    headerFields = ['S', 'TT', 'INS', 'LTP', 'TQ', 'CHG', 'PCHG', 'TYPE', 'SPL', 'SNO', 'VWAP', 'BUYERCODE', 'SELLERCODE'];
                    tsHedIdxList = _getHeaderIndexList(dataObj.HED.TS, headerFields);

                    Ember.$.each(dataObj.DAT.TS, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);

                        var sym = isFullMarket ? dtArray[tsHedIdxList.S] : symbolCode;
                        var seq = parseInt(dtArray[tsHedIdxList.SNO], 10);

                        trdObj = sharedService.getService('price').timeAndSalesDS.getBacklogTrade(exchangeCode, symbolCode, seq);

                        if (trdObj) {
                            // TODO : [Rasike] Need to use formatters after adding formatters for each type.
                            trdObj.setData({
                                sym: sym,
                                exg: exchangeCode,
                                tts: dtArray[tsHedIdxList.TT],
                                inst: dtArray[tsHedIdxList.INS],
                                trp: parseFloat(dtArray[tsHedIdxList.LTP]),
                                trq: parseInt(dtArray[tsHedIdxList.TQ], 10),
                                nChg: parseFloat(dtArray[tsHedIdxList.CHG]),
                                pctChg: parseFloat(dtArray[tsHedIdxList.PCHG]),
                                seq: seq,
                                trdType: dtArray[tsHedIdxList.TYPE],
                                vwap: parseFloat(dtArray[tsHedIdxList.VWAP]),
                                splits: parseInt(dtArray[tsHedIdxList.SPL], 10),
                                isEmpty: false,
                                buyCode: dtArray[tsHedIdxList.BUYERCODE],
                                selCode: dtArray[tsHedIdxList.SELLERCODE]
                            });

                            if (backlogLastTrade) {
                                backlogLastTrade.setTradeTick(trdObj.trp);
                            }

                            backlogLastTrade = _setLastTrade(backlogLastTrade, trdObj);
                        } else {
                            // 'trdObj' will be undefined if row was duplicated
                            noOfDuplicate++;
                        }
                    });
                }

                if (dataObj.ROW && dataObj.ROW.TS) {
                    sharedService.getService('price').timeAndSalesDS.setBacklogLength(exchangeCode, symbolCode, parseInt(dataObj.ROW.TS, 10) - noOfDuplicate);
                }

                sharedService.getService('price').timeAndSalesDS.onBacklogDataReady(exchangeCode, symbolCode);
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol validation response : ' + e);
        }
    };

    var processCalenderEventsResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, type, newsEventObj, newsHedIdxList, headerFields;

                if (dataObj.DAT.CALENDER_EVENTS) {
                    headerFields = ['TITLE', 'ID', 'URL', 'DATE'];
                    newsHedIdxList = _getHeaderIndexList(dataObj.HED.CALENDER_EVENTS, headerFields);
                    type = 'CALENDER_EVENT';

                    Ember.$.each(dataObj.DAT.CALENDER_EVENTS, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        newsEventObj = sharedService.getService('price').socialMediaDS.getNewsEvent(type);

                        newsEventObj.setData({
                            id: dtArray[newsHedIdxList.ID],
                            title: dtArray[newsHedIdxList.TITLE],
                            url: dtArray[newsHedIdxList.URL],
                            date: dtArray[newsHedIdxList.DATE]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing calender events  response : ' + e);
        }
    };

    var processYoutubeEventsResponse = function (dataObj, callbackFn) {
        try {
            if (dataObj && dataObj.items) {
                var postObj, rawDate, date, time;
                var socialMediaDS = sharedService.getService('price').socialMediaDS;

                if (dataObj.nextPageToken) {
                    socialMediaDS.setYoutubeNextPageUrl(dataObj.nextPageToken);
                }

                Ember.$.each(dataObj.items, function (index) {
                    postObj = socialMediaDS.getYoutubePost();
                    rawDate = (dataObj.items[index].snippet.publishedAt).split('T');
                    date = rawDate[0];
                    time = rawDate[1].split('.')[0];

                    postObj.setData({
                        videoId: dataObj.items[index].id.videoId,
                        imgUrl: dataObj.items[index].snippet.thumbnails.medium.url,
                        date: date + ' ' + time,
                        description: dataObj.items[index].snippet.title
                    });
                });

                if (callbackFn) {
                    callbackFn();
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing youtube events  response : ' + e);
        }
    };

    var processInstagramEventsResponse = function (data) {
        try {
            var dataObj = JSON.parse(data);

            if (dataObj && dataObj.data) {
                var postObj, date, showDate;

                Ember.$.each(dataObj.data, function (index) {
                    postObj = sharedService.getService('price').socialMediaDS.getInstagramPost();
                    date = new Date(parseInt(dataObj.data[index].caption.created_time, 10) * 1000);
                    showDate = utils.formatters.formatDateToDisplayDate(date, false, '-', ':', ' ');

                    postObj.setData({
                        id: dataObj.data[index].id,
                        imgUrl: dataObj.data[index].images.standard_resolution.url,
                        postUrl: dataObj.data[index].link,
                        date: showDate,
                        description: dataObj.data[index].caption.text
                    });
                });
            }
        } catch (e) {
            utils.logger.logError('Error in processing Instagram response : ' + e);
        }
    };

    var processFacebookEventsResponse = function (dataObj, nextPageUrl, callbackFn) {
        try {
            var dataContainer;

            if (nextPageUrl) {
                dataContainer = dataObj;
            } else {
                dataContainer = dataObj.posts;
            }

            if (dataObj && dataContainer) {
                var postObj, rawDate, date, time;
                var socialMediaDS = sharedService.getService('price').socialMediaDS;

                if (dataContainer.paging.next) {
                    socialMediaDS.setFacebookNextPageUrl(dataContainer.paging.next);
                }

                Ember.$.each(dataContainer.data, function (index) {
                    postObj = socialMediaDS.getFacebookPost();
                    rawDate = (dataContainer.data[index].created_time).split('T');
                    date = rawDate[0];
                    time = rawDate[1].split('+')[0];

                    postObj.setData({
                        id: dataContainer.data[index].id,
                        imgUrl: dataContainer.data[index].picture,
                        postUrl: dataContainer.data[index].permalink_url,
                        date: date + ' ' + time,
                        description: dataContainer.data[index].message
                    });
                });

                if (callbackFn) {
                    callbackFn();
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing facebook events : ' + e);
        }
    };

    var processPressReleaseResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, type, pressEventObj, newsHedIdxList, headerFields;

                if (dataObj.DAT.PRESS_RELEASE_DATA) {
                    headerFields = ['TITLE', 'ID', 'URL', 'DATE'];
                    newsHedIdxList = _getHeaderIndexList(dataObj.HED.PRESS_RELEASE_DATA, headerFields);
                    type = 'PRESS_RELEASE';

                    Ember.$.each(dataObj.DAT.PRESS_RELEASE_DATA, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        pressEventObj = sharedService.getService('price').socialMediaDS.getPressRelease(type);

                        pressEventObj.setData({
                            id: dtArray[newsHedIdxList.ID],
                            title: dtArray[newsHedIdxList.TITLE],
                            url: dtArray[newsHedIdxList.URL],
                            date: dtArray[newsHedIdxList.DATE]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing press releases response : ' + e);
        }
    };

    var processExchangeSummaryResponse = function (dataObj, language) {
        if (dataObj && dataObj.DAT && dataObj.HED && dataObj.DAT.SRC) {
            try {
                var priceExgMeteData = language === sharedService.userSettings.currentLanguage ?
                    sharedService.getService('price').priceExchangeMeta : sharedService.getService('price').priceExchangeMeta.constructor.create();
                var exgMetaData = priceExgMeteData.getExgSummaryObj();

                exgMetaData.HED = dataObj.HED;
                exgMetaData.DAT = dataObj.DAT;

                var verHeader = ['EXCHANGE', 'VRS'];
                var verHedIdxList = _getHeaderIndexList(dataObj.HED.VRS, verHeader);

                Ember.$.each(dataObj.DAT.VRS, function (verIndex, verStr) {
                    var verArray = verStr.split(utils.Constants.StringConst.Pipe);
                    var exchangeCode = verArray[verHedIdxList.EXCHANGE];

                    exgMetaData.VRS[exchangeCode] = verArray[verHedIdxList.VRS];
                });

                priceExgMeteData.save(language);

                // Update data stores
                if (language === sharedService.userSettings.currentLanguage) {
                    var headerFields = ['EXCHANGE', 'DISP_CODE', 'SHRT_DSC', 'LONG_DSC', 'MAIN_IDX', 'MAIN_IDX_DSC', 'DEF_SUB_MKT', 'SUB_MKT_DSC'];
                    var symHedIdxList = _getHeaderIndexList(dataObj.HED.SRC, headerFields);

                    Ember.$.each(dataObj.DAT.SRC, function (exgIndex, exgStr) {
                        var dtArray = exgStr.split(utils.Constants.StringConst.Pipe);

                        var exchangeCode = dtArray[symHedIdxList.EXCHANGE];
                        var mainIndex = dtArray[symHedIdxList.MAIN_IDX];
                        var isDelayed = sharedService.getService('price').userDS.isExchangeDelayed(exchangeCode);

                        var exgObj = sharedService.getService('price').exchangeDS.getExchange(exchangeCode);
                        var stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, mainIndex, utils.AssetTypes.Indices);

                        exgObj.setData({
                            exg: exchangeCode,
                            de: isDelayed ? [dtArray[symHedIdxList.DISP_CODE], utils.Constants.Delayed].join(' ') : dtArray[symHedIdxList.DISP_CODE],
                            sDes: utils.formatters.convertUnicodeToNativeString(isDelayed ? [dtArray[symHedIdxList.SHRT_DSC], utils.Constants.Delayed].join(' ') : dtArray[symHedIdxList.SHRT_DSC]),
                            des: utils.formatters.convertUnicodeToNativeString(isDelayed ? [dtArray[symHedIdxList.LONG_DSC], utils.Constants.Delayed].join(' ') : dtArray[symHedIdxList.LONG_DSC])
                        });

                        if (!exgObj.get('mainIdx')) {
                            exgObj.setData({
                                mainIdx: dtArray[symHedIdxList.MAIN_IDX]
                            });
                        }

                        stockObj.setData({
                            sym: mainIndex,
                            sDes: utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.MAIN_IDX_DSC])
                        });

                        // Gives priority to default sub market configured in application (price-constants)
                        // This is to avoid data issues from backend and gives correct output to users
                        // If default sub market is not configured in application, it will get from backend response
                        var defSubMkt = appConfig.customisation.defaultSubMarket[exchangeCode];
                        defSubMkt = defSubMkt ? defSubMkt : dtArray[symHedIdxList.DEF_SUB_MKT];

                        var subMktData = utils.formatters.convertUnicodeToNativeString(dtArray[symHedIdxList.SUB_MKT_DSC]); // B-Bonds,E-Equities,M-Mutual Funds

                        // Server returns only the separator if no sub markets available for the market
                        // Therefore checking the length to distinguish single sub market, multiple sub markets and no sub markets
                        if (subMktData.length > 1) {
                            var subMktItems = subMktData.split(utils.Constants.StringConst.Comma);

                            var allowedSubMktsByExg = _getAllowedSubMktsByExchange(exchangeCode);

                            // If only one sub market available, considers as sub markets not available
                            // Symbols are not tagged to the sub market in this scenario
                            // Therefore symbols are not loaded in application widgets

                            // Commented 'if' block to fixed issue occur in KSE setup
                            // Issue : Sending MKT code as "-1"

                            // if (subMktItems.length > 1) {
                                try {
                                    Ember.$.each(subMktItems, function (key, val) {
                                        var subMktArray = val.split(/-(.+)?/); // Split by first occurrence of '-'; eg: 2-Nomu-Parallel Market

                                        if (allowedSubMktsByExg.length === 0 || allowedSubMktsByExg.contains(subMktArray[0])) {
                                            var subMktObj = sharedService.getService('price').subMarketDS.getSubMarket(exchangeCode, subMktArray[0]);

                                            subMktObj.setData({
                                                marketId: subMktArray[0],
                                                lDes: subMktArray[1],
                                                def: subMktArray[0] === defSubMkt ? '1' : '0'
                                            });
                                        }
                                    });
                                } catch (e) {
                                    utils.logger.logDebug('Sub market processing failed : ' + e);
                                }
                            // }
                        }

                        // This will set sub market array with zero items if market does not have sub markets
                        // Market data subscription is being sent based on this logic
                        // Therefore it is required not to have sub market array undefined
                        if (!exgObj.get('subMarketArray')) {
                            exgObj.set('subMarketArray', sharedService.getService('price').subMarketDS.getSubMarketCollectionByExchange(exchangeCode));
                        }
                    });
                }
            } catch (e) {
                utils.logger.logError('Error in processing exchange, stock and sub market response : ' + e);
            }

            sharedService.getService('price').onPriceExchangeSummaryMetaReady();
        }
    };

    var processFairValueHistoricalPriceResponse = function (dataObj) {
        try {
            if (dataObj && dataObj.DAT && dataObj.HED) {
                // Update data stores
                var headerFields = ['SYMBOL', 'EXCHANGE', 'LANGUAGE_CODE', 'TICKER_SERIAL', 'COMPANY_ID', 'FAIR_VALUE', 'ACTUAL_VALUE', 'FV_DATE', 'FV_SOURCE_NAME', 'DOC_ID', 'FV_RATING_ID', 'FV_RATING_NAME', 'INDIVIDUAL_ID_LIST', 'FV_RATING_SCORE', 'REPORT_DATE', 'ADJUSTED_FAIR_VALUE'];
                var fvHedIdxList = _getHeaderIndexList(dataObj.HED.CDS.FRVL, headerFields);

                Ember.$.each(dataObj.DAT.CDS.FRVL, function (fvIndex, fvStr) {
                    var dtArray = fvStr.split(utils.Constants.StringConst.Pipe);

                    var symbolCode = dtArray[fvHedIdxList.SYMBOL];
                    var exchangeCode = dtArray[fvHedIdxList.EXCHANGE];
                    var companyId = dtArray[fvHedIdxList.COMPANY_ID];

                    var fvObj = sharedService.getService('price').fairValueDS.getFairValue(exchangeCode, symbolCode, companyId);

                    if (fvObj) {
                        fvObj.setData({
                            fv: parseFloat(dtArray[fvHedIdxList.FAIR_VALUE]),
                            av: parseFloat(dtArray[fvHedIdxList.ACTUAL_VALUE]),
                            date: dtArray[fvHedIdxList.FV_DATE],
                            source: utils.formatters.convertUnicodeToNativeString(dtArray[fvHedIdxList.FV_SOURCE_NAME]),
                            docId: dtArray[fvHedIdxList.DOC_ID],
                            ratingId: dtArray[fvHedIdxList.FV_RATING_ID],
                            ratingName: utils.formatters.convertUnicodeToNativeString(dtArray[fvHedIdxList.FV_RATING_NAME]),
                            individualIdList: dtArray[fvHedIdxList.INDIVIDUAL_ID_LIST],
                            ratingScore: parseInt(dtArray[fvHedIdxList.FV_RATING_SCORE], 10),
                            reportDate: dtArray[fvHedIdxList.REPORT_DATE],
                            adjustedFv: parseFloat(dtArray[fvHedIdxList.ADJUSTED_FAIR_VALUE]),
                            lnCode: dtArray[fvHedIdxList.LANGUAGE_CODE],
                            ticketSerial: dtArray[fvHedIdxList.TICKER_SERIAL]
                        });
                    }
                });
            }
        } catch (e) {
            utils.logger.logError('Error in processing fair value historical price response : ' + e);
        }
    };

    var processFairValueReportResponse = function (dataObj) {
        try {
            if (dataObj && dataObj.DAT && dataObj.HED) {
                var headerField = ['FILE_GUID'];
                var fvHedIdxList = _getHeaderIndexList(dataObj.HED.DS.FILE, headerField);
                var dtArray = dataObj.DAT.DS.FILE[0].split(utils.Constants.StringConst.Pipe);

                return dtArray[fvHedIdxList.FILE_GUID];
            }
        } catch (e) {
            utils.logger.logError('Error in processing fair value report response : ' + e);
        }
    };

    var processCorporateActionResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var corporateActionArray = [];

                if (dataObj.DAT.CDS.CPAC) {
                    var headerFields = ['EXCHANGE', 'SYMBOL', 'CURRENCY', 'ANNOUNCE_DATE', 'EFFECTIVE_DATE',
                        'COMPLETION_DATE', 'DIVIDEND_AMOUNT', 'CORP_ACT_TYPE', 'ACTION_TYPE_NAME', 'SPLIT_FACTOR',
                        'ACTION_ID'];
                    var symHedIdxList = _getHeaderIndexList(dataObj.HED.CDS.CPAC, headerFields);

                    Ember.$.each(dataObj.DAT.CDS.CPAC, function (key, val) {
                        var dtArray = val.split(utils.Constants.StringConst.Pipe);
                        var actionId = dtArray[symHedIdxList.ACTION_ID];
                        var symbolCode = dtArray[symHedIdxList.SYMBOL];
                        var corporateActObj = sharedService.getService('price').corporateActionDS.getCorporateAction(actionId);
                        var exDividendDateObj = utils.formatters.convertStringToDate(dtArray[symHedIdxList.EFFECTIVE_DATE]);

                        corporateActObj.setData({
                            sym: symbolCode,
                            exDividendDateObj: exDividendDateObj,
                            chg: dtArray[symHedIdxList.EXCHANGE],
                            annDate: dtArray[symHedIdxList.ANNOUNCE_DATE],
                            exdvDate: dtArray[symHedIdxList.EFFECTIVE_DATE],
                            pmntDate: dtArray[symHedIdxList.COMPLETION_DATE],
                            curr: dtArray[symHedIdxList.CURRENCY],
                            dividendAmount: dtArray[symHedIdxList.DIVIDEND_AMOUNT],
                            actionType: dtArray[symHedIdxList.CORP_ACT_TYPE],
                            actionNameUni: dtArray[symHedIdxList.ACTION_TYPE_NAME],
                            spltFctr: dtArray[symHedIdxList.SPLIT_FACTOR]
                        });

                        corporateActionArray[corporateActionArray.length] = corporateActObj;
                    });
                }

                return corporateActionArray;
            }
        } catch (e) {
            utils.logger.logError('Error in processing CorporateAction response : ' + e);
        }
    };

    var processVolumeWatcherResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dtArray, symbolCode, exchangeCode, instrumentType, stockObj, symHedIdxList, headerFields;

                if (dataObj.DAT.VW) {

                    headerFields = ['E', 'INS', 'S', 'SDES', 'LTP', 'PCHG', 'VOL', 'AV5D', 'AV7D', 'AV30D', 'AV90D', 'PAV5D', 'PAV7D', 'PAV30D', 'PAV90D'];
                    symHedIdxList = _getHeaderIndexList(dataObj.HED.VW, headerFields);

                    Ember.$.each(dataObj.DAT.VW, function (key, val) {
                        dtArray = val.split(utils.Constants.StringConst.Pipe);
                        symbolCode = dtArray[symHedIdxList.S];
                        exchangeCode = dtArray[symHedIdxList.E];
                        instrumentType = parseInt(dtArray[symHedIdxList.INS], 10);
                        stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode, instrumentType);

                        stockObj.setData({
                            av5d: parseFloat(dtArray[symHedIdxList.AV5D])
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing Volume Watcher response : ' + e);
        }
    };

    var processOptionChainResponse = function (dataObj, paramExg, paramSym, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                if (dataObj.DAT.OL && dataObj.HED.OL) {
                    var listHedFields = ['E', 'S', 'OPM', 'OPE', 'OW'];
                    var listHedIdxList = _getHeaderIndexList(dataObj.HED.WOL, listHedFields);
                    var periods = dataObj.DAT.WOL ? dataObj.DAT.OL.concat(dataObj.DAT.WOL) : dataObj.DAT.OL;

                    Ember.$.each(periods, function (key, val) {
                        var dataArray = val.split(utils.Constants.StringConst.Pipe);

                        var trdExchange = dataArray[listHedIdxList.E];
                        var baseSymbol = dataArray[listHedIdxList.S];
                        var optPeriod = dataArray[listHedIdxList.OPM];

                        var optPeriodObj = sharedService.getService('price').optionPeriodDS.getOptionPeriod(trdExchange, baseSymbol, optPeriod);

                        optPeriodObj.setData({
                            optExg: dataArray[listHedIdxList.OPE],
                            optWeek: dataArray[listHedIdxList.OW]
                        });
                    });
                }

                _processOptionSymbolList(dataObj, paramExg, paramSym, callbackFn, 'OS');
                _processOptionSymbolList(dataObj, paramExg, paramSym, callbackFn, 'WOS');
            }
        } catch (e) {
            utils.logger.logError('Error in processing option chain response : ' + e);
        }
    };

    var processOptionListResponse = function (dataObj, paramExg, paramSym, callbackFn, responseTag) {
        try {
            _processOptionSymbolList(dataObj, paramExg, paramSym, callbackFn, responseTag);
        } catch (e) {
            utils.logger.logError('Error in processing option chain response : ' + e);
        }
    };

    var processFinancialResponse = function (dataObj, exg, sym, secondSymAdded, primarySymbol, secondarySymbol, periodType, callbackFn) {
        var financialType = ['FR', 'MR', 'IS', 'BS', 'CF'];

        try {
            if (dataObj.DAT && dataObj.HED && dataObj.STYLE) {
                Ember.$.each(financialType, function (key, type) {
                    _addFinancialRatiosToCollection(dataObj, exg, sym, type, secondSymAdded, periodType);
                });

                if (secondSymAdded) {
                    sharedService.getService('price').financialDS.getCompareSymbolCollection(exg, primarySymbol, secondarySymbol, periodType);
                }

                if (callbackFn) {
                    callbackFn();
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing financials and ratios response : ' + e);
        }
    };

    //
    // Symbol Closing Price Requests
    //
    // TODO: [Champaka] need to be refactored
    var processClosingPriceResponse = function (dataObj, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var headerArray, exg, sym, priceObj;

                if (dataObj.DAT.SYM && dataObj.HED.SYM) {
                    Ember.$.each(dataObj.DAT.SYM, function (key, value) {
                        Ember.$.each(value.HIS, function (row, val) {
                            headerArray = value.S.split(utils.Constants.StringConst.Comma);
                            exg = headerArray[0];
                            sym = headerArray[1];

                            var date = new Date(val[0] * 1000).toISOString().slice(0, 10);

                            if (sym === 'ADI') {
                                if (value.HIS) {
                                    priceObj = sharedService.getService('price').portfolioDS.getClosePrice(exg, sym);
                                    priceObj.setData(value.HIS);

                                    priceObj.dateArray.pushObject(date);
                                }
                            } else {
                                sharedService.getService('price').portfolioDS.getSymClosePrice(exg, sym, date, val[1]);
                            }
                        });
                    });

                    if (callbackFn) {
                        callbackFn();
                    }
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing symbol close price response : ' + e);
        }
    };

    //
    // Book Shelf Requests
    //
    var processBookShelfResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var bookShelfObj, bookHedIdxList, bookArray, headerFields, bookId, bookCategory;

                if (dataObj.DAT.BOOK_SHELF_DATA) {
                    headerFields = ['TITLE', 'ID', 'URL', 'DATE', 'CATEGORY', 'IMG'];
                    bookHedIdxList = _getHeaderIndexList(dataObj.HED.BOOK_SHELF_DATA, headerFields);

                    Ember.$.each(dataObj.DAT.BOOK_SHELF_DATA, function (key, val) {
                        bookArray = val.split(utils.Constants.StringConst.Pipe);
                        bookId = bookArray[bookHedIdxList.ID];
                        bookCategory = bookArray[bookHedIdxList.CATEGORY];

                        bookShelfObj = sharedService.getService('price').bookShelfDS.getBookShelf(bookId, bookCategory);

                        bookShelfObj.setData({
                            id: bookArray[bookHedIdxList.ID],
                            title: bookArray[bookHedIdxList.TITLE],
                            url: bookArray[bookHedIdxList.URL],
                            date: bookArray[bookHedIdxList.DATE],
                            category: bookArray[bookHedIdxList.CATEGORY],
                            img: bookArray[bookHedIdxList.IMG]
                        });
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing book shelf response : ' + e);
        }
    };

    //
    // User Registration Response
    //
    var processUserRegistrationResponse = function (dataObj) {
        try {
            if (dataObj) {
                var registrationObj = sharedService.getService('price').registrationDS.getRegistration();

                if (registrationObj) {
                    Ember.set(registrationObj, 'regDetailSts', dataObj.ERRORCODE);
                    Ember.set(registrationObj, 'regDetailStsMsg', dataObj.ERRORDES);
                }
            }
        } catch (e) {
            utils.logger.logError('Error in User Registration response : ' + e);
        }
    };

    var onError = function (error) {
        utils.logger.logError('Error while MIX request/response handling: ' + error);
    };

    //
    // Private functions
    //
    var _processOptionSymbolList = function (dataObj, paramExg, paramSym, callbackFn, responseTag) {
        if (dataObj.DAT && dataObj.HED) {
            if (dataObj.DAT[responseTag] && dataObj.HED[responseTag]) {
                var entityList = [];
                var symHedFields = ['E', 'S', 'OPM', 'OPE', 'SP', 'CS', 'PS', 'NMON', 'OW'];
                var symHedIdxList = _getHeaderIndexList(dataObj.HED[responseTag], symHedFields);

                Ember.$.each(dataObj.DAT[responseTag], function (key, val) {
                    var dataArray = val.split(utils.Constants.StringConst.Pipe);

                    entityList[entityList.length] = {
                        sym: dataArray[symHedIdxList.S],
                        exg: dataArray[symHedIdxList.E],
                        optPrd: dataArray[symHedIdxList.OPM],
                        strkPrc: dataArray[symHedIdxList.SP],
                        nearMon: dataArray[symHedIdxList.NMON],
                        optWeek: dataArray[symHedIdxList.OW],
                        cSym: dataArray[symHedIdxList.CS],
                        pSym: dataArray[symHedIdxList.PS],
                        optExg: dataArray[symHedIdxList.OPE]
                    };
                });

                sharedService.getService('price').optionStockDS.setOptionStockEntityList(entityList);
            }

            var defaultPeriod = sharedService.getService('price').optionStockDS.getDefaultOptionPeriod(paramExg, paramSym);
            callbackFn(defaultPeriod);
        }
    };

    var _getHeaderIndexList = function (headerObj, headerFields) {
        return headerObj ? headerObj.split(utils.Constants.StringConst.Pipe).indicesOf(headerFields) : undefined;
    };

    var _setLastTrade = function (lastTrade, tradeObj) {
        var lastTradeObj = lastTrade;

        if (!lastTradeObj) {
            lastTradeObj = tradeObj;
        }

        if (lastTradeObj.seq >= tradeObj.seq) {
            lastTradeObj = tradeObj;
        }

        return lastTradeObj;
    };

    var _updateExchangeMetadata = function (property, dataObj, exchangeCode, metaData) {
        metaData[exchangeCode].DAT.SRC[property] = dataObj.DAT.SRC[property];
        metaData[exchangeCode].HED.SRC[property] = dataObj.HED.SRC[property];
    };

    var _formatTimeZoneOffset = function (offset) {
        // offset ex: 5, 5.0, 5.00, 5.5, 5.50, 5.3, 5.30
        var offsetFormatted = 0;

        if (utils.validators.isAvailable(offset)) {
            if (offset.indexOf(utils.Constants.StringConst.Dot) >= 0) {
                var offsetArray = offset.split(utils.Constants.StringConst.Dot);

                if (offsetArray.length === 2) {
                    var hourPart = parseInt(offsetArray[0], 10);
                    var minuteString = offsetArray[1];
                    var divider = (minuteString === '3' || minuteString === '30') ? 6 : 10; // ex: 30/60, 3/6, 50/100, 5/10, 0/10 or 00/100

                    divider = divider * Math.pow(10, minuteString.length - 1);
                    offsetFormatted = hourPart + (parseInt(minuteString, 10) / divider);
                }
            } else {
                offsetFormatted = parseInt(offset, 10); // ex: 5
            }
        }

        return offsetFormatted;
    };

    var _addNewsAnnToCollection = function (idList, id, annCollection, annObj) {
        var currentIndex = idList.indexOf(id);

        if (currentIndex >= 0) {
            annCollection[currentIndex] = annObj;
        } else {
            annCollection.pushObject(annObj);
            idList[idList.length] = id;
        }
    };

    var _addFinancialRatiosToCollection = function (dataObj, exg, sym, statement, secondSymAdded, periodType) {
        var headerList, financialHeaders, finHedIdxList, dtArray, styleArray, styleList, styleHeader, financialObj, year, quater;

        if (dataObj.DAT.COMPFIN.QTR[statement]) {
            headerList = dataObj.HED.COMPFIN.QTR[statement];
            financialHeaders = headerList.split(utils.Constants.StringConst.Pipe);
            styleArray = dataObj.STYLE.COMPFIN.QTR[statement].split(utils.Constants.StringConst.Pipe);
            finHedIdxList = _getHeaderIndexList(headerList, financialHeaders);

            Ember.$.each(dataObj.DAT.COMPFIN.QTR[statement], function (key, val) {
                dtArray = val.split(utils.Constants.StringConst.Pipe);
                year = dtArray[finHedIdxList.DUR_YEAR];
                quater = dtArray[finHedIdxList.QUARTER_REQUESTED];

                Ember.$.each(finHedIdxList, function (header, headerValue) {
                    var periodKey = [year, quater].join('-');
                    var styleKey = finHedIdxList[header];
                    var comma = utils.Constants.StringConst.Comma;

                    styleHeader = styleArray[styleKey];

                    if (styleHeader && styleHeader.indexOf(comma)) {
                        var commaIndex = styleHeader.indexOf(comma);
                        styleList = [styleHeader.substring(0, commaIndex), styleHeader.substring(commaIndex + 1)];
                    }

                    if (styleList && styleList.length > 1 && styleList[0] !== '0') {
                        if (statement === 'MR') {
                            financialObj = sharedService.getService('price').financialDS.getFinancial(exg, sym, 'FR', header, secondSymAdded, periodType);
                        } else {
                            financialObj = sharedService.getService('price').financialDS.getFinancial(exg, sym, statement, header, secondSymAdded, periodType);
                        }

                        financialObj.setData({
                            name: header,
                            [periodKey]: dtArray[headerValue] || sharedService.userSettings.displayFormat.noValue,
                            indent: styleList[0],
                            description: styleList[1]
                        });

                        financialObj.keyArray.pushObject(periodKey);
                        financialObj.valueArray.pushObject(dtArray[headerValue]);
                    }
                });
            });
        }
    };

    var _getAllowedSubMktsByExchange = function (exchangeCode) {
        var allowedSubMarkets = appConfig.customisation.allowedSubMarkets;
        var allowedSubMktsByExg = [];

        if (allowedSubMarkets && allowedSubMarkets[exchangeCode]) {
            allowedSubMktsByExg = allowedSubMarkets[exchangeCode];
        }

        return allowedSubMktsByExg;
    };

    var processLoginIndexPanelResponse = function (dataObj, callBackFunc) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var dataArray, indexPanelHedIdxList, exchange, headerFields, symbol, lastTradePrice, change, pChange;

                if (dataObj.DAT.SS) {
                    headerFields = ['E', 'S', 'LTP', 'CHG', 'PCHG'];
                    indexPanelHedIdxList = _getHeaderIndexList(dataObj.HED.SS, headerFields);
                    dataArray = dataObj.DAT.SS[0].split(utils.Constants.StringConst.Pipe);

                    exchange = dataArray[indexPanelHedIdxList.E];
                    symbol = dataArray[indexPanelHedIdxList.S];
                    lastTradePrice = dataArray[indexPanelHedIdxList.LTP];
                    change = dataArray[indexPanelHedIdxList.CHG];
                    pChange = dataArray[indexPanelHedIdxList.PCHG];

                    var indexData = {
                        exg: exchange,
                        sym: symbol,
                        ltd: lastTradePrice,
                        chg: change,
                        pchg: pChange
                    };

                    var indexObj = sharedService.getService('price').stockDS.getStock(indexData.exg, indexData.sym, utils.AssetTypes.Indices);

                    if (indexObj !== null) {
                        indexObj.setData(indexData);
                    }

                    callBackFunc(indexData);
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing index panel data response : ' + e);
        }
    };

    var processInvestmentIdResponse = function (dataObj, exchange, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var investorId, investorsObj, investorsHedIdxList, investorsArray, headerFields;

                if (dataObj.DAT.INVESTORS && dataObj.DAT.INVESTORS.length > 0) {
                    headerFields = ['NIN', 'TYPE', 'ID'];
                    investorsHedIdxList = _getHeaderIndexList(dataObj.HED.INVESTORS, headerFields);

                    Ember.$.each(dataObj.DAT.INVESTORS, function (key, val) {
                        investorsArray = val.split(utils.Constants.StringConst.Pipe);
                        investorId = investorsArray[investorsHedIdxList.ID];
                        investorsObj = sharedService.getService('price').investorsDS.getInvestors(exchange, investorId);

                        investorsObj.setData({
                            investId: investorsArray[investorsHedIdxList.ID],
                            investKey: investorsArray[investorsHedIdxList.NIN],
                            type: investorsArray[investorsHedIdxList.TYPE]
                        });
                    });
                }

                if (callbackFn) {
                    callbackFn();
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing investors response : ' + e);
        }
    };

    var processInvestorPortfolioResponse = function (dataObj, investId, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var symbol, investorsObj, portfolioHedIdxList, portfolioArray, headerFields;

                if (dataObj.DAT.INVESTORS_PORTFOLIO) {
                    headerFields = ['SYM', 'NOFS', 'MV', 'AC', 'CV', 'ENGNA', 'ARBNA', 'DSYM', 'BROENG', 'BROARB', 'BID', 'GLP', 'GL'];
                    portfolioHedIdxList = _getHeaderIndexList(dataObj.HED.INVESTORS_PORTFOLIO, headerFields);

                    Ember.$.each(dataObj.DAT.INVESTORS_PORTFOLIO, function (key, val) {
                        portfolioArray = val.split(utils.Constants.StringConst.Pipe);
                        symbol = portfolioArray[portfolioHedIdxList.SYM];
                        investorsObj = sharedService.getService('price').investorsDS.getPortfolio(investId, symbol);

                        investorsObj.setData({
                            noOfShares: portfolioArray[portfolioHedIdxList.NOFS],
                            marketValue: portfolioArray[portfolioHedIdxList.MV],
                            avgCost: portfolioArray[portfolioHedIdxList.AC],
                            engName: portfolioArray[portfolioHedIdxList.ENGNA],
                            arName: portfolioArray[portfolioHedIdxList.ARBNA],
                            costValue: portfolioArray[portfolioHedIdxList.CV],
                            dSym: portfolioArray[portfolioHedIdxList.DSYM],
                            broker: portfolioArray[portfolioHedIdxList.BROENG],
                            company: portfolioArray[portfolioHedIdxList.BROENG],
                            brokerArb: portfolioArray[portfolioHedIdxList.BROARB],
                            brokerId: portfolioArray[portfolioHedIdxList.BID],
                            gainLossPerc: portfolioArray[portfolioHedIdxList.GLP],
                            gainLoss: portfolioArray[portfolioHedIdxList.GL]
                        });
                    });
                }

                if (callbackFn) {
                    callbackFn();
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing investor profile response : ' + e);
        }
    };

    var processCDVAndYTDPUrlResponse = function (dataObj, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var exchange, symbol, stockObj, CDVHedIdxList, CDVArray, headerFields;

                if (dataObj.DAT.SS) {
                    headerFields = ['E', 'INS', 'S', 'LTP', 'PCP', 'CHG', 'PCHG', 'BBP', 'BBQ', 'BAP', 'BAQ', 'VOL', 'NOT', 'HIG', 'LOW', 'REFP', 'MIN', 'MAX', 'TDO', 'CIT', 'COT', 'TBQ', 'TAQ', 'MCAP', 'EPS', 'PS', 'AV5D', 'AV7D', 'LTQ', 'LTT', 'LTD', 'PER', 'TRT', 'TDC', 'VWAP', 'LTDP', 'OPI', 'SST', 'LSCT', 'SHRST', 'TOP', 'TOV', 'TCP', 'TCV', 'CVWAP', 'TWAP', 'ADJINVAL', 'YTDP'];
                    CDVHedIdxList = _getHeaderIndexList(dataObj.HED.SS, headerFields);

                    Ember.$.each(dataObj.DAT.SS, function (key, val) {
                        CDVArray = val.split(utils.Constants.StringConst.Pipe);
                        exchange = CDVArray[CDVHedIdxList.E];
                        symbol = CDVArray[CDVHedIdxList.S];
                        stockObj = sharedService.getService('price').stockDS.getStock(exchange, symbol);

                        stockObj.setData({
                            cdv: CDVArray[CDVHedIdxList.VOL],
                            ytdp: CDVArray[CDVHedIdxList.YTDP]
                        });
                    });
                }
            }

            if (callbackFn) {
                callbackFn();
            }
        } catch (e) {
            utils.logger.logError('Error in processing Current Daily Volume and Beta response : ' + e);
        }
    };

    var processBetaResponse = function (dataObj, callbackFn) {
        try {
            if (dataObj.DAT && dataObj.HED && dataObj.DAT.COMP) {
                var exchange, symbol, stockObj, betaHedIdxList, betaArray, headerFields;

                if (dataObj.DAT.COMP[0]) {
                    headerFields = ['E', 'INS', 'S', 'HD52', 'LD52', 'YTDP', 'AT7D', 'AT30D', 'AV7D', 'AV30D', 'H52', 'L52', 'MCAP', 'PER', 'EPS', 'OSS', 'BT', 'MA50D', 'MA200D', 'CFR7', 'LTP', 'AV5D', 'AT5D'];
                    betaHedIdxList = _getHeaderIndexList(dataObj.HED.COMP, headerFields);

                    betaArray = (dataObj.DAT.COMP[0]).split(utils.Constants.StringConst.Pipe);
                    exchange = betaArray[betaHedIdxList.E];
                    symbol = betaArray[betaHedIdxList.S];
                    stockObj = sharedService.getService('price').stockDS.getStock(exchange, symbol);

                    stockObj.setData({
                        beta: betaArray[betaHedIdxList.BT]
                    });
                }
            }

            if (callbackFn) {
                callbackFn();
            }
        } catch (e) {
            utils.logger.logError('Error in processing Beta response : ' + e);
        }
    };

    var processFundamentalScoreResponse = function (dataObj) {
        try {
            if (dataObj.DAT && dataObj.HED) {
                var exchangeCode = dataObj.DAT.E;

                if (dataObj.DAT.SYM) {
                    Ember.$.each(dataObj.DAT.SYM, function (key, val) {
                        var scoreArray = val.HIS;
                        var symbolCode = val.S;
                        var stockObj = sharedService.getService('price').stockDS.getStock(exchangeCode, symbolCode);

                        if (stockObj && scoreArray.length > 1) {
                            stockObj.setData({
                                fs1d: scoreArray[0][1],
                                fs2d: scoreArray[1][1]
                            });
                        }
                    });
                }
            }
        } catch (e) {
            utils.logger.logError('Error in processing Fundamental Score response : ' + e);
        }
    };

    var processTechnicalScoreResponse = function (dtObj, chartCategory, reqSuccessFn, reqFailureFn) {
        try {
            if (dtObj.DAT && dtObj.HED && dtObj.HED.HIS) {
                var signalsList = priceWidgetConfig.techScore.techScoreConfig.signals;
                var symHedIdxList = dtObj.HED.S.split(utils.Constants.StringConst.Comma).indicesOf(['E', 'S']);
                var symInfo = dtObj.DAT.S.split(utils.Constants.StringConst.Comma);
                var priceService = sharedService.getService('price');
                var sym = symInfo[symHedIdxList.S];
                var exg = symInfo[symHedIdxList.E];
                var signalObj, dataIdxList, pt, date;

                dataIdxList = dtObj.HED.HIS.split(utils.Constants.StringConst.Comma).indicesOf(
                    ['DT', 'TECH_SCORE', 'SIG_BB', 'SIG_MACD', 'SIG_WILLR', 'SIG_CHKNMF', 'SIG_PXROC', 'SIG_PABSAR', 'SIG_CHKOSC', 'SIG_CHNOSC', 'SIG_CMDOCH', 'SIG_DEMA', 'SIG_RSI', 'SIG_FASTO', 'SIG_IMNTM', 'SIG_MOMNT', 'SIG_MF', 'SIG_MVAVG', 'SIG_PXOSC', 'SIG_QSTIC', 'SIG_RLTMNT', 'SIG_RLTSTR', 'SIG_RLTVOL', 'SIG_SLSTO', 'SIG_SMTNM', 'SIG_TEMA', 'SIG_TRIX', 'SIG_VOLOSC', 'TS_BB', 'TS_MACD', 'TS_WILLR', 'TS_CHKNMF', 'TS_PXROC', 'TS_PABSAR', 'TS_CHKOSC', 'TS_CHNOSC', 'TS_CMDOCH', 'TS_DEMA', 'TS_RSI', 'TS_FASTO', 'TS_IMNTM', 'TS_MOMNT', 'TS_MF', 'TS_MVAVG', 'TS_PXOSC', 'TS_QSTIC', 'TS_RLTMNT', 'TS_RLTSTR', 'TS_RLTVOL', 'TS_SLSTO', 'TS_SMTNM', 'TS_TEMA', 'TS_TRIX', 'TS_VOLOSC']
                );

                var techScoreSeriesObj = priceService.technicalScoreDS.getTechnicalScoreSeries(exg, sym, chartCategory);
                var techScoreObj = priceService.technicalScoreDS.getTechnicalScore(exg, sym);

                // If data is already available, flush them.
                // Note: Flushing and re-generating the array is efficient than search and insertion the missing points
                if (techScoreSeriesObj.dataPoints.length > 0) {
                    techScoreSeriesObj.dataPoints.length = 0;
                }

                // Load exchange object for obtaining the timezone
                var exgObj = priceService.exchangeDS.getExchange(exg);

                Ember.$.each(dtObj.DAT.HIS, function (key, val) {
                    pt = parseInt(val[dataIdxList.DT], 10) * PriceConstants.UnixTimestampByMilliSeconds;
                    date = utils.formatters.convertToUTCDate(pt, exgObj.tzo);

                    techScoreSeriesObj.dataPoints.pushObject({
                        DT: date,
                        techScore: val[dataIdxList.TECH_SCORE]
                    });

                    if (!techScoreObj.date || date > techScoreObj.date) {
                        Ember.set(techScoreObj, 'score', val[dataIdxList.TECH_SCORE]);
                        Ember.set(techScoreObj, 'date', date);
                    }

                    signalsList.forEach(function (signalValue) {
                        var signal = PriceConstants.TechnicalScoreConstants[signalValue];
                        var signalInd = val[dataIdxList['SIG_' + signal]];

                        if (signalInd === 'B' || signalInd === 'S') {
                            signalObj = priceService.technicalScoreDS.getSignal(exg, sym, signal);

                            if (!signalObj.date || date > signal.date) {
                                Ember.set(signalObj, 'date', date.getTime());
                                Ember.set(signalObj, 'signal', val[dataIdxList['SIG_' + signal]]);
                                Ember.set(signalObj, 'score', parseFloat(val[dataIdxList['TS_' + signal]]));
                            }
                        }
                    });
                });

                if (Ember.$.isFunction(reqSuccessFn) && techScoreSeriesObj.dataPoints && techScoreSeriesObj.dataPoints.length > 0) {
                    reqSuccessFn();
                } else if (Ember.$.isFunction(reqFailureFn)) {
                    reqFailureFn();
                }

                sharedService.getService('price').technicalScoreDS.onChartDataReady(utils.keyGenerator.getKey(exg, sym));
            }
        } catch (e) {
            utils.logger.logError('Error in Technical score data response: ' + e);
        }
    };

    return {
        processExchangeMetadataResponse: processExchangeMetadataResponse, // RT = 306
        processSymbolValidationResponse: processSymbolValidationResponse,
        processSymbolSearchResponse: processSymbolSearchResponse,
        processChartResponse: processChartResponse,
        processAnnouncementBodyResponse: processAnnouncementBodyResponse,
        processAnnouncementSearchResponse: processAnnouncementSearchResponse,
        processNewsSearchResponse: processNewsSearchResponse,
        processNewsBodyResponse: processNewsBodyResponse,
        processCompanyProfileResponse: processCompanyProfileResponse,
        processTimeAndSalesBacklogResponse: processTimeAndSalesBacklogResponse,
        processCalenderEventsResponse: processCalenderEventsResponse,
        processYoutubeEventsResponse: processYoutubeEventsResponse,
        processInstagramEventsResponse: processInstagramEventsResponse,
        processFacebookEventsResponse: processFacebookEventsResponse,
        processPressReleaseResponse: processPressReleaseResponse,
        processDelayedPriceMeta: processDelayedPriceMeta,
        processExchangeSummaryResponse: processExchangeSummaryResponse, // RT = 308
        processGmsSummaryResponse: processGmsSummaryResponse,
        processSystemMetaDataResponse: processSystemMetaDataResponse, // RT = 301
        processAlertHistoryResponse: processAlertHistoryResponse,
        processFairValueHistoricalPriceResponse: processFairValueHistoricalPriceResponse,
        processFairValueReportResponse: processFairValueReportResponse,
        processCorporateActionResponse: processCorporateActionResponse,
        processVolumeWatcherResponse: processVolumeWatcherResponse,
        processTOPVChartResponse: processTOPVChartResponse,
        processOptionChainResponse: processOptionChainResponse,
        processOptionListResponse: processOptionListResponse,
        processExchangeSymbolResponse: processExchangeSymbolResponse, // RT = 303
        processLoginIndexPanelResponse: processLoginIndexPanelResponse,
        processFinancialResponse: processFinancialResponse,
        processClosingPriceResponse: processClosingPriceResponse,
        processBookShelfResponse: processBookShelfResponse,
        processUserRegistrationResponse: processUserRegistrationResponse,
        processInvestmentIdResponse: processInvestmentIdResponse,
        processInvestorPortfolioResponse: processInvestorPortfolioResponse,
        processCDVAndYTDPUrlResponse: processCDVAndYTDPUrlResponse,
        processBetaResponse: processBetaResponse,
        processFundamentalScoreResponse: processFundamentalScoreResponse,
        processTechnicalScoreResponse: processTechnicalScoreResponse,
        onError: onError
    };
})();