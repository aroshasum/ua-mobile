export default {
    appConfig: {
        customisation: {
            clientPrefix: 'mSaudiRetail',
            profileServiceEnabled: false,
            isMobile: true,
            isDefaultRotationDisabled: true,
            productType: 66,
            isPasswordChangeEnable: true,
            isEnabledPwRules: true,

            passwordRules: {
                maxLength: 18,
                minLength: 8,
                checkUsernameMatch: true,
                checkLength: true
            },

            supportedContacts: [
                {key: 'phn', value: '920005710', type: 'T'},
                {key: 'phn', value: '+966112140549000', type: 'T'},
                {key: 'phn', value: '+966112140549', type: 'T'},
                {key: 'url', value: 'www.directfn.sa', type: 'U'}
            ],

            loginViewSettings: {
                isSignUpEnabled: false,
                isForgotPasswordEnabled: false,
                isPoweredByEnabled: false
            },

            applicationIdleCheckConfig: {
                defaultIdleTime: 90 // 90 minute
            }
        },

        loginConfig: {
            isRememberPassword: true
        },

        loggerConfig: {
            serverLogLevel: 0,
            consoleLogLevel: 3
        },

        widgetId: {
            quoteMenuId: 'fullQuote',
            watchListMenuId: 'heatMap',
            marketMenuId: 'market',
            indicesTabId: 'companyProf',
            topStocksTabId: 'topStocks'
        }
    },

    // TODO [Arosha] Remove this after done this from responsive class
    priceWidgetConfig: {
        watchList: {
            quoteColumns: [
                {id: 'contextMenu', width: 15, name: 'contextMenu', headerName: '', headerStyle: 'text-center', iconClass: 'glyphicon glyphicon-chevron-right', isColumnSortDisabled: true, type: 'contextMenuMobile', buttonFunction: 'showOrderTicket'},
                {id: 'dSym', width: 80, headerCellView: 'Ember.MoreHeaderCell', headerName: 'symbol', headerSecondName: '', headerThirdName: 'description', secondId: 'lDes', thirdId: 'open', headerStyle: 'text-left-header', sortKeyword: 'sDes', type: 'expandedSymbolMobile', expandedWidthRatio: '0.5', defaultWidthRatio: 16 / 37, isndicatorAvailable: true},
                {id: 'ltp', width: 45, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'last', headerSecondName: '', headerThirdName: 'volume', secondId: 'vol', thirdId: 'low', sortKeyword: 'ltp', headerStyle: 'pad-s-r', dataType: 'float', firstValueStyle: 'fore-color bold', type: 'expandedLtpMobile', noOfSecValueDecimalPlaces: 0, expandedWidthRatio: '0.25', blinkUpStyle: 'up-back-color btn-txt-color', blinkDownStyle: 'down-back-color btn-txt-color', isBlink: true, defaultWidthRatio: 9 / 37},
                {id: 'pctChg', width: 60, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'perChange', headerSecondName: '', headerThirdName: 'change', headerStyle: 'pad-m-r', secondId: 'chg', thirdId: 'prvCls', sortKeyword: 'chg', positiveNegativeChange: true, type: 'expandedChgMobile', dataType: 'float', expandedWidthRatio: '0.25', defaultWidthRatio: 12 / 37}]
        },

        indices: {
            columns: [
                {id: 'dSym', width: 80, headerCellView: 'Ember.MoreHeaderCell', headerName: 'index', headerSecondName: '', headerThirdName: 'description', secondId: 'lDes', thirdId: 'open', headerStyle: 'text-left-header', sortKeyword: 'sDes', type: 'expandedSymbolMobile', expandedWidthRatio: '0.5', defaultWidthRatio: 16 / 37, isndicatorAvailable: true},
                {id: 'ltp', width: 55, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'last', headerSecondName: '', headerThirdName: 'volume', secondId: 'vol', thirdId: 'low', sortKeyword: 'ltp', dataType: 'float', firstValueStyle: 'fore-color bold', type: 'expandedLtpMobile', noOfSecValueDecimalPlaces: 0, expandedWidthRatio: '0.25', defaultWidthRatio: 9 / 37},
                {id: 'pctChg', width: 50, headerCellView: 'Ember.ExpandedHeaderCell', headerName: 'perChange', headerSecondName: '', headerThirdName: 'change', headerStyle: 'pad-m-r', secondId: 'chg', thirdId: 'prvCls', sortKeyword: 'chg', positiveNegativeChange: true, type: 'expandedChgMobile', dataType: 'float', expandedWidthRatio: '0.25', defaultWidthRatio: 12 / 37}]
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

        quote: {
            panelIntraday: {
                // Equity
                '1': [
                    {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                    {lanKey: 'low', dataField: 'low', formatter: 'C'},
                    {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                    {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                    {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                    {lanKey: 'min', dataField: 'min', formatter: 'C'},
                    {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                    {lanKey: 'open', dataField: 'open', formatter: 'C'},
                    {lanKey: 'high', dataField: 'high', formatter: 'C'},
                    {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                    {lanKey: 'netCash', dataField: 'netCash', formatter: 'L'},
                    {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                    {lanKey: 'max', dataField: 'max', formatter: 'C'},
                    {lanKey: 'lastTradedTime', dataField: 'ltt', formatter: 'T'},
                    {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                    {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
                ],

                // Fixed Income
                6: [
                    {lanKey: 'preClosed', dataField: 'prvCls', formatter: 'C'},
                    {lanKey: 'low', dataField: 'low', formatter: 'C'},
                    {lanKey: 'volume', dataField: 'vol', formatter: 'L'},
                    {lanKey: 'turnover', dataField: 'tovr', formatter: 'L'},
                    {lanKey: 'fiftyTwoWkL', dataField: 'l52', formatter: 'C'},
                    {lanKey: 'min', dataField: 'min', formatter: 'C'},
                    {lanKey: 'mktCap', dataField: 'mktCap', formatter: 'DN'},
                    {lanKey: 'open', dataField: 'open', formatter: 'C'},
                    {lanKey: 'high', dataField: 'high', formatter: 'C'},
                    {lanKey: 'trades', dataField: 'trades', formatter: 'L'},
                    {lanKey: 'netCash', dataField: 'netCash', formatter: 'L'},
                    {lanKey: 'fiftyTwoWkH', dataField: 'h52', formatter: 'C'},
                    {lanKey: 'max', dataField: 'max', formatter: 'C'},
                    {lanKey: 'lastTradedTime', dataField: 'ltt', formatter: 'T'},
                    {lanKey: 'bid', dataField: 'bbp', formatter: 'C', style: 'up-fore-color'},
                    {lanKey: 'offer', dataField: 'bap', formatter: 'C', style: 'down-fore-color'}
                ]
            }
        }
    }
};
