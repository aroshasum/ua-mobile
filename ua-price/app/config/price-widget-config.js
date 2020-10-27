export default {
    singleRowHeight: 40,

    watchList: {
        defaultColumnMapping: {
            menu: {id: 'menu', width: 25, name: 'menu', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-menu-hamburger', isColumnSortDisabled: true, type: 'buttonMenu', buttonFunction: 'popUpWidgetButtonMenu'},
            watch: {id: 'watch', width: 25, name: 'watch', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-eye-open', isColumnSortDisabled: true, type: 'buttonMenu', buttonFunction: 'addStocksFromMenu', buttonMenu: 'watchButton'},
            del: {id: 'del', width: 25, name: 'delete', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-trash', isColumnSortDisabled: true, type: 'button', buttonFunction: 'deleteSymbol'},
            sym: {id: 'dSym', width: 125, headerName: 'symbol', secondId: 'sDes', headerStyle: 'text-left-header', sortKeyword: 'sDes', type: 'dualText', isndicatorAvailable: true},
            exg: {id: 'de', width: 65, headerName: 'exchange', sortKeyword: 'exg', firstValueStyle: 'symbol-fore-color'},
            trend: {id: 'trend', width: 25, name: 'trend', headerName: '', thirdId: 'trend', sortKeyword: 'chg', type: 'upDown'},
            ltp: {id: 'ltp', width: 90, headerName: 'last', headerSecondName: 'lastQty', secondId: 'ltq', sortKeyword: 'ltp', dataType: 'float', type: 'dualArrow', firstValueStyle: 'highlight-fore-color bold', backgroundStyle: 'watchlist-cell-back-lastqty', isBlink: true, noOfSecValueDecimalPlaces: 0},
            chg: {id: 'chg', width: 70, headerName: 'change', headerSecondName: 'perChange', secondId: 'pctChg', sortKeyword: 'chg', positiveNegativeChange: true, type: 'dualChange', dataType: 'float'},
            bbp: {id: 'bbp', width: 70, headerName: 'bid', headerSecondName: 'bidQty', secondId: 'bbq', type: 'dual', sortKeyword: 'bbp', firstValueStyle: 'up-fore-color', secondValueStyle: 'green-dark', backgroundStyle: 'watchlist-cell-back-green', isBlink: true, dataType: 'float', noOfSecValueDecimalPlaces: 0},
            bap: {id: 'bap', width: 70, headerName: 'offer', headerSecondName: 'offerQty', secondId: 'baq', type: 'dual', firstValueStyle: 'down-fore-color', secondValueStyle: 'red-dark', backgroundStyle: 'watchlist-cell-back-red', sortKeyword: 'bap', isBlink: true, dataType: 'float', noOfSecValueDecimalPlaces: 0},
            l52: {id: 'l52', width: 100, headerName: 'fiftyTwoWkHL', secondId: 'h52', thirdId: 'ltp', type: 'dot', dataType: 'float'},
            vol: {id: 'vol', width: 85, headerName: 'volume', sortKeyword: 'vol', dataType: 'int', firstValueStyle: 'fore-color', isBlink: true, blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change'},
            tovr: {id: 'tovr', width: 90, headerName: 'turnover', sortKeyword: 'tovr', dataType: 'int', firstValueStyle: 'fore-color', isBlink: true, blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change'},
            trades: {id: 'trades', width: 70, headerName: 'trades', sortKeyword: 'trades', dataType: 'int', firstValueStyle: 'fore-color', isBlink: true, blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change'},
            prvCls: {id: 'prvCls', width: 90, headerName: 'preClosed', headerSecondName: 'open', secondId: 'open', type: 'dual', sortKeyword: 'prvCls', firstValueStyle: 'fore-color', dataType: 'float'},
            cit: {id: 'cit', width: 85, headerName: 'cashMap', secondId: 'cot', type: 'progress'},
            dltt: {id: 'dltt', width: 115, headerName: 'lastTradedTime', headerSecondName: 'lastTradedDate', secondId: 'ltd', type: 'dual', sortKeyword: 'dltt', firstValueStyle: 'fore-color', dataType: 'time'},
            high: {id: 'high', width: 70, headerName: 'high', headerSecondName: 'low', secondId: 'low', type: 'dual', sortKeyword: 'high', firstValueStyle: 'fore-color', dataType: 'float'},
            cvwap: {id: 'cvwap', width: 70, headerName: 'cvwap', headerSecondName: 'twap', secondId: 'twap', type: 'dual', sortKeyword: 'cvwap', firstValueStyle: 'fore-color', dataType: 'float'},
            max: {id: 'max', width: 70, headerName: 'max', headerSecondName: 'min', secondId: 'min', type: 'dual', sortKeyword: 'max', firstValueStyle: 'fore-color', dataType: 'float'}
        },

        classicColumnMapping: {
            menu: {id: 'menu', width: 25, headerCellView: 'Ember.ClassicHeaderCell', name: 'Menu', title: 'menuItem', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-menu-hamburger', isColumnSortDisabled: true, type: 'buttonMenu', buttonFunction: 'popUpWidgetButtonMenu', buttonMenu: 'mainContextMenu'},
            watch: {id: 'watch', width: 25, headerCellView: 'Ember.ClassicHeaderCell', name: 'Watch', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-eye-open', isColumnSortDisabled: true, type: 'buttonMenu', buttonFunction: 'addStocksFromMenu', buttonMenu: 'watchButton'},
            del: {id: 'del', width: 25, headerCellView: 'Ember.ClassicHeaderCell', name: 'Delete', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-trash', isColumnSortDisabled: true, type: 'button', buttonFunction: 'deleteSymbol'},
            sym: {id: 'dSym', width: 87, headerName: 'symbol', headerCellView: 'Ember.ClassicHeaderCell', headerStyle: 'text-left-header', sortKeyword: 'sym', cellStyle: 'fore-color text-left-header', type: 'dualText', isndicatorAvailable: true},  // width:94px for worst case scenario
            exg: {id: 'de', width: 70, headerName: 'exchange', headerCellView: 'Ember.ClassicHeaderCell', headerStyle: 'text-center', sortKeyword: 'exg', cellStyle: 'fore-color text-center', type: 'classicCell', firstValueStyle: 'bold'},
            lDes: {id: 'lDes', width: 105, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'description', headerStyle: 'text-left-header', sortKeyword: 'lDes', cellStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'bold'},
            sDes: {id: 'sDes', width: 105, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'sDescription', headerStyle: 'text-left-header', sortKeyword: 'sDes', cellStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'bold'},
            trend: {id: 'trend', width: 25, headerCellView: 'Ember.ClassicHeaderCell', name: 'trend', headerName: '', thirdId: 'trend', sortKeyword: 'chg', dataType: 'float', type: 'upDown'},
            ltp: {id: 'ltp', width: 85, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'last', sortKeyword: 'ltp', dataType: 'float', firstValueStyle: 'highlight-fore-color bold', backgroundStyle: 'watchlist-cell-back-lastqty', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, type: 'classicCell'},
            ltq: {id: 'ltq', width: 65, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'lastQty', sortKeyword: 'ltq', dataType: 'int', firstValueStyle: 'highlight-fore-color bold', type: 'classicCell'},
            chg: {id: 'chg', width: 50, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'change', sortKeyword: 'chg', positiveNegativeChange: true, type: 'changeCell', dataType: 'float'},
            pctChg: {id: 'pctChg', width: 75, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'perChange', sortKeyword: 'pctChg', positiveNegativeChange: true, type: 'changeCell', dataType: 'float'},
            bbp: {id: 'bbp', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'bid', type: 'classicCell', sortKeyword: 'bbp', firstValueStyle: 'up-fore-color bold', backgroundStyle: 'watchlist-cell-back-green', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'},
            bbq: {id: 'bbq', width: 75, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'bidQty', type: 'classicCell', sortKeyword: 'bbq', firstValueStyle: 'bold', backgroundStyle: 'watchlist-cell-back-green', dataType: 'float', noOfDecimalPlaces: 0},
            bap: {id: 'bap', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'offer', type: 'classicCell', firstValueStyle: 'down-fore-color bold', backgroundStyle: 'watchlist-cell-back-red', sortKeyword: 'bap', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'},
            baq: {id: 'baq', width: 75, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'offerQty', type: 'classicCell', firstValueStyle: 'bold', backgroundStyle: 'watchlist-cell-back-red', sortKeyword: 'baq', dataType: 'float', noOfDecimalPlaces: 0},
            l52: {id: 'l52', width: 75, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'fiftyTwoWkL', type: 'classicCell', sortKeyword: 'l52', firstValueStyle: 'fore-color bold', dataType: 'float'},
            h52: {id: 'h52', width: 75, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'fiftyTwoWkH', type: 'classicCell', sortKeyword: 'h52', firstValueStyle: 'fore-color bold', dataType: 'float'},
            vol: {id: 'vol', width: 80, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'volume', type: 'classicCell', sortKeyword: 'vol', firstValueStyle: 'fore-color bold', dataType: 'int', blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change', isBlink: true},
            tovr: {id: 'tovr', width: 90, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'turnover', type: 'classicCell', sortKeyword: 'tovr', firstValueStyle: 'fore-color bold', dataType: 'int', blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change', isBlink: true},
            trades: {id: 'trades', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'trades', type: 'classicCell', sortKeyword: 'trades', firstValueStyle: 'fore-color bold', dataType: 'int', blinkUpStyle: 'blink-font-style-change', blinkDownStyle: 'blink-font-style-change', isBlink: true},
            prvCls: {id: 'prvCls', width: 90, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'preClosed', type: 'classicCell', sortKeyword: 'prvCls', firstValueStyle: 'fore-color bold', dataType: 'float'},
            open: {id: 'open', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'open', type: 'classicCell', sortKeyword: 'open', firstValueStyle: 'fore-color bold', dataType: 'float'},
            cit: {id: 'cit', width: 80, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'cashMap', type: 'classicProgressCell', secondId: 'cot', sortKeyword: 'cit', dataType: 'float'},
            ltd: {id: 'ltd', width: 110, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'lastTradedDate', type: 'classicCell', sortKeyword: 'ltd', firstValueStyle: 'fore-color bold', dataType: 'date'},
            dltt: {id: 'dltt', width: 110, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'lastTradedTime', type: 'classicCell', sortKeyword: 'dltt', firstValueStyle: 'fore-color bold'},
            high: {id: 'high', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'high', type: 'classicCell', sortKeyword: 'high', firstValueStyle: 'fore-color bold', dataType: 'float'},
            low: {id: 'low', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'low', type: 'classicCell', sortKeyword: 'low', firstValueStyle: 'fore-color bold', dataType: 'float'},
            cvwap: {id: 'cvwap', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'cvwap', headerTitleName: 'cvwapDecs', type: 'classicCell', sortKeyword: 'cvwap', firstValueStyle: 'fore-color bold', dataType: 'float'},
            twap: {id: 'twap', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'twap', headerTitleName: 'twapDesc', type: 'classicCell', sortKeyword: 'twap', firstValueStyle: 'fore-color bold', dataType: 'float'},
            min: {id: 'min', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'min', type: 'classicCell', sortKeyword: 'min', firstValueStyle: 'fore-color bold', dataType: 'float'},
            max: {id: 'max', width: 60, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'max', type: 'classicCell', sortKeyword: 'max', firstValueStyle: 'fore-color bold', dataType: 'float'},
            intsV: {id: 'intsV', width: 95, headerCellView: 'Ember.ClassicHeaderCell', headerName: 'intrinsicValue', type: 'classicCell', sortKeyword: 'intsV', firstValueStyle: 'fore-color bold', dataType: 'float'}
        },

        quoteColumns: [
            {id: 'contextMenu', width: 15, name: 'contextMenu', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-chevron-right', isColumnSortDisabled: true, type: 'contextMenuMobile', buttonFunction: 'showOrderTicket'},
            {id: 'dSym', width: 80, headerCellView: 'Ember.MoreHeaderCell', headerName: 'symbol', headerSecondName: '', headerThirdName: 'description', secondId: 'lDes', thirdId: 'open', headerStyle: 'text-left-header', sortKeyword: 'sDes', type: 'expandedSymbolMobile', expandedWidthRatio: '0.5', defaultWidthRatio: 16 / 37, isndicatorAvailable: true},
            {id: 'ltp', width: 45, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'last', headerSecondName: '', headerThirdName: 'volume', secondId: 'vol', thirdId: 'low', sortKeyword: 'ltp', headerStyle: 'pad-s-r', dataType: 'float', firstValueStyle: 'fore-color bold', type: 'expandedLtpMobile', noOfSecValueDecimalPlaces: 0, expandedWidthRatio: '0.25', blinkUpStyle: 'up-back-color btn-txt-color', blinkDownStyle: 'down-back-color btn-txt-color', isBlink: true, defaultWidthRatio: 9 / 37},
            {id: 'pctChg', width: 60, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'perChange', headerSecondName: '', headerThirdName: 'change', headerStyle: 'pad-m-r', secondId: 'chg', thirdId: 'prvCls', sortKeyword: 'chg', positiveNegativeChange: true, type: 'expandedChgMobile', dataType: 'float', expandedWidthRatio: '0.25', defaultWidthRatio: 12 / 37}],

        defaultColumnIds: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'l52', 'vol', 'tovr', 'trades', 'prvCls', 'cit', 'dltt', 'high'],

        classicColumnIds: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'cit', 'h52', 'l52', 'prvCls', 'open', 'ltd', 'dltt', 'high', 'low'],

        moreColumnIds: ['trend', 'ltp', 'chg', 'bbp', 'bap', 'l52', 'vol', 'tovr', 'trades', 'prvCls', 'cit', 'dltt', 'high', 'cvwap', 'max'],

        classicMoreColumnIds: ['sDes', 'lDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'h52', 'l52', 'vol', 'tovr', 'trades', 'prvCls', 'open', 'cit', 'ltd', 'dltt', 'high', 'low', 'cvwap', 'twap', 'intsV', 'max', 'min'],

        customDefaultColumnIds: ['menu', 'sym', 'exg', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'l52', 'vol', 'tovr', 'trades', 'prvCls', 'cit', 'dltt', 'high'],

        customClassicColumnIds: ['menu', 'sym', 'sDes', 'exg', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'cit', 'h52', 'l52', 'prvCls', 'open', 'ltd', 'dltt', 'high', 'low'],

        indexTableColumnIds: ['sym', 'sDes', 'trend', 'ltp', 'chg', 'pctChg', 'high', 'low', 'vol', 'tovr', 'trades', 'h52', 'l52', 'prvCls', 'open'],

        classicAssetTypes: {
            0: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'h52', 'l52', 'prvCls', 'open', 'cit', 'ltd', 'dltt', 'high', 'low'],    // Equity
            75: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'prvCls', 'open', 'high', 'low'],    // Bonds (Fixed Income)
            68: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'high', 'low'],  // Options/Future
            86: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'high', 'low'],  // ETF (Mutual Funds)
            11: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'ltq', 'chg', 'pctChg', 'bbp', 'bbq', 'bap', 'baq', 'vol', 'tovr', 'trades', 'high', 'low'],  // Currency
            7: ['menu', 'sym', 'sDes', 'trend', 'ltp', 'chg', 'pctChg', 'high', 'low', 'vol', 'tovr', 'trades', 'h52', 'l52', 'prvCls', 'open']  // Index
        },

        assetTypes: {
            0: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'l52', 'vol', 'tovr', 'trades', 'prvCls', 'cit', 'dltt', 'high'],    // Equity
            75: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'vol', 'tovr', 'trades', 'prvCls', 'high'],    // Bonds (Fixed Income)
            68: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'vol', 'tovr', 'trades', 'high'],  // Options/Future
            86: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'vol', 'tovr', 'trades', 'high'],  // ETF (Mutual Funds)
            11: ['menu', 'sym', 'trend', 'ltp', 'chg', 'bbp', 'bap', 'vol', 'tovr', 'trades', 'high'],  // Currency
            7: ['menu', 'sym', 'trend', 'ltp', 'chg', 'high', 'vol', 'tovr', 'trades', 'l52', 'prvCls']  // Index
        },

        tableParams: {
            MinHeaderHeight: {standard: 36, classic: 26},
            RowHeight: {standard: 42, classic: 26},
            MaxTableWidth: 5700
        }
    },

    indices: {
        columns: [
            {id: 'dSym', width: 80, headerCellView: 'Ember.MoreHeaderCell', headerName: 'index', headerSecondName: '', headerThirdName: 'description', secondId: 'lDes', thirdId: 'open', headerStyle: 'text-left-header', sortKeyword: 'sDes', type: 'expandedSymbolMobile', expandedWidthRatio: '0.5', defaultWidthRatio: 16 / 37, isndicatorAvailable: true},
            {id: 'ltp', width: 55, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'last', headerSecondName: '', headerThirdName: 'volume', secondId: 'vol', thirdId: 'low', sortKeyword: 'ltp', dataType: 'float', firstValueStyle: 'fore-color bold', type: 'expandedLtpMobile', noOfSecValueDecimalPlaces: 0, expandedWidthRatio: '0.25', defaultWidthRatio: 9 / 37},
            {id: 'pctChg', width: 50, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'perChange', headerSecondName: '', headerThirdName: 'change', headerStyle: 'pad-m-r', secondId: 'chg', thirdId: 'prvCls', sortKeyword: 'chg', positiveNegativeChange: true, type: 'expandedChgMobile', dataType: 'float', expandedWidthRatio: '0.25', defaultWidthRatio: 12 / 37}]
    },

    timeAndSales: {
        defaultColumnMapping: {     // Column Object parameters : id, width, headerName, sortKeyword, multiValueIds, cellStyle, sortDisable, firstValueStyle, isBold, dataType, backgroundColour,
            dDt: {id: 'dDt', width: 55, headerName: 'time', headerStyle: 'text-left-header font-xxx-l', cellStyle: 'text-left-header font-m', sortKeyword: 'dDt', type: 'classic', firstValueStyle: 'fore-color bold'},
            trp: {id: 'trp', width: 43, headerName: 'price', headerStyle: 'font-xxx-l', cellStyle: 'font-l', sortKeyword: 'trp', dataType: 'float', type: 'classic', firstValueStyle: 'highlight-fore-color bold'},
            trq: {id: 'trq', width: 50, headerName: 'quantity', headerStyle: 'font-xxx-l', cellStyle: 'font-l', sortKeyword: 'trq', dataType: 'int', type: 'classic', firstValueStyle: 'fore-color bold'},
            splits: {id: 'splits', width: 24, headerName: 'splits', headerStyle: 'font-xxx-l panel-table-padding', cellStyle: 'font-l', sortKeyword: 'splits', dataType: 'int', type: 'classic', firstValueStyle: 'fore-color bold'},
            tick: {id: 'tick', width: 16, headerName: '', thirdId: 'tick', headerStyle: 'font-xxx-l', sortKeyword: 'tick', type: 'upDown', cellStyle: 'text-center'},
            trdType: {id: 'trdType', width: 25, headerName: '', headerStyle: 'font-xxx-l', sortKeyword: 'trdType', type: 'buySell', positiveNegativeChange: true, firstValueStyle: 'font-4x-l'},
            nChg: {id: 'nChg', width: 45, headerName: 'change', headerStyle: 'font-xxx-l', isColumnSortDisabled: true, dataType: 'float', type: 'classic', positiveNegativeChange: true, firstValueStyle: 'font-l'}
        },

        defaultColumnIds: ['dDt', 'trp', 'trq', 'splits', 'tick', 'trdType'],

        BacklogBatchSize: 500
    },

    marketTimeAndSales: {
        defaultColumnMapping: { // Column Object parameters : id, width, headerName, sortKeyword, multiValueIds, cellStyle, sortDisable, firstValueStyle, isBold, dataType, backgroundColour,
            dDt: {id: 'dDt', width: 76, headerName: 'time', headerStyle: 'text-left-header font-xxx-l', cellStyle: 'text-left-header font-m', sortKeyword: 'dDt', type: 'classic', firstValueStyle: 'fore-color bold'},
            sym: {id: 'dispProp1', width: 84, headerName: 'symbol', headerStyle: 'text-left-header font-xxx-l', cellStyle: 'font-m symbol-fore-color text-left-header', sortKeyword: 'sym', type: 'classic', firstValueStyle: 'bold'},
            trp: {id: 'trp', width: 62, headerName: 'price', headerStyle: 'font-xxx-l', cellStyle: 'font-m', sortKeyword: 'trp', dataType: 'float', type: 'classic', firstValueStyle: 'highlight-fore-color bold'},
            trq: {id: 'trq', width: 70, headerName: 'quantity', headerStyle: 'font-xxx-l', cellStyle: 'font-m', sortKeyword: 'trq', dataType: 'int', type: 'classic', firstValueStyle: 'fore-color bold'},
            tick: {id: 'tick', width: 30, headerName: '', headerStyle: 'font-xx-l', thirdId: 'tick', sortKeyword: 'tick', type: 'upDown', cellStyle: 'text-center'},
            trdType: {id: 'trdType', width: 35, headerName: '', headerStyle: 'font-xx-l', sortKeyword: 'trdType', type: 'buySell', positiveNegativeChange: true}
        },

        defaultColumnIds: ['dDt', 'sym', 'trp', 'trq', 'tick', 'trdType'],

        BacklogBatchSize: 500
    },

    optionChain: {
        defaultColumnMapping: {     // Column Object parameters : id, width, headerName, sortKeyword, multiValueIds, cellStyle, sortDisable, firstValueStyle, isBold, dataType, backgroundColour,
            callBestBid: {id: 'cStock.bbp', width: 40, headerName: 'callBestBid', headerStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'up-fore-color bold', backgroundStyle: 'watchlist-cell-back-green', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'},
            callBestAsk: {id: 'cStock.bap', width: 40, headerName: 'callBestAsk', headerStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'down-fore-color bold', backgroundStyle: 'watchlist-cell-back-red', sortKeyword: 'bap', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'},
            strikePrice: {id: 'strkPrc', width: 60, headerName: 'strikePrice', headerStyle: 'text-left-header', dataType: 'float', firstValueStyle: 'highlight-fore-color bold h-middle', backgroundStyle: 'watchlist-cell-back-lastqty', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, type: 'classicCell'},
            putBestBid: {id: 'pStock.bbp', width: 40, headerName: 'putBestBid', headerStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'up-fore-color bold', backgroundStyle: 'watchlist-cell-back-green', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'},
            putBestAsk: {id: 'pStock.bap', width: 40, headerName: 'putBestAsk', headerStyle: 'text-left-header', type: 'classicCell', firstValueStyle: 'down-fore-color bold', backgroundStyle: 'watchlist-cell-back-red', sortKeyword: 'bap', blinkUpStyle: 'blink-classic-up', blinkDownStyle: 'blink-classic-down', isBlink: true, dataType: 'float'}
        },

        defaultColumnIds: ['callBestBid', 'callBestAsk', 'strikePrice', 'putBestBid', 'putBestAsk']
    },

    quote: {
        panelIntraday: {
            // Equity
            '1': [
                {lanKey: 'bestBid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                {lanKey: 'min', dataField: 'min', formatter: 'C'},
                {lanKey: 'top', dataField: 'top', formatter: 'C'},
                {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                {lanKey: 'bestOffer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'netCash', dataField: 'netCash', formatter: 'L'},
                {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                {lanKey: 'max', dataField: 'max', formatter: 'C'},
                {lanKey: 'tov', dataField: 'tov', formatter: 'L'},
                {lanKey: 'lastTradedTime', dataField: 'ltt', formatter: 'T'}
            ],

            // Fixed Income
            6: [
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                {lanKey: 'min', dataField: 'min', formatter: 'C'},
                {lanKey: 'top', dataField: 'top', formatter: 'C'},
                {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'netCash', dataField: 'netCash', formatter: 'L'},
                {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                {lanKey: 'max', dataField: 'max', formatter: 'C'},
                {lanKey: 'tov', dataField: 'tov', formatter: 'L'},
                {lanKey: 'lastTradedTime', dataField: 'ltt', formatter: 'T'},
                {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
            ],

            // Future
            4: [
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
            ],

            // Option
            3: [
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
            ],

            // Mutual Fund
            5: [
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
            ],

            // Currency
            7: [
                {lanKey: 'bidQty', dataField: 'bbq', formatter: 'L', style: 'up-fore-color'},
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                {lanKey: 'lastTrade', dataField: 'ltp', formatter: 'C'},
                {lanKey: 'offerQty', dataField: 'baq', formatter: 'L', style: 'down-fore-color'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                {lanKey: 'close', dataField: 'cls', formatter: 'C'}
            ],

            // Index
            '8': [
                {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                {lanKey: 'low', dataField: 'low', formatter: 'C'},
                {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                {lanKey: 'open', dataField: 'open', formatter: 'C'},
                {lanKey: 'high', dataField: 'high', formatter: 'C'},
                {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                {lanKey: 'netCash', dataField: 'netCash', formatter: 'L'},
                {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                {lanKey: 'lastTradedTime', dataField: 'ltt', formatter: 'T'}
            ]
        },

        panelFundamental: {
            // Equity
            '1': [
                {lanKey: 'eps', dataField: 'eps', formatter: 'C'},
                {lanKey: 'yield1', dataField: 'yld', formatter: 'C'},
                {lanKey: 'peRatio', dataField: 'per', formatter: 'C'},
                {lanKey: 'pbRatio', dataField: 'pbr', formatter: 'C'},
                {lanKey: 'dividend', dataField: 'div', formatter: 'I'},
                {lanKey: 'exDividendDate', dataField: 'edd', formatter: 'D'}
            ],

            // Fixed Income
            6: [
                {lanKey: 'couponRate', dataField: 'cor', formatter: 'C'},
                {lanKey: 'couponFreq', dataField: 'cof', formatter: 'C'},
                {lanKey: 'previousCouponDate', dataField: 'pcd', formatter: 'D'},
                {lanKey: 'faceValue', dataField: 'fVal', formatter: 'C'},
                {lanKey: 'maturityDate', dataField: 'matD', formatter: 'D'},
                {lanKey: 'yield1', dataField: 'yld', formatter: 'C'},
                {lanKey: 'bondType', dataField: 'boT', formatter: 'S'},
                {lanKey: 'outstandingAmount', dataField: 'outA', formatter: 'C'},
                {lanKey: 'settlementDate', dataField: 'setD', formatter: 'D'},
                {lanKey: 'dayCountMethod', dataField: 'dcm', formatter: 'S'}
            ],

            // Future
            4: [
                {lanKey: 'strikePrice', dataField: 'stkP', formatter: 'C'},
                {lanKey: 'expiryDate', dataField: 'expDt', formatter: 'D'},
                {lanKey: 'lotSize', dataField: 'lot', formatter: 'I'},
                {lanKey: 'openInterest', dataField: 'oInt', formatter: 'C'},
                {lanKey: 'openInterestChange', dataField: 'oIntC', formatter: 'P'},
                {lanKey: 'settlementPrice', dataField: 'sp', formatter: 'C'}
            ],

            // Option
            3: [
                {lanKey: 'strikePrice', dataField: 'stkP', formatter: 'C'},
                {lanKey: 'expiryDate', dataField: 'expDt', formatter: 'D'},
                {lanKey: 'lotSize', dataField: 'lot', formatter: 'I'},
                {lanKey: 'openInterest', dataField: 'oInt', formatter: 'C'},
                {lanKey: 'openInterestChange', dataField: 'oIntC', formatter: 'P'},
                {lanKey: 'settlementPrice', dataField: 'sp', formatter: 'C'}
            ],

            // Mutual Fund
            5: [
                {lanKey: 'dividend', dataField: 'div', formatter: 'I'},
                {lanKey: 'exDividendDate', dataField: 'edd', formatter: 'D'}
            ],

            // Currency
            7: [],

            // Index
            '8': []
        }
    },

    globalSearch: {
        maxResultsForGroup: 10,

        groups: {
            topHits: {rank: 1, groupName: 'Top hits', type: 'T', colorCss: 'yellow-back-color'},
            // Equity
            1: {rank: 2, groupName: 'Equity', lanKey: 'equity', type: 1, colorCss: 'blue-back-color'},
            // Fixed Income
            6: {rank: 3, groupName: 'Fixed Income', lanKey: 'fixedIncome', type: 6, colorCss: 'green-back-color-2'},
            // Future
            4: {rank: 4, groupName: 'Future', lanKey: 'future', type: 4, colorCss: 'purple-back-color'},
            // Option
            3: {rank: 5, groupName: 'Option', lanKey: 'option', type: 3, colorCss: 'pink-back-color'},
            // Mutual Fund
            5: {rank: 6, groupName: 'Mutual Fund', lanKey: 'mutualFund', type: 5, colorCss: 'green-back-color'},
            // Index
            8: {rank: 7, groupName: 'Index', lanKey: 'index', type: 8, colorCss: 'blue-back-color-2'},
            other: {rank: 8, groupName: 'Other', lanKey: 'other', type: 'D', colorCss: 'orange-back-color'}
        }
    },

    alert: {
        criteria: [
            {value: '>', lanKey: 'greaterThan'},
            {value: '>=', lanKey: 'greaterThanOrEqual'},
            {value: '<', lanKey: 'lessThan'},
            {value: '<=', lanKey: 'lessThanOrEqual'},
            {value: '=', lanKey: 'equal'}
        ],

        alertCondition: [
            {value: '0', lanKey: 'Match All'},
            {value: '1', lanKey: 'Match Any'}
        ],

        frequency: [
            {value: '1', lanKey: 'Once Only'},
            {value: '2', lanKey: 'Once a day'}
        ],

        parameters: [
            {value: 'bbp', lanKey: 'bestBid', field: 'BEST_BID', isDecimalAllowed: true},
            {value: 'bap', lanKey: 'bestOffer', field: 'BEST_ASK', isDecimalAllowed: true},
            {value: 'baq', lanKey: 'offerQty', field: 'BEST_ASK_QTY', isDecimalAllowed: false},
            {value: 'bbq', lanKey: 'bidQty', field: 'BEST_BID_QTY', isDecimalAllowed: false},
            {value: 'vol', lanKey: 'volume', field: 'VOLUME', isDecimalAllowed: false},
            {value: 'chg', lanKey: 'change', field: 'CHANGE', isDecimalAllowed: true},
            {value: 'ltp', lanKey: 'last', field: 'LAST_TRADE_PRICE', isDecimalAllowed: true},
            {value: 'ltq', lanKey: 'lastQty', field: 'LAST_TRADE_QTY', isDecimalAllowed: true},
            {value: 'pctChg', lanKey: 'perChange', field: 'PCT_CHANGE', isDecimalAllowed: true}
        ],

        paramMap: {
            BEST_BID: 'bestBid',
            BEST_ASK: 'bestOffer',
            BEST_ASK_QTY: 'offerQty',
            BEST_BID_QTY: 'bidQty',
            VOLUME: 'volume',
            CHANGE: 'change',
            PCT_CHANGE: 'perChange'
        }
    },

    financialRatios: {
        types: [
            {value: 'BS', lanKey: 'balanceSheet'},
            {value: 'IS', lanKey: 'incomeStatement'},
            {value: 'CF', lanKey: 'cashFlow'}
        ]
    },

    alertHistory: {
        defaultColumnMapping: {
            contextMenu: {id: 'contextMenu', width: 15, name: 'contextMenu', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-chevron-right', isColumnSortDisabled: true, type: 'contextMenuMobile', buttonFunction: 'updateAlert'},
            sym: {id: 'sym', width: 55, headerName: 'symbol', secondId: 'lDes', thirdId: 'open', headerStyle: 'text-left-header font-xxx-l', sortKeyword: 'sDes', type: 'alertSymbolMobile'},
            crit: {id: 'crit', width: 80, headerName: 'condition', headerStyle: 'text-left-header font-xxx-l', sortKeyword: 'crit', type: 'alertCriteriaMobile'},
            status: {id: 'status', width: 65, headerName: 'status', headerStyle: 'text-left-header font-xxx-l', sortKeyword: 'status', type: 'alertStatusMobile'}
        },

        defaultColumnIds: ['contextMenu', 'sym', 'crit', 'status']
    },

    topStocks: {
        // TopGainersByPercentageChange
        1: {
            fields: [
                {filed: 'description', objName: 'stock.sDes', fontColor: 'fore-color font-3x-l font-thick', textAlign: 'h-left', col: 'layout-col-24', bold: 'bold', padding: 'pad-widget-left'},
                // {filed: 'symbol', objName: 'dSym', fontColor: 'symbol-fore-color', textAlign: 'h-left ', bold: 'bold', padding: 'pad-widget-left'},
                {filed: 'last', objName: 'ltp', fontColor: 'highlight-fore-color font-3x-l', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l pad-widget-right'},
                {filed: 'change', objName: 'chg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberWithDeci', padding: 'pad-m-l pad-widget-right'},
                {filed: 'perChange', objName: 'pctChg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberPercentage', bold: 'bold', padding: 'pad-m-l pad-widget-right'}
            ],
            title: 'topGainers',
            icon: 'glyphicon-triangle-top up-fore-color',
            showTopStockTabs: true
        },
        // TopLosersByPercentageChange
        3: {
            fields: [
                {filed: 'description', objName: 'stock.sDes', fontColor: 'fore-color font-3x-l font-thick', textAlign: 'h-left', col: 'layout-col-24', bold: 'bold', padding: 'pad-widget-left'},
                // {filed: 'symbol', objName: 'dSym', fontColor: 'symbol-fore-color', textAlign: 'h-left', bold: 'bold', padding: 'pad-widget-left'},
                {filed: 'last', objName: 'ltp', fontColor: 'highlight-fore-color font-3x-l', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l pad-widget-right'},
                {filed: 'change', objName: 'chg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberWithDeci', padding: 'pad-m-l pad-widget-right'},
                {filed: 'perChange', objName: 'pctChg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberPercentage', bold: 'bold', padding: 'pad-m-l pad-widget-right'}
            ],
            title: 'topLosers',
            icon: 'glyphicon-triangle-bottom  down-fore-color',
            showTopStockTabs: true
        },
        // MostActiveByVolume
        4: {
            fields: [
                {filed: 'description', objName: 'stock.sDes', col: 'layout-col-24', fontColor: 'fore-color font-3x-l font-thick', textAlign: 'h-left', bold: 'bold', padding: 'pad-widget-left'},
                {filed: 'last', objName: 'ltp', fontColor: 'highlight-fore-color font-3x-l', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l'},
                // {filed: 'change', objName: 'chg', fontColor: 'redOrGreen', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l'},
                {filed: 'perChange', objName: 'pctChg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberPercentage', padding: 'pad-m-l pad-widget-right'},
                {filed: 'volume', objName: 'vol', fontColor: 'highlight-fore-color', textAlign: 'h-right', formatter: 'formatNumber', bold: 'bold', padding: 'pad-m-l pad-widget-right'}

            ],
            title: 'MActiveByVol',
            icon: 'glyphicon glyphicon-transfer fore-color',
            showTopStockTabs: false
        },
        // MostActiveByTrades
        5: {
            fields: [
                {filed: 'description', objName: 'stock.sDes', col: 'layout-col-24', fontColor: 'fore-color font-3x-l font-thick', textAlign: 'h-left', bold: 'bold', padding: 'pad-widget-left'},
                {filed: 'last', objName: 'ltp', fontColor: 'highlight-fore-color font-3x-l', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l pad-widget-right'},
                {filed: 'perChange', objName: 'pctChg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberPercentage', padding: 'pad-m-l pad-widget-right'},
                {filed: 'trades', objName: 'trades', fontColor: 'fore-color', textAlign: 'h-right', formatter: 'formatNumber', bold: 'bold', padding: 'pad-m-l pad-widget-right'}
            ],
            title: 'MActiveByTrades',
            icon: 'glyphicon glyphicon-transfer fore-color',
            showTopStockTabs: false
        },
        // MostActiveByTurnover
        6: {
            fields: [
                {filed: 'description', objName: 'stock.sDes', col: 'layout-col-24', fontColor: 'fore-color font-3x-l font-thick', textAlign: 'h-left', bold: 'bold', padding: 'pad-widget-left'},
                {filed: 'last', objName: 'ltp', fontColor: 'highlight-fore-color font-3x-l', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l'},
                // {filed: 'change', objName: 'chg', fontColor: 'redOrGreen', textAlign: 'h-right', formatter: 'formatNumberWithDeci', padding: 'pad-m-l'},
                {filed: 'perChange', objName: 'pctChg', fontColor: 'redOrGreen', textAlign: 'h-right ltr', formatter: 'formatNumberPercentage', padding: 'pad-m-l'},
                {filed: 'turnover', objName: 'tovr', fontColor: 'highlight-fore-color', textAlign: 'h-right', formatter: 'formatNumber', bold: 'bold', padding: 'pad-m-l pad-widget-right'}
            ],
            title: 'MActiveByTurnover',
            icon: 'glyphicon glyphicon-transfer fore-color',
            showTopStockTabs: false
        }
    },

    gms: {
        'SXAUUSDOZ.SP': {sym: 'SXAUUSDOZ.SP', exg: 'GLOBAL', inst: '0', sDes: 'Gold', icon: 'comm-icon icon-gold'},
        'SXAGUSDOZ.SP': {sym: 'SXAGUSDOZ.SP', exg: 'GLOBAL', inst: '0', sDes: 'Silver', icon: 'comm-icon icon-silver'},
        'EBROUSDBR.SP': {sym: 'EBROUSDBR.SP', exg: 'GLOBAL', inst: '0', sDes: 'Brent Crude', icon: 'comm-icon icon-brent-crude'},
        'EWTIUSDBR.SP': {sym: 'EWTIUSDBR.SP', exg: 'GLOBAL', inst: '0', sDes: 'WTI Crude', icon: 'comm-icon icon-wti-crude'},
        'EURSAR': {sym: 'EURSAR', exg: 'GLOBAL', inst: '0', sDes: 'EURSAR', icon: 'comm-icon icon-euro'}
    }
};