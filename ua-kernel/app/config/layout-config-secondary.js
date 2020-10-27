export default function () {
    var layout = {
        menuPanel: {
            template: 'layout.horizontal-navigation'
        },

        titleBar: {
            template: 'layout.menu-title-bar',
            content: [
                {
                    id: 1,
                    displayTitle: 'Trade',
                    def: true
                },
                {
                    id: 2,
                    displayTitle: 'Customer',
                    def: false
                },
                {
                    id: 3,
                    displayTitle: 'Market',
                    def: false
                },
                {
                    id: 4,
                    displayTitle: 'Watch List',
                    def: false
                },
                {
                    id: 5,
                    displayTitle: 'Analysis',
                    def: false
                },
                {
                    id: 6,
                    displayTitle: 'Download',
                    def: false
                },
                {
                    id: 7,
                    displayTitle: 'View',
                    def: false
                }
            ]
        },

        mainPanel: {
            template: 'main-panel-container-controller',
            content: [
                {
                    id: 1,
                    title: 'tab1',
                    icon: 'glyphicon icon-analytics-chart-graph',
                    def: true,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'custom',
                            displayTitle: '',
                            def: true,
                            custom: true,
                            layoutSelection: true,
                            outlet: 'custom-workspace.layout-selection',
                            w: []
                        }]
                },
                {
                    id: 8,
                    title: 'tab2',
                    widgetTitle: 'trading',
                    icon: 'glyphicon icon-trade',
                    def: false,
                    isShowTitle: false,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'custom',
                            displayTitle: '',
                            def: true,
                            custom: true,
                            layoutSelection: true,
                            outlet: 'custom-workspace.layout-selection',
                            w: []
                        }
                    ]
                },
                {
                    id: 2,
                    title: 'tab3',
                    icon: 'glyphicon icon-list-ul',
                    def: false,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'custom',
                            displayTitle: '',
                            def: true,
                            custom: true,
                            layoutSelection: true,
                            outlet: 'custom-workspace.layout-selection',
                            w: []
                        }]
                },
                {
                    id: 3,
                    title: 'tab4',
                    icon: 'glyphicon icon-thumbs-o-up',
                    def: false,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'custom',
                            displayTitle: '',
                            def: true,
                            custom: true,
                            layoutSelection: true,
                            outlet: 'custom-workspace.layout-selection',
                            w: []
                        }]
                },
                {
                    id: 7,
                    title: 'tab5',
                    icon: 'glyphicon icon-sitemap',
                    widgetTitle: 'perHeatMap',
                    def: false,
                    isShowTitle: true,
                    rightPanel: -1,
                    tab: [
                        {
                            id: 1,
                            cache: false,
                            title: 'custom',
                            displayTitle: '',
                            def: true,
                            custom: true,
                            layoutSelection: true,
                            outlet: 'custom-workspace.layout-selection',
                            w: []
                        }]
                }
            ]
        },

        rightPanel: {
            template: 'layout.right-panel-container',
            content: [
                {
                    id: 1,
                    icon: 'fa fa-bullhorn',
                    def: true,
                    wn: 'price.widgets.announcement.announcement',
                    rightPanelTitleKey: 'newsAnn'
                },
                // {
                //    id: 2,
                //    icon: 'fa fa-bell',
                //    def: false,
                //    wn: 'price.widgets.alert-price'
                // },
                // {
                //    id: 3,
                //    icon: 'fa fa-comment',
                //    def: false,
                //    wn: 'price.widgets.chat'
                // },
                {
                    id: 4,
                    icon: 'fa fa-eye',
                    def: false,
                    wn: 'price.widgets.watch-list.quote-watch-list',
                    rightPanelTitleKey: 'watchList'
                }
            ]
        }
    };

    var args = {
        mainPanel: {
            2: {
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
                            },
                            4: {
                                1: {selectedLink: 1}
                            },
                            5: {
                                1: {
                                    mode: 1,
                                    selectedLink: 1
                                } // DepthByPrice: 1, DepthByOrder: 2
                            },
                            7: {
                                1: {selectedLink: 1}
                            }
                        }
                    },
                    4: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            },
                            2: {
                                1: {selectedLink: 1}
                            },
                            3: {
                                1: {selectedLink: 1}
                            },
                            4: {
                                1: {selectedLink: 1}
                            },
                            5: {
                                1: {selectedLink: 1}
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
                    }
                }
            },
            8: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {selectedLink: 1}
                            },
                            2: {
                                1: {
                                    isClassicView: true,
                                    isThinWL: true,
                                    selectedLink: 1
                                }
                            },
                            4: {
                                1: {selectedLink: 1}
                            },
                            5: {
                                1: {
                                    dockedWidgetId: 4,
                                    selectedLink: 1
                                }
                            }
                        }
                    }
                }
            },
            6: {
                tab: {
                    1: {
                        w: {
                            1: {
                                1: {isClassicView: true}
                            },
                            2: {
                                1: {type: 11}
                            },
                            3: {
                                1: {type: 77}
                            }
                        }
                    },
                    2: {
                        w: {
                            1: {
                                1: {isClassicView: true}
                            }
                        }
                    },
                    3: {
                        w: {
                            1: {
                                1: {isClassicView: true}
                            }
                        }
                    }
                }
            }
        },

        rightPanel: {
            4: {selectedLink: 1}
        }
    };

    return {
        layout: layout,
        args: args
    };
}
