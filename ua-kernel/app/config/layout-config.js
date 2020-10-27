export default {
    layout: {
        leftPanel: {
            template: 'layout.mobile.left-navigation'
        },

        titleBar: {
            template: 'price.top-panel.mobile.title-panel'
        },

        hnavPanel: {
            template: 'price.top-panel.mobile.hnav-panel'
        },

        tickerPanel: {
            template: 'layout.mobile.ticker-panel'
        },

        mainPanel: {
            template: 'main-panel-container-controller-mobile',
            content: [
                {
                    id: 1,
                    title: 'market',
                    titleKey: 'market',
                    icon: 'icon-analytics-chart-graph',
                    def: true,
                    isHideTab: true,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'market',
                            titleKey: 'market',
                            icon: 'icon-analytics-chart-graph',
                            def: true,
                            isRotationAllowed: true,
                            outlet: 'price.containers.mobile.market-summary-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.market-summary.market-summary', desc: 'market', def: true}]
                                }
                            ]
                        },
                        {
                            id: 2,
                            def: false,
                            cache: false,
                            title: 'topStocks',
                            titleKey: 'topStocks',
                            // titleSubKey: 'market',
                            icon: 'icon-thumbs-o-up',
                            outlet: 'price.containers.mobile.market-top-stock-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.top-stock', desc: 'topGainers', def: true}]
                                },
                                {
                                    id: 2,
                                    iw: [{id: 1, wn: 'price.widgets.top-stock', desc: 'topLosers', def: true}]
                                },
                                {
                                    id: 3,
                                    iw: [{id: 1, wn: 'price.widgets.top-stock', desc: 'mostActive', def: true}]
                                },
                                {
                                    id: 4,
                                    iw: [{id: 1, wn: 'price.widgets.top-stock', desc: 'mostActive', def: true}]
                                },
                                {
                                    id: 5,
                                    iw: [{id: 1, wn: 'price.widgets.top-stock', desc: 'mostActive', def: true}]
                                }
                            ]
                        },
                        {
                            id: 3,
                            def: false,
                            cache: false,
                            title: 'companyProf',
                            titleKey: 'indices',
                            // titleSubKey: 'market',
                            icon: 'icon-chart-line',
                            outlet: 'price.containers.mobile.market-indices-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.indices', desc: 'market', def: true}]
                                }
                            ]
                        },
                        {
                            id: 4,
                            def: false,
                            cache: false,
                            title: 'dividend',
                            titleKey: 'marketOverview',
                            icon: 'glyphicon glyphicon-list-alt',
                            outlet: 'price.containers.market-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.market-overview', desc: 'market', def: true}]
                                }
                            ]
                        },
                        {
                            id: 5,
                            def: false,
                            cache: false,
                            title: 'ria',
                            titleKey: 'subMarket',
                            icon: 'icon-link',
                            outlet: 'price.containers.sub-market-overview-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.sub-market-overview', desc: 'subMarket', def: true}]
                                }
                            ]
                        },
                        {
                            id: 6,
                            title: 'classic',
                            titleKey: 'marketTimeAndSales',
                            cache: false,
                            def: false,
                            icon: 'fa fa-home',
                            outlet: 'price.containers.mobile.market-time-and-sales-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.time-and-sales.market-time-and-sales', desc: 'market', def: true}]
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 2,
                    title: 'heatMap',
                    titleKey: 'watchList',
                    icon: 'icon-list-ul',
                    def: false,
                    isHideTab: true,
                    isHideHeader: true,
                    isShowTitle: true,
                    rightPanel: -1,
                    expandId: 2,
                    expandCss: 'hnav-collapse-width-large',
                    subMenuCss: 'hnav-no-width',
                    tab: [
                        {
                            id: 1,
                            title: 'heatMap',
                            titleKey: 'watchList',
                            cache: false,
                            icon: 'icon-list-ul',
                            def: true,
                            outlet: 'price.containers.mobile.watchlist-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.watch-list.watch-list', desc: 'watchlist', def: true}]
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 3,
                    title: 'fullQuote',
                    titleKey: 'quote',
                    icon: 'icon-files',
                    def: false,
                    isHideTab: true,
                    isShowTitle: true,
                    rightPanel: -1,
                    subMenuCss: 'hnav-no-width',
                    tab: [
                        {
                            id: 1,
                            title: 'fullQuote',
                            titleKey: 'quote',
                            cache: false,
                            icon: 'icon-files',
                            def: true,
                            isRotationAllowed: true,
                            outlet: 'price.containers.mobile.quote-summary-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.quote-summary.quote-summary', desc: 'quoteSummary', def: true}]
                                },
                                {
                                    id: 2,
                                    iw: [{id: 1, wn: 'price.widgets.announcement.symbol-announcement', desc: 'announcement', def: true}]
                                },
                                {
                                    id: 3,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.quote-summary.components.quote-status-panel', desc: 'quoteStatus', def: true}]
                                }
                            ]
                        },
                        {
                            id: 2,
                            title: 'chart',
                            titleKey: 'marketDepth',
                            // titleSubKey: 'quote',
                            cache: false,
                            def: false,
                            icon: 'icon-fire',
                            outlet: 'price.containers.mobile.quote-market-depth-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.quote-market-depth', desc: 'depthByPrice', def: true}]
                                },
                                {
                                    id: 2,
                                    iw: [{id: 1, wn: 'price.widgets.quote-market-depth', desc: 'depthByOrder', def: true}]
                                },
                                {
                                    id: 3,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.quote-summary.components.quote-status-panel', desc: 'quoteStatus', def: true}]
                                }
                            ]
                        },
                        {
                            id: 3,
                            title: 'trading',
                            titleKey: 'timeAndSales',
                            // titleSubKey: 'quote',
                            cache: false,
                            def: false,
                            icon: 'icon-clock',
                            outlet: 'price.containers.mobile.quote-time-and-sales-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.time-and-sales.quote-time-and-sales', desc: 'timeAndSales', def: true}]
                                },
                                {
                                    id: 2,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.quote-summary.components.quote-status-panel', desc: 'quoteStatus', def: true}]
                                }
                            ]
                        },
                        {
                            id: 4,
                            title: 'transfers',
                            titleKey: 'alerts',
                            cache: false,
                            def: false,
                            icon: 'glyphicon glyphicon-bell',
                            outlet: 'price.containers.mobile.alert-price-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.mobile.alert-price', desc: 'alerts', def: true}]
                                }
                            ]
                        }
                    ]
                },
                {
                    id: 4,
                    title: 'standard',
                    titleKey: 'gmsShortDes',
                    mainMenuKey: 'gms',
                    icon: 'glyphicon glyphicon-globe',
                    def: false,
                    isHideTab: true,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'standard',
                            titleKey: 'gmsShortDes',
                            icon: 'glyphicon glyphicon-globe',
                            def: true,
                            outlet: 'price.containers.mobile.gms-summary-tab',
                            w: [
                                {
                                    id: 1,
                                    iw: [{id: 1, wn: 'price.widgets.gms-container', desc: 'gms', def: true}]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    },

    args: {
        mainPanel: {
            1: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            },
                            2: {
                                1: {selectedLink: 1, showAnnTabs: false}
                            }
                        }
                    },
                    2: {
                        w: {
                            1: {
                                1: {mode: 1, selectedLink: 1} // TopGainersByChange, TopGainersByPercentageChange
                            },
                            2: {
                                1: {mode: 3, selectedLink: 1} //  TopLosersByChange, TopLosersByPercentageChange
                            },
                            3: {
                                1: {mode: 4, selectedLink: 1} //  MostActiveByVolume
                            },
                            4: {
                                1: {mode: 5, selectedLink: 1} // MostActiveByTrades
                            },
                            5: {
                                1: {mode: 6, selectedLink: 1} // MostActiveByValue
                            }
                        }
                    },
                    3: {
                        w: {
                            1: {
                                1: {selectedLink: 1, hideTitle: true, rowHeight: 60, isHideLink: true}
                            },
                            2: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    4: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    5: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    6: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            }
                        }
                    }
                }
            },
            2: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {selectedLink: 1, rowHeight: 60, isHideLink: true, sortProperties: ['dSym'], sortCols: ['dSym'], sortAsc: true}
                            }
                        }
                    }
                }
            },
            3: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            },
                            2: {
                                1: {selectedLink: 1}
                            },
                            3: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    2: {
                        w: {
                            1: {
                                1: {mode: 1, selectedLink: 1} // DepthByPrice: 1, DepthByOrder: 2
                            },
                            2: {
                                1: {mode: 2, selectedLink: 1} // DepthByPrice: 1, DepthByOrder: 2
                            },
                            3: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    3: {
                        w: {
                            1: {
                                1: {selectedLink: 1, hideTitle: true}
                            },
                            2: {
                                1: {selectedLink: 1}
                            }
                        }
                    }
                }
            },
            4: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {selectedLink: 1, assetType: 0}
                            }
                        }
                    }
                }
            }

        }
    }
};
