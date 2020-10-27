define('universal-app/config/lang-key', ['module'], function (module) {
    'use strict';

    /* global module */

    /*eslint-disable */
    module.exports = {
        labels: ['chartPER', 'chartPBR', 'alert'],
        messages: []
    };
    /*eslint-enable */
});
define('universal-app/controllers/chart/chart-base', ['exports', 'ember', '../base-array-controller', '../../models/shared/shared-service', './core/utils/chart-core-constants', './data/chart-data-provider', '../../app-events', './core/stock-graph', '../../models/shared/language/language-data-store'], function (exports, _ember, _baseArrayController, _sharedService, _chartCoreConstants, _chartDataProvider, _appEvents, _stockGraph, _languageDataStore) {
    'use strict';

    exports.default = _baseArrayController.default.extend({
        baseChart: null,
        chartDataProvider: null,
        symbolObj: null,
        exchange: null,
        chartStyle: _chartCoreConstants.default.ChartStyle.Area,
        chartViewPeriod: _chartCoreConstants.default.ChartViewPeriod.OneDay,
        chartCategory: _chartCoreConstants.default.ChartCategory.Intraday,
        chartInterval: _chartCoreConstants.default.ChartViewInterval.EveryMinutes,
        volumeStudyDescriptor: undefined,
        volumeViewEnabled: false,
        reloadChartData: null,
        isDisableChartControls: false,
        timeout: 3,
        errorMessage: 'Data Not Available',
        loadingTimer: null,

        priceService: _sharedService.default.getService('price'),

        // Base overrides
        onLoadWidget: function onLoadWidget() {
            this._loadWidget();
            _appEvents.default.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
            _appEvents.default.subscribeWindowResize(this, this.get('wkey'));
        },

        // Base overrides
        onUnloadWidget: function onUnloadWidget() {
            try {
                _ember.default.run.cancel(this.get('loadingTimer'));

                if (this.baseChart !== null) {
                    this.baseChart.destroyChart();
                }

                this.set('chartDataProvider', null);
                this.set('baseChart', null);

                _appEvents.default.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
                _appEvents.default.unSubscribeWindowResize(this.get('wkey'));
            } catch (e) {
                this.utils.logger.logError('[Chart Unload] Error in chart unload');
            }
        },

        // Base overrides
        onPrepareData: function onPrepareData() {
            var insType = this.get('inst');

            if (insType === this.utils.AssetTypes.Option) {
                var optionStock = _sharedService.default.getService('price').optionStockDS.getOptionStock(this.get('exg'), this.get('sym'));

                if (optionStock) {
                    this.set('exg', optionStock.get('trdExg'));
                    this.set('sym', optionStock.get('baseSym'));
                    this.set('inst', optionStock.get('inst'));
                }
            }

            this.prepareChartData();
            this.set('isIndices', this.utils.AssetTypes.isIndices(insType));
        },

        onAddSubscription: function onAddSubscription() {
            var exg = this.get('exg');
            var sym = this.get('sym');
            var inst = this.get('inst');

            if (!this.get('isIndices')) {
                this.priceService.addSymbolRequest(exg, sym, inst);
            } else {
                this.priceService.addIndexRequest(exg, sym, inst);
            }

            this.priceService.subscribePriceExchangeSummaryMetaReady(this, ['pro-chart', this.get('key')].join('-'));
        },

        onRemoveSubscription: function onRemoveSubscription() {
            var exg = this.get('exg');
            var sym = this.get('sym');
            var inst = this.get('inst');

            if (!this.get('isIndices')) {
                this.priceService.removeSymbolRequest(exg, sym, inst);
            } else {
                this.priceService.removeIndexRequest(exg, sym, inst);
            }
        },

        onResize: function onResize() {
            var baseChart = this.baseChart;

            if (baseChart) {
                this.utils.logger.logInfo('[Chart Resize] Calling Chart Revalidation FN');
                baseChart.onRevalidateChart(true);
            }
        },

        // Base overrides
        onClearData: function onClearData() {
            var baseChart = this.get('baseChart');
            var cDP = this.get('chartDataProvider');

            if (cDP) {
                cDP.removeChartDataSubscription({
                    exg: this.get('exg'),
                    sym: this.get('sym'),
                    chartPointArray: []
                });

                if (baseChart) {
                    baseChart.clearChart();
                    baseChart.clearCalcDataSource();
                    // baseChart.onResetCalcStatus();
                }

                cDP.removeChartSymbol(this.get('exg'), this.get('sym'));
            }
        },

        prepareChartData: function prepareChartData() {
            var cDP = this.get('chartDataProvider');
            var baseChart = this.get('baseChart');

            try {
                if (baseChart) {
                    baseChart.addBaseSymbol(this.get('exg'), this.get('sym')); // Todo [Ravindu] : Not a good solution

                    this.saveWidget({ exg: this.get('exg'), sym: this.get('sym') });
                }

                if (cDP) {
                    this.set('isDataAvailable', false);
                    this.set('symbolObj', _sharedService.default.getService('price').stockDS.getStock(this.get('exg'), this.get('sym')));
                    this.set('exchange', _sharedService.default.getService('price').exchangeDS.getExchange(this.get('exg')));

                    this.hideDataErrorMessage();
                    this.startLoadingProgress();
                    this.checkDataAvailable();

                    cDP.addChartSymbol(this.get('exg'), this.get('sym'), true);
                    cDP.addChartDataSubscription();

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));
                }
            } catch (e) {
                this.utils.logger.logError('[Chart Base] Error in PrepareChartData', e);
            }
        },

        onDataFromMix: function onDataFromMix(chartSymbolObj) {
            var baseChart = this.get('baseChart');

            this.hideDataErrorMessage();
            this.stopLoadingProgress();
            this.set('isDataAvailable', chartSymbolObj.chartPointArray.length !== 0);
            this.utils.logger.logInfo('Data From Server - Chart Base ' + chartSymbolObj.sym);

            if (baseChart) {
                baseChart.onReceivedData(chartSymbolObj); // Todo: [Ravindu] Receiving data process should work as discuss in design discussion - implementation should be places in chartdataprovider
            } else {
                this.set('reloadChartData', chartSymbolObj);
            }
        },

        checkDataAvailable: function checkDataAvailable() {
            var that = this;
            var timeOut = this.get('timeout');

            _ember.default.run.later(function () {
                if (!that.get('isDataAvailable')) {
                    that.stopLoadingProgress();
                    that.showDataErrorMessage();
                }
            }, timeOut * 1000);
        },

        onDataErrorFromMix: function onDataErrorFromMix(exg, sym) {
            this.stopLoadingProgress();

            if (this._isBaseSymbol(exg, sym)) {
                this.showDataErrorMessage();
            }
        },

        onDataFromRealtime: function onDataFromRealtime(ohlcPoint, exg, sym) {
            var baseChart = this.get('baseChart');

            if (baseChart) {
                baseChart.onReceivedRealtimePoint(ohlcPoint, exg, sym); // Todo: [Ravindu] Receiving data process should work as discuss in design discussion - implementation should be places in chartdataprovider
            }
        },

        onFinishedLoadingNewChart: function onFinishedLoadingNewChart() {
            // This is a call-back function that will be triggered after finished chart drawing
        },

        onLanguageChanged: function onLanguageChanged() {
            var baseChart = this.get('baseChart');

            if (baseChart) {
                baseChart.onLanguageChanged();
            }
        },

        initChart: function initChart(params) {
            var that = this;

            try {
                params.langObj = _languageDataStore.default.getLanguageObj();
                params.chartDataProvider = this.get('chartDataProvider');

                var baseChart = new _stockGraph.default(params);

                baseChart.chartStyle = this.get('chartStyle');
                baseChart.addBaseSymbol(this.get('exg'), this.get('sym')); // Todo [Ravindu] : Not a good solution

                this.saveWidget({ exg: this.get('exg'), sym: this.get('sym') });
                that.set('baseChart', baseChart);

                that.onLoadLayout();
                baseChart.setPeriodicity(that.get('chartCategory').RowTickFormat, that.get('chartInterval').PerSeconds);

                baseChart.onFinishedDrawingChart = function (callbackType, params) {
                    that.onAfterFinishedDrawingChart(callbackType, params);
                };

                if (that.onCheckVolumeChartEnabler()) {
                    that.onDisplayVolume();
                }

                // InitChart and onDataFromMix are parallel activities. If onDataFromMix is invoked before initChart, loading params are stored and invoke again onDataFromMix in end of initChart
                var reloadParams = this.get('reloadChartData');

                if (reloadParams) {
                    this.onDataFromMix(reloadParams);
                    this.set('reloadChartData', null);
                }
            } catch (e) {
                that.utils.logger.logError('Error in init from chartbase ' + e);
            }
        },

        onGetRangeOfChartRecords: function onGetRangeOfChartRecords() {
            // Subclass may overrides to provide required data range for chart
        },

        onGetChartInitialBulkRecords: function onGetChartInitialBulkRecords() {
            // Subclass should overrides to provide initial data set for chart
        },

        onAfterFinishedDrawingChart: function onAfterFinishedDrawingChart() {
            // Subclasses can override this method for call their actions after finished chart drawing
            // This will be invoked on redraw and revalidate chart events.
        },

        onBeforeFinishedDrawingChart: function onBeforeFinishedDrawingChart() {
            // Subclasses can override this method for call their actions before finished chart drawing
        },

        /* *
         * Load layout from given priority.
         *  01) User Layout
         *  02) Default Layout
         */

        onLoadLayout: function onLoadLayout() {
            // Subclasses should override this to load layout
        },

        onCheckVolumeChartEnabler: function onCheckVolumeChartEnabler() {
            return true; // Subclasses may override this hook with their own implementation
        },

        onDisplayVolume: function onDisplayVolume() {
            var baseChart = this.get('baseChart');
            var vSD = void 0;

            if (baseChart) {
                if (!this.get('volumeViewEnabled')) {
                    vSD = baseChart.quickAddStudy('vchart');

                    this.set('volumeStudyDescriptor', vSD);
                    this.set('volumeViewEnabled', true);
                    this.saveWidget({ volumeStudyDescriptor: vSD, volumeViewEnabled: false }); // Volume view enables is set oppsit condition to open in next reload
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['volume', ':checked'].join(''));
                } else {
                    vSD = this.get('volumeStudyDescriptor');

                    if (vSD) {
                        baseChart.removeAddedChart(vSD);
                    }

                    this.set('volumeStudyDescriptor', undefined);
                    this.set('volumeViewEnabled', false);
                    this.saveWidget({ volumeStudyDescriptor: '', volumeViewEnabled: true }); // Volume view enables is set oppsit condition to open in next reload
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['volume', ':unchecked'].join(''));
                }
            }
        },

        themeChanged: function themeChanged() {
            try {
                var baseChart = this.get('baseChart');

                if (baseChart) {
                    baseChart.onThemeChanged();
                }
            } catch (e) {
                this.utils.logger.logError('Error in theme changing' + e);
            }
        },

        _loadWidget: function _loadWidget() {
            var that = this;

            that.set('chartDataProvider', _chartDataProvider.default.create({
                chartCategory: that.chartCategory,
                chartDataLevel: that.chartViewPeriod.ChartDataLevel,
                chartViewPeriod: that.chartViewPeriod,
                wKey: that.get('wkey'),

                onData: function onData(ohlcPoint, exg, sym) {
                    that.onDataFromRealtime(ohlcPoint, exg, sym);
                },

                onDataChunk: function onDataChunk(chartSymbolObj) {
                    that.onDataFromMix(chartSymbolObj);
                },

                onErrorFn: function onErrorFn(exg, sym) {
                    that.onDataErrorFromMix(exg, sym);
                }
            }));
        },

        _isBaseSymbol: function _isBaseSymbol(exg, sym) {
            if (exg && sym) {
                return this.get('exg') === exg && this.get('sym') === sym;
            }

            return false;
        }
    });
});
define('universal-app/controllers/chart/components/pie-chart', ['exports', 'd3'], function (exports, _d) {
    'use strict';

    exports.default = function () {

        var svg;
        var pie;
        var arc;
        var outerArc;
        var width = 125;
        var height = 95;
        var radius;
        var color;
        var indexPctChange;

        var key = function key(d) {
            return d.data.label;
        };

        var key1 = function key1(d) {
            return d.data.labelDes;
        };

        var indexSym = function indexSym(d) {
            return d.data.indexVal;
        };

        var indexChg = function indexChg(d) {
            return d.data.indexVal;
        };

        var _setColor = function _setColor(labels, colours) {
            color = _d.default.scale.ordinal().domain(labels).range(colours);
        };

        var _setData = function _setData(val, labelDes, indexVal, indexPctChg) {
            var labels = color.domain();
            var labelsLength = labels.length;
            indexPctChange = indexPctChg;
            var data = [];
            for (var i = 0; i < labelsLength; i++) {
                data.push({
                    label: labels[i],
                    value: val[i],
                    labelDes: labelDes[i],
                    indexVal: indexVal,
                    indexPctChg: indexPctChg
                });
            }

            return data;
        };

        var _midAngle = function _midAngle(d) {
            return d.startAngle + (d.endAngle - d.startAngle) / 2;
        };

        var init = function init() {

            svg = _d.default.select('#sector_chart').append('svg');
            svg.attr('width', '100%');
            svg.attr('height', '100%');
            svg.attr('viewBox', '0 0 ' + Math.min(width, height) + ' ' + Math.min(width, height));
            svg.attr('preserveAspectRatio', 'xMinYMin');
            svg = svg.append('g');
            svg.append('g').attr('class', 'slices');
            svg.append('g').attr('class', 'labels');
            svg.append('g').attr('class', 'labelsDes');
            svg.append('g').attr('class', 'lines');
            svg.append('g').attr('class', 'indexVal');
            svg.append('g').attr('class', 'indexChg');

            radius = Math.min(width, height) / 2.5;

            pie = _d.default.layout.pie().sort(null).value(function (d) {
                return d.value;
            });

            arc = _d.default.svg.arc().outerRadius(radius * 0.8).innerRadius(radius * 0.6);
            outerArc = _d.default.svg.arc().innerRadius(radius * 0.9).outerRadius(radius * 0.9);
            svg.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
        };

        var deInit = function deInit() {
            svg = null;
            pie = null;
            arc = null;
            outerArc = null;
        };

        var _update = function _update(data) {
            /* ------- PIE SLICES -------*/
            var slice = svg.select('.slices').selectAll('path.slice').data(pie(data), key);
            slice.enter().insert('path').style('fill', function (d) {
                return color(d.data.label);
            }).attr('class', 'slice');
            slice.transition().duration(1000).attrTween('d', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    return arc(interpolate(t));
                };
            });

            slice.exit().remove();
            /* ------- TEXT LABELS -------*/
            var text = svg.select('.labels').selectAll('text').data(pie(data), key);
            text.enter().append('text').attr('dy', '1.10em').text(function (d) {
                return d.data.label;
            });

            text.transition().duration(1000).attrTween('transform', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var d2 = interpolate(t);
                    var pos = outerArc.centroid(d2);
                    pos[0] = radius * (_midAngle(d2) < Math.PI ? 1 : -1);
                    return 'translate(' + pos + ')';
                };
            }).styleTween('text-anchor', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var d2 = interpolate(t);
                    return _midAngle(d2) < Math.PI ? 'start' : 'end';
                };
            });

            text.exit().remove();

            var indexCss = '';
            var indexValCss = '';

            if (indexPctChange < 0) {
                indexCss = 'red-dark-chart chart-font-12';
                indexValCss = 'red-chart chart-font-12';
            } else if (indexPctChange > 0) {
                indexCss = 'green-dark-chart chart-font-12';
                indexValCss = 'green-chart chart-font-12';
            }

            /* ------- MAIN INDEX VALUE -------*/
            var idxVal = svg.select('.indexVal').selectAll('text').data(pie(data), indexSym);
            idxVal.enter().append('text').attr('dy', '0.20em').style('text-anchor', 'middle').style('font-size', '11px').attr('class', indexValCss).text(function (d) {
                return d.data.indexVal;
            });

            idxVal.exit().remove();

            /* ------- MAIN INDEX CHANGE-------*/
            var idxChg = svg.select('.indexChg').selectAll('text').data(pie(data), indexChg);
            idxChg.enter().append('text').attr('dy', '1em').style('text-anchor', 'middle').style('font-size', '10px').attr('class', indexCss).text(function (d) {
                return d.data.indexPctChg;
            });

            idxChg.exit().remove();

            /* ------- SHORT DESCRIPTION LABEL  -------*/
            var ldes = svg.select('.labelsDes').selectAll('text').data(pie(data), key1);
            ldes.enter().append('text').attr('dy', '-0.3em').text(function (d) {
                return d.data.labelDes;
            });

            ldes.transition().duration(1000).attrTween('transform', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var d2 = interpolate(t);
                    var pos = outerArc.centroid(d2);
                    pos[0] = radius * (_midAngle(d2) < Math.PI ? 1 : -1);
                    return 'translate(' + pos + ')';
                };
            }).styleTween('text-anchor', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var d2 = interpolate(t);
                    return _midAngle(d2) < Math.PI ? 'start' : 'end';
                };
            });

            ldes.exit().remove();

            /* ------- SLICE TO TEXT POLYLINES -------*/
            var polyline = svg.select('.lines').selectAll('polyline').data(pie(data), key);
            polyline.enter().append('polyline');

            polyline.transition().duration(1000).attrTween('points', function (d) {
                this._current = this._current || d;
                var interpolate = _d.default.interpolate(this._current, d);
                this._current = interpolate(0);
                return function (t) {
                    var d2 = interpolate(t);
                    var pos = outerArc.centroid(d2);
                    pos[0] = radius * 0.95 * (_midAngle(d2) < Math.PI ? 1 : -1);
                    return [arc.centroid(d2), outerArc.centroid(d2), pos];
                };
            });

            polyline.exit().remove();
        };

        var change = function change(val, label, arcColor, labelDes, indexVal, indexPctChg) {
            _setColor(label, arcColor);
            _update(_setData(val, labelDes, indexVal, indexPctChg));
        };

        /**
         * Exposed functions to public
         */
        return {
            init: init,
            deInit: deInit,
            update: change
        };
    }();
});
define('universal-app/controllers/chart/core/calc-strategy/acc-dis-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var AccDistrCalcStrategy = function (_CalculationStrategy) {
        _inherits(AccDistrCalcStrategy, _CalculationStrategy);

        function AccDistrCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, AccDistrCalcStrategy);

            return _possibleConstructorReturn(this, (AccDistrCalcStrategy.__proto__ || Object.getPrototypeOf(AccDistrCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Accumulation Distribution
         */

        _createClass(AccDistrCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(AccDistrCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(AccDistrCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var total = 0,
                        quote = void 0,
                        yClose = void 0,
                        todayAD = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        quote = quotes[i];
                        yClose = quotes[i - 1].Close;

                        if (!quote) {
                            continue;
                        }

                        todayAD = 0;

                        if (quote.Close > yClose) {
                            todayAD = quote.Close - Math.min(quote.Low, yClose);
                        } else if (quote.Close < yClose) {
                            todayAD = quote.Close - Math.max(quote.High, yClose);
                        }

                        if (this.cp.inputs['useVolume']) {
                            todayAD *= quote.Volume;
                        }

                        total += todayAD;
                        quote[dataKey] = total;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Accumulation Distribution ' + e);
                }
            }
        }]);

        return AccDistrCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = AccDistrCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/adx-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies', './calc-strategy-helpers'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies, _calcStrategyHelpers) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ADXCalcStrategy = function (_CalculationStrategy) {
        _inherits(ADXCalcStrategy, _CalculationStrategy);

        function ADXCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, ADXCalcStrategy);

            var _this = _possibleConstructorReturn(this, (ADXCalcStrategy.__proto__ || Object.getPrototypeOf(ADXCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.atr = new _chartProperty.default(that.cp.stageProperty);
            that.atr.studyKey = _chartStudies.default.Indicators.AverageTrueRange.ChartIndID;

            that.atr.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.atr.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.atr));

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();

            that.minusDI = new _chartProperty.default(that.cp.stageProperty);
            that.minusDI.studyKey = _chartStudies.default.Indicators.DirectionalMovementMinusDI.ChartIndID;

            that.minusDI.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.minusDI.generateStudyId();

            that.plusDI = new _chartProperty.default(that.cp.stageProperty);
            that.plusDI.studyKey = _chartStudies.default.Indicators.DirectionalMovementPlusDI.ChartIndID;

            that.plusDI.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.plusDI.generateStudyId();

            if (that.cp.inputs.shading) {
                that.cp.channelFillBands = {
                    topBand: that.plusDI.plotInfos[0],
                    bottomBand: that.minusDI.plotInfos[0]
                };
            }
            return _this;
        }

        /**
         * Directional Movement - ADX
         */

        _createClass(ADXCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(ADXCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(ADXCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet,
                        inputs = this.cp.inputs,
                        adxDataKey = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, _chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID).propertyKey,
                        minusDIInfo = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'Minus-DI'),
                        plusDIInfo = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'Plus-DI');
                    var period = parseInt(inputs.period, 10),
                        smoothing = parseInt(inputs['Smoothing Period'], 10),
                        // If smoothing period to be enabled adx chart strategy should have smoothing period input
                    smoothTR = 0,
                        smoothPlusDM = 0,
                        smoothMinusDM = 0,
                        runningDX = 0,
                        plusDM = void 0,
                        minusDM = void 0,
                        plusDI = void 0,
                        minusDI = void 0,
                        DX = void 0,
                        quote = void 0;

                    period = period <= 0 ? 1 : period;
                    smoothing = !smoothing && smoothing !== 0 ? period : smoothing;

                    if (minusDIInfo && plusDIInfo) {
                        // ADX is used by adxr and adxr only need adx plot calculation
                        minusDIInfo.propertyKey = this.minusDI.propertyKey; // To reuse DI calculations, done this change
                        plusDIInfo.propertyKey = this.plusDI.propertyKey;
                    }

                    for (var i = 1; i < quotes.length; i++) {
                        plusDM = Math.max(0, quotes[i].High - quotes[i - 1].High);
                        minusDM = Math.max(0, quotes[i - 1].Low - quotes[i].Low);

                        if (plusDM > minusDM) {
                            minusDM = 0;
                        } else if (minusDM > plusDM) {
                            plusDM = 0;
                        } else {
                            plusDM = minusDM = 0;
                        }

                        if (i <= period) {
                            smoothPlusDM += plusDM;
                            smoothMinusDM += minusDM;
                            smoothTR += quotes[i][this.trueRange.propertyKey];

                            if (i < period) {
                                continue;
                            }
                        } else {
                            smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
                            smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
                            smoothTR = smoothTR - smoothTR / period + quotes[i][this.trueRange.propertyKey];
                        }

                        plusDI = 100 * smoothPlusDM / smoothTR;
                        minusDI = 100 * smoothMinusDM / smoothTR;
                        DX = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI);

                        if (minusDIInfo && plusDIInfo) {
                            quotes[i][plusDIInfo.propertyKey] = plusDI;
                            quotes[i][minusDIInfo.propertyKey] = minusDI;
                        }

                        if (inputs.series && smoothing) {
                            // ADX Series
                            if (i < period + smoothing - 1) {
                                runningDX += DX;
                            } else if (i === period + smoothing - 1) {
                                quotes[i][adxDataKey] = runningDX / smoothing;
                            } else {
                                quotes[i][adxDataKey] = (quotes[i - 1][adxDataKey] * (smoothing - 1) + DX) / smoothing;
                            }
                        }
                    }

                    if (inputs.histogram) {
                        var histoDataKey = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'Histo').propertyKey;

                        for (var _i = period - 1; _i < quotes.length; _i++) {
                            quote = quotes[_i];

                            if (!quote[plusDIInfo.propertyKey] && quote[plusDIInfo.propertyKey] !== 0 || !quote[minusDIInfo.propertyKey] && quote[minusDIInfo.propertyKey] !== 0) {
                                continue;
                            }

                            quote[histoDataKey] = quote[plusDIInfo.propertyKey] - quote[minusDIInfo.propertyKey];
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating directional movement ADX ' + e);
                }
            }
        }]);

        return ADXCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = ADXCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/adxr-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ADXRCalcStrategy = function (_CalculationStrategy) {
        _inherits(ADXRCalcStrategy, _CalculationStrategy);

        function ADXRCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, ADXRCalcStrategy);

            var _this = _possibleConstructorReturn(this, (ADXRCalcStrategy.__proto__ || Object.getPrototypeOf(ADXRCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.adx = new _chartProperty.default(that.cp.stageProperty);
            that.adx.studyKey = _chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID;

            if (_this.adx.plotInfos && _this.adx.plotInfos.length > 0) {
                _this.adx.plotInfos[0].key = _chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID;
            }

            that.adx.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field,
                series: true,
                shading: false,
                histogram: false
            };

            that.adx.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.adx));

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();
            return _this;
        }

        /**
         * Directional Movement - ADXR
         */

        _createClass(ADXRCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(ADXRCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(ADXRCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet,
                        dataKey = this.cp.plotInfos[0].propertyKey,
                        adxK = this.adx.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10),
                        currentADX = void 0,
                        oldADX = void 0;

                    period = isNaN(period) ? 14 : period;

                    for (var j = period * 3; j < quotes.length; j++) {
                        currentADX = quotes[j][adxK];
                        oldADX = quotes[j - period][adxK];
                        quotes[j][dataKey] = (currentADX + oldADX) / 2;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating directional movement ADXR ' + e);
                }
            }
        }]);

        return ADXRCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = ADXRCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/atr-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ATRCalcStrategy = function (_CalculationStrategy) {
        _inherits(ATRCalcStrategy, _CalculationStrategy);

        function ATRCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, ATRCalcStrategy);

            var _this = _possibleConstructorReturn(this, (ATRCalcStrategy.__proto__ || Object.getPrototypeOf(ATRCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();
            return _this;
        }

        /**
         * Average True Range Calculation
         */

        _createClass(ATRCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(ATRCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(ATRCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var total = 0,
                        quote = void 0,
                        prevDay = void 0,
                        trueRange = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        quote = quotes[i];
                        prevDay = quotes[i - 1];

                        trueRange = Math.max(quote.High, prevDay.Close) - Math.min(quote.Low, prevDay.Close);
                        total += trueRange;

                        if (i > period) {
                            total -= quotes[i - period][this.trueRange.propertyKey];
                        }

                        quote[this.trueRange.propertyKey] = trueRange;
                        // quote['Sum True Range ' + sd.name] = total;

                        if (i === period) {
                            quote[dataKey] = total / period;
                        } else if (i > period) {
                            quote[dataKey] = (prevDay[dataKey] * (period - 1) + trueRange) / period;
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating average true range ' + e);
                }
            }
        }]);

        return ATRCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = ATRCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/bb-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../../core/utils/chart-studies', './calc-strategy-helpers', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartStudies, _calcStrategyHelpers, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var BBCalcStrategy = function (_CalculationStrategy) {
        _inherits(BBCalcStrategy, _CalculationStrategy);

        function BBCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, BBCalcStrategy);

            var _this = _possibleConstructorReturn(this, (BBCalcStrategy.__proto__ || Object.getPrototypeOf(BBCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.centerMA = new _chartProperty.default(that.cp.stageProperty);
            that.centerMA.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            that.centerMA.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field,
                offset: 0,
                maType: that.cp.inputs.maType
            };

            that.centerMA.generateStudyId();

            that.offsetStdDev = new _chartProperty.default(that.cp.stageProperty);
            that.offsetStdDev.studyKey = _chartStudies.default.Indicators.STD_DEV.ChartIndID;

            that.offsetStdDev.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field,
                stndDev: 1,
                maType: that.cp.inputs.maType,
                offset: 0
            };

            that.offsetStdDev.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.centerMA));
            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.offsetStdDev));

            if (that.cp.inputs.channelFill) {
                that.cp.channelFillBands = {
                    topBand: that.cp.plotInfos[0],
                    medianBand: that.cp.plotInfos[1],
                    bottomBand: that.cp.plotInfos[2]
                };
            }
            return _this;
        }

        /**
         * Bollinger Band Calculation
         */

        _createClass(BBCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                try {
                    _get(BBCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(BBCalcStrategy.prototype), 'calculate', this).call(this); // Todo: [Ravindu] Handle is calculated in common place instead of checking every calculation strategy

                    if (!this.isCalculated) {
                        _calcStrategyHelpers.default.calculateGenericEnvelope(this.cp, this.basedDataSet, this.cp.inputs['stndDev'], this.centerMA.propertyKey, this.offsetStdDev.propertyKey, 0);

                        this.isCalculated = true;
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating bollinger band ' + e);
                }
            }
        }]);

        return BBCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = BBCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/calc-strategy-helpers', ['exports', '../../../../utils/utils'], function (exports, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var CalcStrategyHelpers = function () {
        function CalcStrategyHelpers() {
            _classCallCheck(this, CalcStrategyHelpers);
        }

        _createClass(CalcStrategyHelpers, null, [{
            key: 'calculateGenericEnvelope',
            value: function calculateGenericEnvelope(cp, basedDataSet, percentShift, centerIndex, offsetIndex, pointShift) {
                var quotes = basedDataSet;
                var quote = void 0,
                    totalShift = void 0;

                try {
                    for (var i = 0; quotes && i < quotes.length; i++) {
                        quote = quotes[i];

                        if (!quote) {
                            continue;
                        }

                        if (!quote[centerIndex]) {
                            continue;
                        }

                        totalShift = percentShift * quote[offsetIndex] + pointShift;

                        quote['Top' + '-' + cp.propertyKey] = quote[centerIndex] + totalShift; // Todo: [Ravindu] Make a good design for link with calculation in calculation strategy.
                        quote['Bottom' + '-' + cp.propertyKey] = quote[centerIndex] - totalShift;
                        quote['Median' + '-' + cp.propertyKey] = quote[centerIndex];
                        /* quote['Bandwidth ' + sd.name] = 200 * totalShift / quote[centerIndex];
                         quote['%b ' + sd.name] = 50 * ((quote.Close - quote[centerIndex]) / totalShift + 1);*/
                    }
                } catch (e) {
                    _utils.default.logger.logError(' [Calculation Strategy Helper] Calculating dynamic channel (Range) ' + e);
                }
            }
        }, {
            key: 'getPlotInfoFromKey',
            value: function getPlotInfoFromKey(plotInfos, key) {
                var plotInfo = void 0;

                $.each(plotInfos, function (index, info) {
                    if (info.key.indexOf(key) >= 0) {
                        plotInfo = info;
                    }
                });

                return plotInfo;
            }
        }]);

        return CalcStrategyHelpers;
    }();

    exports.default = CalcStrategyHelpers;
});
define('universal-app/controllers/chart/core/calc-strategy/calc_strategy-factory', ['exports', './ma-calc-strategy', './bb-calc-strategy', './stand-dev-calc-strategy', '../utils/chart-studies', './rateOfChg-calc-strategy', './expo-ma-calc-strategy', './triangular-ma-calc-strategy', './timeseries-ma-calc-strategy', './variable-ma-calc-strategy', './weighted-ma-calc-strategy', './macd-calc-strategy', './atr-calc-strategy', './plus-di-calc-strategy', './minus-di-calc-strategy', './dx-calc-strategy', './adx-calc-strategy', './adxr-calc-strategy', './acc-dis-calc-strategy', './time-forc-calc-strategy', './chaikin-mf-calc-strategy', './trix-calc-strategy', './cci-calc-strategy', './rsi-calc-strategy', './psar-calc-strategy', './williams-per-r-calc-strategy', './vol-oscillator-calc-strategy', './mfi-calc-strategy', './cmo-calc-strategy', './mp-calc-strategy', './obv-calc-strategy', './stoch-oscil-calc-strategy'], function (exports, _maCalcStrategy, _bbCalcStrategy, _standDevCalcStrategy, _chartStudies, _rateOfChgCalcStrategy, _expoMaCalcStrategy, _triangularMaCalcStrategy, _timeseriesMaCalcStrategy, _variableMaCalcStrategy, _weightedMaCalcStrategy, _macdCalcStrategy, _atrCalcStrategy, _plusDiCalcStrategy, _minusDiCalcStrategy, _dxCalcStrategy, _adxCalcStrategy, _adxrCalcStrategy, _accDisCalcStrategy, _timeForcCalcStrategy, _chaikinMfCalcStrategy, _trixCalcStrategy, _cciCalcStrategy, _rsiCalcStrategy, _psarCalcStrategy, _williamsPerRCalcStrategy, _volOscillatorCalcStrategy, _mfiCalcStrategy, _cmoCalcStrategy, _mpCalcStrategy, _obvCalcStrategy, _stochOscilCalcStrategy) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var CalcStrategyFactory = function () {
        function CalcStrategyFactory() {
            _classCallCheck(this, CalcStrategyFactory);
        }

        _createClass(CalcStrategyFactory, null, [{
            key: 'getCalcStrategy',
            value: function getCalcStrategy(calcDP, cp) {
                if (_chartStudies.default.Indicators.MovingAverage.ChartIndID === cp.studyKey) {
                    if (_chartStudies.default.MVTypes.Simple === cp.inputs.type) {
                        return new _maCalcStrategy.default(calcDP, cp);
                    } else if (_chartStudies.default.MVTypes.Exponential === cp.inputs.type) {
                        return new _expoMaCalcStrategy.default(calcDP, cp);
                    } else if (_chartStudies.default.MVTypes.TimeSeries === cp.inputs.type) {
                        return new _timeseriesMaCalcStrategy.default(calcDP, cp);
                    } else if (_chartStudies.default.MVTypes.Triangular === cp.inputs.type) {
                        return new _triangularMaCalcStrategy.default(calcDP, cp);
                    } else if (_chartStudies.default.MVTypes.Variable === cp.inputs.type) {
                        return new _variableMaCalcStrategy.default(calcDP, cp);
                    } else if (_chartStudies.default.MVTypes.Weighted === cp.inputs.type) {
                        return new _weightedMaCalcStrategy.default(calcDP, cp);
                    } else {
                        return new _maCalcStrategy.default(calcDP, cp);
                    }
                } else if (_chartStudies.default.Indicators.BollingerBands.ChartIndID === cp.studyKey) {
                    return new _bbCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.STD_DEV.ChartIndID === cp.studyKey) {
                    return new _standDevCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.Momentum.ChartIndID === cp.studyKey) {
                    return new _rateOfChgCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.ExponentialMV.ChartIndID === cp.studyKey || _chartStudies.default.Indicators.SignalMACD.ChartIndID === cp.studyKey && _chartStudies.default.MVTypes.Exponential === cp.inputs.maType) {
                    return new _expoMaCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.MACD.ChartIndID === cp.studyKey) {
                    return new _macdCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.WildersSmoothing.ChartIndID === cp.studyKey) {
                    return new _expoMaCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.AverageTrueRange.ChartIndID === cp.studyKey) {
                    return new _atrCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementPlusDI.ChartIndID === cp.studyKey) {
                    return new _plusDiCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementMinusDI.ChartIndID === cp.studyKey) {
                    return new _minusDiCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementDX.ChartIndID === cp.studyKey) {
                    return new _dxCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID === cp.studyKey) {
                    return new _adxCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementADXR.ChartIndID === cp.studyKey) {
                    return new _adxrCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.AccumulationDistribution.ChartIndID === cp.studyKey) {
                    return new _accDisCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.TimeSeriesForecast.ChartIndID === cp.studyKey) {
                    return new _timeForcCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.ChaikinMF.ChartIndID === cp.studyKey) {
                    return new _chaikinMfCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.TRIX.ChartIndID === cp.studyKey) {
                    return new _trixCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.CommodityChannelIndex.ChartIndID === cp.studyKey) {
                    return new _cciCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.RelativeStrengthIndex.ChartIndID === cp.studyKey) {
                    return new _rsiCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.PSAR.ChartIndID === cp.studyKey) {
                    return new _psarCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.WilliamsPerR.ChartIndID === cp.studyKey) {
                    return new _williamsPerRCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.VolOsc.ChartIndID === cp.studyKey) {
                    return new _volOscillatorCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.MoneyFlowIndex.ChartIndID === cp.studyKey) {
                    return new _mfiCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.ChandeMomentumOscillator.ChartIndID === cp.studyKey) {
                    return new _cmoCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.MedianPrice.ChartIndID === cp.studyKey) {
                    return new _mpCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.onBalanceVolume.ChartIndID === cp.studyKey) {
                    return new _obvCalcStrategy.default(calcDP, cp);
                } else if (_chartStudies.default.Indicators.StochasticOscillator.ChartIndID === cp.studyKey) {
                    return new _stochOscilCalcStrategy.default(calcDP, cp);
                }
            }
        }]);

        return CalcStrategyFactory;
    }();

    exports.default = CalcStrategyFactory;
});
define('universal-app/controllers/chart/core/calc-strategy/calculation-strategy', ['exports', '../../../../utils/utils'], function (exports, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var CalculationStrategy = function () {
        function CalculationStrategy(calcDataProvider, cp) {
            _classCallCheck(this, CalculationStrategy);

            this.calcDP = calcDataProvider;
            this.cp = cp;
            this.calcStrategies = [];
            this.isCalculated = false;
            this.basedOnSym = ''; // Symbol which is based for calculation
            this.basedDataSet = []; // Data Set which is based for calculation
        }

        _createClass(CalculationStrategy, [{
            key: 'calculate',
            value: function calculate() {
                // Todo: [Ravindu] Improve below logic to start calculation from last calculated point
                var that = this;

                for (var i = 0; i < that.calcStrategies.length; i++) {
                    try {
                        if (!that.calcStrategies[i].isCalculated) {
                            _utils.default.logger.logInfo('[Drw Path] Calculating - ' + that.calcStrategies[i].cp.propertyKey);
                            // Setting super base data set to child calc strategies
                            that.calcStrategies[i].basedDataSet = that.basedDataSet; // Todo: [Ravindu] Check if this line is violating design principles
                            that.calcStrategies[i].calculate();
                            that.calcStrategies[i].isCalculated = true;
                        }
                    } catch (e) {
                        _utils.default.logger.logError('Error in calculate strategies');
                    }
                }
                // that.isCalculated = true;
            }
        }]);

        return CalculationStrategy;
    }();

    exports.default = CalculationStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/cci-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CCICalcStrategy = function (_CalculationStrategy) {
        _inherits(CCICalcStrategy, _CalculationStrategy);

        function CCICalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, CCICalcStrategy);

            var _this = _possibleConstructorReturn(this, (CCICalcStrategy.__proto__ || Object.getPrototypeOf(CCICalcStrategy)).call(this, calcDataProvider, cp));

            _this.sourceField = 'HLC3';
            _this.cciSMA = _this._calculateSimpleMV(_this.sourceField);
            return _this;
        }

        /**
         * Commodity Channel Index
         */


        _createClass(CCICalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(CCICalcStrategy.prototype.__proto__ || Object.getPrototypeOf(CCICalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    var period = parseInt(this.cp.inputs.period, 10);
                    var quote = void 0,
                        md = void 0;

                    period = period <= 0 ? 1 : period;

                    for (var i = period - 1; i < quotes.length; i++) {
                        quote = quotes[i];
                        md = 0;

                        if (!quote) continue;

                        for (var j = 0; j < period; j++) {
                            md += Math.abs(quotes[i - j][this.sourceField] - quote[this.cciSMA]);
                        }

                        md /= period;

                        quotes[i][dataKey] = (quote[this.sourceField] - quote[this.cciSMA]) / (0.015 * md);
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating CCI ' + e);
                }
            }
        }, {
            key: '_calculateSimpleMV',
            value: function _calculateSimpleMV(field) {
                this.sma = new _chartProperty.default(this.cp.stageProperty);
                this.sma.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

                this.sma.inputs = {
                    period: this.cp.inputs.period,
                    field: field,
                    offset: 0
                };

                var smaKey = this.sma.generateStudyId();

                this.calcStrategies.push(this.calcDP.getCalculationStrategy(this.sma));
                return smaKey;
            }
        }]);

        return CCICalcStrategy;
    }(_calculationStrategy.default);

    exports.default = CCICalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/chaikin-mf-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ChaikinMFCalcStrategy = function (_CalculationStrategy) {
        _inherits(ChaikinMFCalcStrategy, _CalculationStrategy);

        function ChaikinMFCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, ChaikinMFCalcStrategy);

            var _this = _possibleConstructorReturn(this, (ChaikinMFCalcStrategy.__proto__ || Object.getPrototypeOf(ChaikinMFCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.mfv = new _chartProperty.default(that.cp.stageProperty);
            that.mfv.studyKey = 'MFV';

            that.mfv.inputs = {
                period: that.cp.inputs.period
            };

            that.mfv.generateStudyId();
            return _this;
        }

        /**
         * Chaikin Money Flow
         */

        _createClass(ChaikinMFCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(ChaikinMFCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(ChaikinMFCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var sumMoneyFlow = 0,
                        sumVolume = 0;

                    for (var i = 0; i < quotes.length; i++) {
                        if (quotes[i].High === quotes[i].Low) {
                            quotes[i][this.mfv.propertyKey] = 0;
                        } else {
                            quotes[i][this.mfv.propertyKey] = quotes[i].Volume * (2 * quotes[i].Close - quotes[i].High - quotes[i].Low) / (quotes[i].High - quotes[i].Low);
                        }

                        sumMoneyFlow += quotes[i][this.mfv.propertyKey];
                        sumVolume += quotes[i].Volume;

                        if (i > period - 1) {
                            sumMoneyFlow -= quotes[i - period][this.mfv.propertyKey];
                            sumVolume -= quotes[i - period].Volume;

                            if (sumVolume) {
                                quotes[i][dataKey] = sumMoneyFlow / sumVolume;
                            }
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Chaikin Money Flow ' + e);
                }
            }
        }]);

        return ChaikinMFCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = ChaikinMFCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/cmo-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CMOCalcStrategy = function (_CalculationStrategy) {
        _inherits(CMOCalcStrategy, _CalculationStrategy);

        function CMOCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, CMOCalcStrategy);

            return _possibleConstructorReturn(this, (CMOCalcStrategy.__proto__ || Object.getPrototypeOf(CMOCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Chande Momentum Oscillator
         */


        _createClass(CMOCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(CMOCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(CMOCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10);
                    var sumMomentum = 0,
                        absSumMomentum = 0,
                        diff = void 0,
                        old = void 0;
                    var history = [];

                    period = period <= 0 ? 1 : period;

                    for (var i = 1; i < quotes.length; i++) {
                        diff = quotes[i].Close - quotes[i - 1].Close;
                        history.push(diff);

                        sumMomentum += diff;
                        absSumMomentum += Math.abs(diff);

                        if (history.length === period) {
                            quotes[i][dataKey] = 100 * sumMomentum / absSumMomentum;

                            old = history.shift();

                            sumMomentum -= old;
                            absSumMomentum -= Math.abs(old);
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating CMO ' + e);
                }
            }
        }]);

        return CMOCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = CMOCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/dx-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var DXCalcStrategy = function (_CalculationStrategy) {
        _inherits(DXCalcStrategy, _CalculationStrategy);

        function DXCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, DXCalcStrategy);

            var _this = _possibleConstructorReturn(this, (DXCalcStrategy.__proto__ || Object.getPrototypeOf(DXCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.atr = new _chartProperty.default(that.cp.stageProperty);
            that.atr.studyKey = _chartStudies.default.Indicators.AverageTrueRange.ChartIndID;

            that.atr.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.atr.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.atr));

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();
            return _this;
        }

        /**
         * Directional Movement - DX
         */

        _createClass(DXCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(DXCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(DXCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var smoothTR = 0,
                        smoothPlusDM = 0,
                        smoothMinusDM = 0,
                        plusDM = void 0,
                        minusDM = void 0,
                        plusDI = void 0,
                        DX = void 0,
                        minusDI = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        if (!quotes[i] || !quotes[i - 1]) {
                            continue;
                        }

                        plusDM = Math.max(0, quotes[i].High - quotes[i - 1].High);
                        minusDM = Math.max(0, quotes[i - 1].Low - quotes[i].Low);

                        if (plusDM > minusDM) {
                            minusDM = 0;
                        } else if (minusDM > plusDM) {
                            plusDM = 0;
                        } else {
                            plusDM = minusDM = 0;
                        }

                        if (i <= period) {
                            smoothPlusDM += plusDM;
                            smoothMinusDM += minusDM;
                            smoothTR += quotes[i][this.trueRange.propertyKey];

                            if (i < period) {
                                continue;
                            }
                        } else {
                            smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
                            smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
                            smoothTR = smoothTR - smoothTR / period + quotes[i][this.trueRange.propertyKey];
                        }

                        plusDI = 100 * smoothPlusDM / smoothTR;
                        minusDI = 100 * smoothMinusDM / smoothTR;
                        DX = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI);
                        quotes[i][dataKey] = DX;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating directional movement DX ' + e);
                }
            }
        }]);

        return DXCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = DXCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/expo-ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ExpoCalcStrategy = function (_CalculationStrategy) {
        _inherits(ExpoCalcStrategy, _CalculationStrategy);

        function ExpoCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, ExpoCalcStrategy);

            return _possibleConstructorReturn(this, (ExpoCalcStrategy.__proto__ || Object.getPrototypeOf(ExpoCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Moving Average Calculation - Exponential
         */

        _createClass(ExpoCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(ExpoCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(ExpoCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var inputs = this.cp.inputs;
                    var period = parseInt(inputs.period, 10);
                    var multiplier = this.cp.mvType === _chartStudies.default.MVTypes.WellesWilder ? 1 / period : 2 / (period + 1);
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var field = inputs.field;
                    var offset = parseInt(inputs.offset, 10);
                    var acc = 0,
                        ma = 0,
                        ii = 0,
                        emaPreviousDay = 0,
                        quote = void 0,
                        val = void 0;

                    offset = isNaN(offset) ? 0 : offset;

                    for (var i = 0; i < quotes.length; i++) {
                        quote = quotes[i];
                        val = quote[field];

                        if (!val && val !== 0) {
                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }

                            continue;
                        }

                        if (ii === period - 1) {
                            acc += val;
                            ma = acc / period;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = ma;
                            }
                        } else if (ii >= period) {
                            ma = (val - emaPreviousDay) * multiplier + emaPreviousDay;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = ma;
                            }
                        } else if (ii === 0) {
                            acc += val;
                            ma = acc;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }
                        } else {
                            // 1 <= li < sd.days
                            acc += val;
                            ma = acc / (ii + 1);

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }
                        }

                        emaPreviousDay = ma;
                        ii++;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating moving average ' + e);
                }
            }
        }]);

        return ExpoCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = ExpoCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MACalcStrategy = function (_CalculationStrategy) {
        _inherits(MACalcStrategy, _CalculationStrategy);

        function MACalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, MACalcStrategy);

            return _possibleConstructorReturn(this, (MACalcStrategy.__proto__ || Object.getPrototypeOf(MACalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Moving Average Calculation - Simple
         */

        _createClass(MACalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(MACalcStrategy.prototype.__proto__ || Object.getPrototypeOf(MACalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;

                    this.cp.inputs.period = this.cp.inputs.period <= 0 ? 1 : this.cp.inputs.period;

                    var acc = 0,
                        ma = 0,
                        ii = 0;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var field = this.cp.inputs.field;
                    var offset = parseInt(this.cp.inputs.offset, 10);
                    offset = isNaN(offset) ? 0 : offset;
                    var vals = [],
                        quote = void 0,
                        val = void 0,
                        val2 = void 0;

                    for (var i = 0; i < quotes.length; i++) {
                        quote = quotes[i];
                        val = quote[field];

                        if (!val && val !== 0) {
                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }

                            continue;
                        }

                        acc += val;
                        vals.push(val);

                        if (ii === this.cp.inputs.period - 1) {
                            ma = acc / this.cp.inputs.period;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = ma;
                            }
                        } else if (ii >= this.cp.inputs.period) {
                            val2 = vals.shift();
                            acc -= val2;
                            ma = acc / this.cp.inputs.period;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = ma;
                            }
                        } else if (ii === 0) {
                            ma = acc;

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }
                        } else {
                            ma = acc / (ii + 1);

                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }
                        }

                        ii++;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating moving average ' + e);
                }
            }
        }]);

        return MACalcStrategy;
    }(_calculationStrategy.default);

    exports.default = MACalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/macd-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies', '../chart-property', './calc-strategy-helpers'], function (exports, _calculationStrategy, _utils, _chartStudies, _chartProperty, _calcStrategyHelpers) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MACDCalcStrategy = function (_CalculationStrategy) {
        _inherits(MACDCalcStrategy, _CalculationStrategy);

        function MACDCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, MACDCalcStrategy);

            var _this = _possibleConstructorReturn(this, (MACDCalcStrategy.__proto__ || Object.getPrototypeOf(MACDCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            var macd1Days = parseFloat(that.cp.inputs['fastMAPeriod']);
            var macd2Days = parseFloat(that.cp.inputs['slowMAPeriod']);
            var signalDays = parseFloat(that.cp.inputs['signalPeriod']);
            var period = that.cp.inputs.period;
            that.cp.inputs.period = !period ? Math.max(macd1Days, macd2Days, signalDays) : period;

            var maType = that.cp.inputs['maType'];
            maType = !maType ? _chartStudies.default.MVTypes.Exponential : maType;

            that.fastMA = new _chartProperty.default(that.cp.stageProperty);
            that.fastMA.studyKey = _chartStudies.default.Indicators.ExponentialMV.ChartIndID;

            that.fastMA.inputs = {
                period: macd1Days,
                field: that.cp.inputs.field,
                offset: 0,
                maType: maType
            };

            that.fastMA.generateStudyId();

            that.slowMA = new _chartProperty.default(that.cp.stageProperty);
            that.slowMA.studyKey = _chartStudies.default.Indicators.ExponentialMV.ChartIndID;

            that.slowMA.inputs = {
                period: macd2Days,
                field: that.cp.inputs.field,
                offset: 0,
                maType: maType
            };

            that.slowMA.generateStudyId();

            var sigMAType = that.cp.inputs['signalMAType'];
            sigMAType = !sigMAType ? _chartStudies.default.MVTypes.Exponential : sigMAType;

            that.signalMA = new _chartProperty.default(that.cp.stageProperty);
            that.signalMA.studyKey = _chartStudies.default.Indicators.SignalMACD.ChartIndID;

            that.signalMA.inputs = {
                period: signalDays,
                field: that.cp.plotInfos[0].propertyKey,
                offset: 0,
                maType: sigMAType
            };

            that.signalMA.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.fastMA));
            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.slowMA));
            return _this;
        }

        /**
         * Calculate function for MACD study
         */

        _createClass(MACDCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(MACDCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(MACDCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = this.cp.inputs.period;
                    period = !period ? Math.max(this.fastMA.inputs.period, this.slowMA.inputs.period, this.signalMA.inputs.period) : period;

                    if (quotes.length < period + 1) {
                        this.isCalculated = true;
                        return;
                    }

                    var quote = void 0,
                        signal = void 0;
                    var macdDataKey = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'MACD').propertyKey;
                    var histoDataKey = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'Histo').propertyKey;
                    var signalDataKey = _calcStrategyHelpers.default.getPlotInfoFromKey(this.cp.plotInfos, 'Signal').propertyKey;

                    for (var i = period - 1; i < quotes.length; i++) {
                        quote = quotes[i];
                        quote[macdDataKey] = quote[this.fastMA.propertyKey] - quote[this.slowMA.propertyKey];
                    }

                    var signalCalObj = this.calcDP.getCalculationStrategy(this.signalMA); // Todo: [Ravindu] :: Wrong design

                    if (signalCalObj) {
                        signalCalObj.basedDataSet = this.basedDataSet;
                        signalCalObj.calculate();
                    }

                    for (var _i = period - 1; _i < quotes.length; _i++) {
                        quote = quotes[_i];
                        signal = quote[this.signalMA.propertyKey]; // Todo: [Ravindu] Urgent design change needed.
                        quote[signalDataKey] = signal;

                        if (!signal && signal !== 0) {
                            continue;
                        } // don't create histogram before the signal line is valid

                        quote[histoDataKey] = quote[macdDataKey] - quote[signalDataKey];
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating macd ' + e);
                }
            }
        }]);

        return MACDCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = MACDCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/mfi-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MFICalcStrategy = function (_CalculationStrategy) {
        _inherits(MFICalcStrategy, _CalculationStrategy);

        function MFICalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, MFICalcStrategy);

            return _possibleConstructorReturn(this, (MFICalcStrategy.__proto__ || Object.getPrototypeOf(MFICalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Money Flow Index
         */


        _createClass(MFICalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(MFICalcStrategy.prototype.__proto__ || Object.getPrototypeOf(MFICalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    var period = parseInt(this.cp.inputs.period, 10);
                    var cumPosMF = 0,
                        cumNegMF = 0;
                    var lastTypPrice = 0,
                        typPrice = void 0,
                        rawMoneyFlow = void 0,
                        old = void 0;
                    var directions = [];

                    period = period <= 0 ? 1 : period;

                    for (var i = 0; i < quotes.length; i++) {
                        typPrice = (quotes[i].High + quotes[i].Low + quotes[i].Close) / 3;

                        if (i > 0) {
                            rawMoneyFlow = typPrice * quotes[i].Volume;

                            if (typPrice > lastTypPrice) {
                                directions.push([1, rawMoneyFlow]);
                                cumPosMF += rawMoneyFlow;
                            } else if (typPrice < lastTypPrice) {
                                directions.push([-1, rawMoneyFlow]);
                                cumNegMF += rawMoneyFlow;
                            } else {
                                directions.push([0, 0]);
                            }

                            if (i > period) {
                                old = directions.shift();

                                if (old[0] === 1) {
                                    cumPosMF -= old[1];
                                } else if (old[0] === -1) {
                                    cumNegMF -= old[1];
                                }

                                if (cumNegMF === 0) {
                                    quotes[i][dataKey] = 100;
                                } else {
                                    quotes[i][dataKey] = 100 - 100 / (1 + cumPosMF / cumNegMF);
                                }
                            }
                        }

                        lastTypPrice = typPrice;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating MFI ' + e);
                }
            }
        }]);

        return MFICalcStrategy;
    }(_calculationStrategy.default);

    exports.default = MFICalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/minus-di-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MinusDICalcStrategy = function (_CalculationStrategy) {
        _inherits(MinusDICalcStrategy, _CalculationStrategy);

        function MinusDICalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, MinusDICalcStrategy);

            var _this = _possibleConstructorReturn(this, (MinusDICalcStrategy.__proto__ || Object.getPrototypeOf(MinusDICalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.atr = new _chartProperty.default(that.cp.stageProperty);
            that.atr.studyKey = _chartStudies.default.Indicators.AverageTrueRange.ChartIndID;

            that.atr.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.atr.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.atr));

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();
            return _this;
        }

        /**
         * Directional Movement - -DI
         */

        _createClass(MinusDICalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(MinusDICalcStrategy.prototype.__proto__ || Object.getPrototypeOf(MinusDICalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var smoothTR = 0,
                        smoothMinusDM = 0,
                        plusDM = void 0,
                        minusDM = void 0,
                        minusDI = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        if (!quotes[i] || !quotes[i - 1]) {
                            continue;
                        }

                        plusDM = Math.max(0, quotes[i].High - quotes[i - 1].High);
                        minusDM = Math.max(0, quotes[i - 1].Low - quotes[i].Low);

                        if (plusDM > minusDM) {
                            minusDM = 0;
                        } else if (minusDM > plusDM) {
                            plusDM = 0;
                        } else {
                            plusDM = minusDM = 0;
                        }

                        if (i <= period) {
                            smoothMinusDM += minusDM;
                            smoothTR += quotes[i][this.trueRange.propertyKey];

                            if (i < period) {
                                continue;
                            }
                        } else {
                            smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM;
                            smoothTR = smoothTR - smoothTR / period + quotes[i][this.trueRange.propertyKey];
                        }

                        minusDI = 100 * smoothMinusDM / smoothTR;
                        quotes[i][dataKey] = minusDI;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating directional movement -DI ' + e);
                }
            }
        }]);

        return MinusDICalcStrategy;
    }(_calculationStrategy.default);

    exports.default = MinusDICalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/mp-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MPCalcStrategy = function (_CalculationStrategy) {
        _inherits(MPCalcStrategy, _CalculationStrategy);

        function MPCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, MPCalcStrategy);

            return _possibleConstructorReturn(this, (MPCalcStrategy.__proto__ || Object.getPrototypeOf(MPCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Median Price Calculation
         */

        _createClass(MPCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(MPCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(MPCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    for (var i = 0; i < quotes.length; i++) {
                        quotes[i][dataKey] = (quotes[i]['High'] + quotes[i]['Low']) * 0.5;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating median price ' + e);
                }
            }
        }]);

        return MPCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = MPCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/obv-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var OBVCalcStrategy = function (_CalculationStrategy) {
        _inherits(OBVCalcStrategy, _CalculationStrategy);

        function OBVCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, OBVCalcStrategy);

            return _possibleConstructorReturn(this, (OBVCalcStrategy.__proto__ || Object.getPrototypeOf(OBVCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * On Balance Volume
         */

        _createClass(OBVCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(OBVCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(OBVCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var quotes = this.basedDataSet;
                    var field = this.cp.inputs.field;

                    for (var i = 0; i < quotes.length; i++) {
                        if (i == 0) {
                            quotes[i][dataKey] = 0;
                        } else {
                            if (quotes[i][field] > quotes[i - 1][field]) {
                                quotes[i][dataKey] = quotes[i - 1][dataKey] + quotes[i].Volume;
                            } else if (quotes[i][field] < quotes[i - 1][field]) {
                                quotes[i][dataKey] = quotes[i - 1][dataKey] - quotes[i].Volume;
                            } else {
                                quotes[i][dataKey] = quotes[i - 1][dataKey];
                            }
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating on balance volume ' + e);
                }
            }
        }]);

        return OBVCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = OBVCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/plus-di-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var PlusDICalcStrategy = function (_CalculationStrategy) {
        _inherits(PlusDICalcStrategy, _CalculationStrategy);

        function PlusDICalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, PlusDICalcStrategy);

            var _this = _possibleConstructorReturn(this, (PlusDICalcStrategy.__proto__ || Object.getPrototypeOf(PlusDICalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.atr = new _chartProperty.default(that.cp.stageProperty);
            that.atr.studyKey = _chartStudies.default.Indicators.AverageTrueRange.ChartIndID;

            that.atr.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.atr.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(that.atr));

            that.trueRange = new _chartProperty.default(that.cp.stageProperty);
            that.trueRange.studyKey = 'True Range';

            that.trueRange.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field
            };

            that.trueRange.generateStudyId();
            return _this;
        }

        /**
         * Directional Movement - +DI
         */

        _createClass(PlusDICalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(PlusDICalcStrategy.prototype.__proto__ || Object.getPrototypeOf(PlusDICalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var smoothTR = 0,
                        smoothPlusDM = 0,
                        plusDM = void 0,
                        minusDM = void 0,
                        plusDI = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        if (!quotes[i] || !quotes[i - 1]) {
                            continue;
                        }

                        plusDM = Math.max(0, quotes[i].High - quotes[i - 1].High);
                        minusDM = Math.max(0, quotes[i - 1].Low - quotes[i].Low);

                        if (plusDM > minusDM) {
                            minusDM = 0;
                        } else if (minusDM > plusDM) {
                            plusDM = 0;
                        } else {
                            plusDM = minusDM = 0;
                        }

                        if (i <= period) {
                            smoothPlusDM += plusDM;
                            smoothTR += quotes[i][this.trueRange.propertyKey];

                            if (i < period) {
                                continue;
                            }
                        } else {
                            smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM;
                            smoothTR = smoothTR - smoothTR / period + quotes[i][this.trueRange.propertyKey];
                        }

                        plusDI = 100 * smoothPlusDM / smoothTR;
                        quotes[i][dataKey] = plusDI;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating directional movement +DI ' + e);
                }
            }
        }]);

        return PlusDICalcStrategy;
    }(_calculationStrategy.default);

    exports.default = PlusDICalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/psar-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var PSARCalcStrategy = function (_CalculationStrategy) {
        _inherits(PSARCalcStrategy, _CalculationStrategy);

        function PSARCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, PSARCalcStrategy);

            return _possibleConstructorReturn(this, (PSARCalcStrategy.__proto__ || Object.getPrototypeOf(PSARCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * PSAR
         */


        _createClass(PSARCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(PSARCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(PSARCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    var period = parseInt(this.cp.inputs.period, 10);
                    var af = 0,
                        ep = null,
                        lasttrend = false;
                    var SAR = 0,
                        priorSAR = void 0,
                        lowestPrior2Lows = void 0,
                        highestPrior2Highs = void 0;
                    var step = parseFloat(this.cp.inputs.minimumAF);
                    var maxStep = parseFloat(this.cp.inputs.maximumAF);

                    period = period <= 0 ? 1 : period;

                    for (var i = 0; i < quotes.length - 1; i++) {
                        priorSAR = SAR;

                        if (lasttrend) {
                            if (!ep || ep < quotes[i].High) {
                                ep = quotes[i].High;
                                af = Math.min(af + step, maxStep);
                            }

                            SAR = priorSAR + af * (ep - priorSAR);
                            lowestPrior2Lows = Math.min(quotes[Math.max(1, i) - 1].Low, quotes[i].Low);

                            if (SAR > quotes[i + 1].Low) {
                                SAR = ep;
                                af = 0;
                                ep = null;
                                lasttrend = !lasttrend;
                            } else if (SAR > lowestPrior2Lows) {
                                SAR = lowestPrior2Lows;
                            }
                        } else {
                            if (!ep || ep > quotes[i].Low) {
                                ep = quotes[i].Low;
                                af = Math.min(af + step, maxStep);
                            }

                            SAR = priorSAR + af * (ep - priorSAR);
                            highestPrior2Highs = Math.max(quotes[Math.max(1, i) - 1].High, quotes[i].High);

                            if (SAR < quotes[i + 1].High) {
                                SAR = ep;
                                af = 0;
                                ep = null;
                                lasttrend = !lasttrend;
                            } else if (SAR < highestPrior2Highs) {
                                SAR = highestPrior2Highs;
                            }
                        }

                        quotes[i + 1][dataKey] = SAR;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating PSAR ' + e);
                }
            }
        }]);

        return PSARCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = PSARCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/rateOfChg-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var RateOfChgCalcStrategy = function (_CalculationStrategy) {
        _inherits(RateOfChgCalcStrategy, _CalculationStrategy);

        function RateOfChgCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, RateOfChgCalcStrategy);

            return _possibleConstructorReturn(this, (RateOfChgCalcStrategy.__proto__ || Object.getPrototypeOf(RateOfChgCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Rate Of Change Calculation {Momentum}
         */

        _createClass(RateOfChgCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(RateOfChgCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(RateOfChgCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var field = this.cp.inputs.field;

                    if (_chartStudies.default.Indicators.VolROC.ChartIndID === this.cp.studyKey) {
                        field = 'Volume';
                    } else if (!field) {
                        field = 'Close';
                    }

                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var offset = this.cp.inputs['Center Line'];
                    offset = !offset ? 0 : parseInt(offset, 10);

                    var quotes = this.basedDataSet;
                    var period = this.cp.inputs.period;

                    for (var i = period; i < quotes.length; i++) {
                        if (_chartStudies.default.Indicators.Momentum.ChartIndID === this.cp.studyKey) {
                            quotes[i][dataKey] = quotes[i][field] - quotes[i - period][field] + offset;
                        } else {
                            quotes[i][dataKey] = 100 * (quotes[i][field] / quotes[i - period][field] - 1) + offset;
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating momentum ' + e);
                }
            }
        }]);

        return RateOfChgCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = RateOfChgCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/rsi-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var RSICalcStrategy = function (_CalculationStrategy) {
        _inherits(RSICalcStrategy, _CalculationStrategy);

        function RSICalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, RSICalcStrategy);

            return _possibleConstructorReturn(this, (RSICalcStrategy.__proto__ || Object.getPrototypeOf(RSICalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * RSI
         */


        _createClass(RSICalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(RSICalcStrategy.prototype.__proto__ || Object.getPrototypeOf(RSICalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10);
                    var gain = 0,
                        loss = 0,
                        i = void 0,
                        change = void 0,
                        quote = void 0,
                        avgGain = void 0,
                        avgLoss = void 0;

                    period = period <= 0 ? 1 : period;

                    if (quotes.length > 0) {
                        for (i = 1; i < period; i++) {
                            change = quotes[i]['Close'] - quotes[i - 1]['Close'];

                            if (change < 0) {
                                loss += change * -1;
                            } else {
                                gain += change;
                            }
                        }

                        avgGain = gain / period;
                        avgLoss = loss / period;

                        quotes[i][dataKey] = this._computeRSI(avgGain, avgLoss);

                        for (i = period; i < quotes.length; i++) {
                            quote = quotes[i];

                            change = quote['Close'] - quotes[i - 1]['Close'];

                            if (change > 0) {
                                avgGain = (avgGain * (period - 1) + change) / period;
                                avgLoss = avgLoss * (period - 1) / period;
                            } else {
                                avgLoss = (avgLoss * (period - 1) + change * -1) / period;
                                avgGain = avgGain * (period - 1) / period;
                            }

                            quote[dataKey] = this._computeRSI(avgGain, avgLoss);
                        }

                        this.isCalculated = true;
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating RSI ' + e);
                }
            }
        }, {
            key: '_computeRSI',
            value: function _computeRSI(avgGain, avgLoss) {
                if (avgLoss === 0) {
                    return 100;
                } else {
                    return 100 - 100 / (1 + avgGain / avgLoss);
                }
            }
        }]);

        return RSICalcStrategy;
    }(_calculationStrategy.default);

    exports.default = RSICalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/stand-dev-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../../core/utils/chart-studies', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartStudies, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var STDDevCalcStrategy = function (_CalculationStrategy) {
        _inherits(STDDevCalcStrategy, _CalculationStrategy);

        function STDDevCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, STDDevCalcStrategy);

            var _this = _possibleConstructorReturn(this, (STDDevCalcStrategy.__proto__ || Object.getPrototypeOf(STDDevCalcStrategy)).call(this, calcDataProvider, cp));

            var that = _this;

            that.ma = new _chartProperty.default(that.cp.stageProperty);
            that.ma.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            that.ma.inputs = {
                period: that.cp.inputs.period,
                field: that.cp.inputs.field,
                offset: that.cp.inputs.offset,
                maType: that.cp.inputs.maType
            };

            that.ma.generateStudyId();

            that.calcStrategies.push(that.calcDP.getCalculationStrategy(_this.ma));
            return _this;
        }

        /**
         * Standard Deviation Calculation
         */

        _createClass(STDDevCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(STDDevCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(STDDevCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet.dataSource && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;

                    this.cp.period = this.cp.period < 0 ? 1 : this.cp.period;

                    var acc1 = 0,
                        acc2 = 0,
                        ma = 0,
                        quote = void 0,
                        val = 0,
                        val2 = 0;
                    var mult = this.cp.inputs.stndDev;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    mult = mult < 0 ? 2 : mult;

                    for (var i = 0; i < quotes.length; i++) {
                        quote = quotes[i];
                        ma = quote[this.ma.propertyKey];
                        val = quote[this.cp.inputs.field];
                        val = isNaN(val) ? 0 : val;

                        acc1 += Math.pow(val, 2);
                        acc2 += val;

                        if (i > this.cp.inputs.period - 1) {
                            val2 = quotes[i - this.cp.inputs.period][this.cp.inputs.field];
                            val2 = isNaN(val2) ? 0 : val2;

                            acc1 -= Math.pow(val2, 2);
                            acc2 -= val2;
                            quote[dataKey] = Math.sqrt((acc1 + this.cp.inputs.period * Math.pow(ma, 2) - 2 * ma * acc2) / this.cp.inputs.period) * mult;
                        } else {
                            quote[dataKey] = undefined;
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Standard Deviation ' + e);
                }
            }
        }]);

        return STDDevCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = STDDevCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/stoch-oscil-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies', '../chart-property', './calc-strategy-helpers'], function (exports, _calculationStrategy, _utils, _chartStudies, _chartProperty, _calcStrategyHelpers) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var StochasticOscillatorCalcStrategy = function (_CalculationStrategy) {
        _inherits(StochasticOscillatorCalcStrategy, _CalculationStrategy);

        function StochasticOscillatorCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, StochasticOscillatorCalcStrategy);

            var _this = _possibleConstructorReturn(this, (StochasticOscillatorCalcStrategy.__proto__ || Object.getPrototypeOf(StochasticOscillatorCalcStrategy)).call(this, calcDataProvider, cp));

            _this.inputs = _this.cp.inputs;
            var smoothingPeriod = _this.inputs['%K Smoothing Periods'];

            _this.smooth = _this.inputs.smooth || smoothingPeriod !== undefined;
            smoothingPeriod = !smoothingPeriod && _this.smooth ? 3 : smoothingPeriod;

            _this.fastMA = new _chartProperty.default(_this.cp.stageProperty);
            _this.fastMA.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            _this.fastMA.inputs = {
                period: smoothingPeriod,
                field: _this.smooth ? _this.cp.propertyKey + '_1' : _this.cp.propertyKey,
                offset: 0,
                maType: _chartStudies.default.MVTypes.Simple
            };

            _this.fastMA.generateStudyId();
            _this.fastMA.propertyKey = _calcStrategyHelpers.default.getPlotInfoFromKey(_this.cp.plotInfos, 'Fast').propertyKey;
            _this.fastMA.plotInfos[0].propertyKey = _this.fastMA.propertyKey;

            var slowPeriod = _this.inputs['%D Periods'];
            slowPeriod = slowPeriod ? slowPeriod : 3;

            _this.slowMA = new _chartProperty.default(_this.cp.stageProperty);
            _this.slowMA.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            _this.slowMA.inputs = {
                period: slowPeriod,
                field: _this.fastMA.propertyKey,
                offset: 0,
                maType: _chartStudies.default.MVTypes.Simple
            };

            _this.slowMA.generateStudyId();
            _this.slowMA.propertyKey = _calcStrategyHelpers.default.getPlotInfoFromKey(_this.cp.plotInfos, 'Slow').propertyKey;
            _this.slowMA.plotInfos[0].propertyKey = _this.slowMA.propertyKey;
            return _this;
        }

        /**
         * Stochastic Oscillator
         */

        _createClass(StochasticOscillatorCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(StochasticOscillatorCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(StochasticOscillatorCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var period = parseInt(this.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    if (quotes.length < period + 1) {
                        return;
                    }

                    var field = this.inputs.field;
                    var dataKey = this.cp.propertyKey;
                    var fastPeriod = this.inputs['%K Periods'];

                    dataKey = this.smooth ? dataKey + '_1' : dataKey; // Source which is used by smoothing
                    fastPeriod = !fastPeriod ? period : fastPeriod;

                    for (var i = fastPeriod; i < quotes.length; i++) {
                        quotes[i][dataKey] = this._computeStochastics(i, field, fastPeriod, quotes);
                    }

                    if (this.smooth) {
                        var fastCalObj = this.calcDP.getCalculationStrategy(this.fastMA); // TODO: [Ravindu] :: Wrong design

                        if (fastCalObj) {
                            fastCalObj.basedDataSet = this.basedDataSet;
                            fastCalObj.calculate();
                        }
                    }

                    var slowCalObj = this.calcDP.getCalculationStrategy(this.slowMA); // TODO: [Ravindu] :: Wrong design

                    if (slowCalObj) {
                        slowCalObj.basedDataSet = this.basedDataSet;
                        slowCalObj.calculate();
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Stochastic Oscillator ' + e);
                }
            }
        }, {
            key: '_computeStochastics',
            value: function _computeStochastics(position, field, period, quotes) {
                var beg = position - period + 1;
                var low = 1000000,
                    high = 0;

                for (var i = beg; i <= position; i++) {
                    low = Math.min(low, quotes[i].Low);
                    high = Math.max(high, quotes[i].High);
                }

                return (quotes[position][field] - low) / (high - low) * 100;
            }
        }]);

        return StochasticOscillatorCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = StochasticOscillatorCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/time-forc-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var TimeForcCalcStrategy = function (_CalculationStrategy) {
        _inherits(TimeForcCalcStrategy, _CalculationStrategy);

        function TimeForcCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, TimeForcCalcStrategy);

            return _possibleConstructorReturn(this, (TimeForcCalcStrategy.__proto__ || Object.getPrototypeOf(TimeForcCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Chande Momentum Oscillator
         */

        _createClass(TimeForcCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(TimeForcCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(TimeForcCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10);
                    period = isNaN(period) ? 14 : period;

                    var field = this.cp.inputs.field;
                    var sumWeights = period * (period + 1) / 2;
                    var squaredSumWeights = Math.pow(sumWeights, 2);
                    var sumWeightsSquared = sumWeights * (2 * period + 1) / 3;

                    var sumCloses = 0,
                        sumWeightedCloses = 0,
                        b = void 0,
                        a = void 0;

                    for (var i = 0; i < quotes.length; i++) {
                        sumWeightedCloses += period * quotes[i][field] - sumCloses;
                        sumCloses += quotes[i][field];

                        if (i < period - 1) {
                            continue;
                        } else if (i > period - 1) {
                            sumCloses -= quotes[i - period][field];
                        }

                        b = (period * sumWeightedCloses - sumWeights * sumCloses) / (period * sumWeightsSquared - squaredSumWeights);
                        a = (sumCloses - b * sumWeights) / period;

                        quotes[i][dataKey] = a + b * period;
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Chande Momentum Oscillator ' + e);
                }
            }
        }]);

        return TimeForcCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = TimeForcCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/timeseries-ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var TimeSeriesMACalcStrategy = function (_CalculationStrategy) {
        _inherits(TimeSeriesMACalcStrategy, _CalculationStrategy);

        function TimeSeriesMACalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, TimeSeriesMACalcStrategy);

            return _possibleConstructorReturn(this, (TimeSeriesMACalcStrategy.__proto__ || Object.getPrototypeOf(TimeSeriesMACalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Moving Average Calculation - Time Series
         */

        _createClass(TimeSeriesMACalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(TimeSeriesMACalcStrategy.prototype.__proto__ || Object.getPrototypeOf(TimeSeriesMACalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var field = this.cp.inputs.field;
                    var offset = parseInt(this.cp.inputs.offset, 10);
                    var period = this.cp.inputs.period;

                    offset = isNaN(offset) ? 0 : offset;
                    period = isNaN(period) ? 14 : period;

                    var sumWeights = this.cp.inputs.period * (parseInt(this.cp.inputs.period, 10) + 1) / 2;
                    var squaredSumWeights = Math.pow(sumWeights, 2);
                    var sumWeightsSquared = sumWeights * (2 * parseInt(this.cp.inputs.period, 10) + 1) / 3;
                    var sumCloses = 0;
                    var sumWeightedCloses = 0;
                    var a = void 0,
                        b = void 0;
                    var dataKey = this.cp.plotInfos[0].propertyKey;

                    for (var i = 0; i < quotes.length; i++) {
                        sumWeightedCloses += period * quotes[i][field] - sumCloses;
                        sumCloses += quotes[i][field];

                        if (i < period - 1) {
                            continue;
                        } else if (i > period - 1) {
                            sumCloses -= quotes[i - period][field];
                        }

                        b = (period * sumWeightedCloses - sumWeights * sumCloses) / (period * sumWeightsSquared - squaredSumWeights);
                        a = (sumCloses - b * sumWeights) / period;

                        if (i + offset >= 0 && i + offset < quotes.length) {
                            quotes[i + offset][dataKey] = a + b * period;
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating time series moving average ' + e);
                }
            }
        }]);

        return TimeSeriesMACalcStrategy;
    }(_calculationStrategy.default);

    exports.default = TimeSeriesMACalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/triangular-ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartStudies, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var TriangularMACalcStrategy = function (_CalculationStrategy) {
        _inherits(TriangularMACalcStrategy, _CalculationStrategy);

        function TriangularMACalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, TriangularMACalcStrategy);

            var _this = _possibleConstructorReturn(this, (TriangularMACalcStrategy.__proto__ || Object.getPrototypeOf(TriangularMACalcStrategy)).call(this, calcDataProvider, cp));

            var dataKeyTRI1 = 'TRI1 ' + _this.cp.plotInfos[0].propertyKey;
            var dataKeyTRI2 = 'TRI2 ' + _this.cp.plotInfos[0].propertyKey;
            var field = _this.cp.inputs.field;
            var period = parseInt(_this.cp.inputs.period, 10);
            _this.offset = parseInt(_this.cp.inputs.offset, 10);

            _this.offset = isNaN(_this.offset) ? 0 : _this.offset;
            period = isNaN(period) ? 14 : period;

            _this.tri1MA = new _chartProperty.default(_this.cp.stageProperty);
            _this.tri1MA.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            _this.tri1MA.inputs = {
                period: period / 2,
                field: field,
                offset: 0,
                type: _chartStudies.default.MVTypes.Simple
            };

            _this.tri1MA.plotInfos[0].propertyKey = dataKeyTRI1;
            _this.tri1MA.generateStudyId();

            _this.tri2MA = new _chartProperty.default(_this.cp.stageProperty);
            _this.tri2MA.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;

            _this.tri2MA.inputs = {
                period: period % 2 === 0 ? period / 2 + 1 : period / 2,
                field: _this.tri1MA.plotInfos[0].propertyKey,
                offset: 0,
                type: _chartStudies.default.MVTypes.Simple
            };

            _this.tri2MA.plotInfos[0].propertyKey = dataKeyTRI2;
            _this.tri2MA.generateStudyId();

            _this.calcStrategies.push(_this.calcDP.getCalculationStrategy(_this.tri1MA));
            _this.calcStrategies.push(_this.calcDP.getCalculationStrategy(_this.tri2MA));
            return _this;
        }

        _createClass(TriangularMACalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(TriangularMACalcStrategy.prototype.__proto__ || Object.getPrototypeOf(TriangularMACalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var quote = void 0;

                    for (var i = 0; i < quotes.length; i++) {
                        quote = quotes[i];

                        if (i + this.offset >= 0 && i + this.offset < quotes.length) {
                            quotes[i + this.offset][dataKey] = quote[this.tri2MA.propertyKey];
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating triangular moving average ' + e);
                }
            }
        }]);

        return TriangularMACalcStrategy;
    }(_calculationStrategy.default);

    exports.default = TriangularMACalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/trix-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../chart-property', '../utils/chart-studies'], function (exports, _calculationStrategy, _utils, _chartProperty, _chartStudies) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var TRIXCalcStrategy = function (_CalculationStrategy) {
        _inherits(TRIXCalcStrategy, _CalculationStrategy);

        function TRIXCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, TRIXCalcStrategy);

            var _this = _possibleConstructorReturn(this, (TRIXCalcStrategy.__proto__ || Object.getPrototypeOf(TRIXCalcStrategy)).call(this, calcDataProvider, cp));

            var exp1 = _this._calculateExponentialMV('Close');
            var exp2 = _this._calculateExponentialMV(exp1);

            _this.exp3 = _this._calculateExponentialMV(exp2);
            return _this;
        }

        /**
         * TRIX
         */

        _createClass(TRIXCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(TRIXCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(TRIXCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var quote = void 0,
                        prevQuote = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        quote = quotes[i];
                        prevQuote = quotes[i - 1];

                        if (!prevQuote || !prevQuote[this.exp3]) {
                            continue;
                        }

                        quote[dataKey] = 100 * (quote[this.exp3] / prevQuote[this.exp3] - 1);
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating TRIX ' + e);
                }
            }
        }, {
            key: '_calculateExponentialMV',
            value: function _calculateExponentialMV(field) {
                this.exp = new _chartProperty.default(this.cp.stageProperty);
                this.exp.studyKey = _chartStudies.default.Indicators.ExponentialMV.ChartIndID;

                this.exp.inputs = {
                    period: this.cp.inputs.period,
                    field: field,
                    offset: 0
                };

                var expKey = this.exp.generateStudyId();

                this.calcStrategies.push(this.calcDP.getCalculationStrategy(this.exp));
                return expKey;
            }
        }]);

        return TRIXCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = TRIXCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/variable-ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var VariableMACalcStrategy = function (_CalculationStrategy) {
        _inherits(VariableMACalcStrategy, _CalculationStrategy);

        function VariableMACalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, VariableMACalcStrategy);

            return _possibleConstructorReturn(this, (VariableMACalcStrategy.__proto__ || Object.getPrototypeOf(VariableMACalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Moving Average Calculation - Exponential
         */

        _createClass(VariableMACalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(VariableMACalcStrategy.prototype.__proto__ || Object.getPrototypeOf(VariableMACalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var inputs = this.cp.inputs;
                    var period = parseInt(inputs.period, 10);
                    var field = inputs.field;
                    var offset = parseInt(inputs.offset, 10);

                    offset = isNaN(offset) ? 0 : offset;
                    period = isNaN(period) ? 9 : period;

                    var alpha = 2 / (period + 1);
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var dataKeyCMO = 'CMO ' + this.cp.plotInfos[0].propertyKey;
                    var quote = void 0,
                        val = void 0;
                    var vmaPreviousDay = 0;
                    var sumMomentum = 0,
                        absSumMomentum = 0,
                        history = [],
                        old = void 0;
                    var vi = void 0,
                        vma = void 0;

                    for (var i = 1; i < quotes.length; i++) {
                        var diff = quotes[i][field] - quotes[i - 1][field];

                        history.push(diff);
                        sumMomentum += diff;
                        absSumMomentum += Math.abs(diff);

                        if (history.length === period) {
                            quotes[i][dataKeyCMO] = 100 * sumMomentum / absSumMomentum;
                            old = history.shift();
                            sumMomentum -= old;
                            absSumMomentum -= Math.abs(old);
                        }
                    }

                    for (var _i = 0; _i < quotes.length; _i++) {
                        quote = quotes[_i];
                        val = quote[dataKeyCMO];

                        if (!val && val !== 0) {
                            if (_i + offset >= 0 && _i + offset < quotes.length) {
                                quotes[_i + offset][dataKey] = undefined;
                            }

                            continue;
                        }

                        if (!quote[dataKeyCMO]) {
                            continue;
                        } else {
                            vi = Math.abs(quote[dataKeyCMO]) / 100;
                        }

                        if (vmaPreviousDay === 0) {
                            if (_i === 0) {
                                vmaPreviousDay = quotes[0][field];
                            } else {
                                vmaPreviousDay = quotes[_i - 1][field];
                            }
                        }

                        vma = alpha * vi * quote[field] + (1 - alpha * vi) * vmaPreviousDay;

                        if (_i + offset >= 0 && _i + offset < quotes.length) {
                            quotes[_i + offset][dataKey] = vma;
                        }

                        vmaPreviousDay = vma;

                        this.setReAdjustMinMax(quotes[_i + offset][dataKey]);
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating variable moving average ' + e);
                }
            }
        }]);

        return VariableMACalcStrategy;
    }(_calculationStrategy.default);

    exports.default = VariableMACalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/vol-oscillator-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils', '../utils/chart-studies', '../chart-property'], function (exports, _calculationStrategy, _utils, _chartStudies, _chartProperty) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var VolOscCalcStrategy = function (_CalculationStrategy) {
        _inherits(VolOscCalcStrategy, _CalculationStrategy);

        function VolOscCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, VolOscCalcStrategy);

            var _this = _possibleConstructorReturn(this, (VolOscCalcStrategy.__proto__ || Object.getPrototypeOf(VolOscCalcStrategy)).call(this, calcDataProvider, cp));

            _this.shortMA = _this._calculateExpoMV(_this.cp.inputs.shortCycle);
            _this.longMA = _this._calculateExpoMV(_this.cp.inputs.longCycle);
            return _this;
        }

        /**
         * Volume Oscillator
         */


        _createClass(VolOscCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(VolOscCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(VolOscCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var inputs = this.cp.inputs;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var quote = void 0;

                    for (var i = inputs.longCycle; i < quotes.length; i++) {
                        quote = quotes[i];

                        if (!quote) continue;

                        if (inputs.type === 'Points') {
                            quotes[i][dataKey] = quote[this.shortMA] - quote[this.longMA];
                        } else {
                            quotes[i][dataKey] = 100 * (quote[this.shortMA] / quote[this.longMA] - 1);
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating vol oscillator' + e);
                }
            }
        }, {
            key: '_calculateExpoMV',
            value: function _calculateExpoMV(period) {
                this.ema = new _chartProperty.default(this.cp.stageProperty);
                this.ema.studyKey = _chartStudies.default.Indicators.ExponentialMV.ChartIndID;

                this.ema.inputs = {
                    period: period,
                    field: 'Volume',
                    offset: 0
                };

                var emaKey = this.ema.generateStudyId();
                this.calcStrategies.push(this.calcDP.getCalculationStrategy(this.ema));

                return emaKey;
            }
        }]);

        return VolOscCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = VolOscCalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/weighted-ma-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var WeightedMACalcStrategy = function (_CalculationStrategy) {
        _inherits(WeightedMACalcStrategy, _CalculationStrategy);

        function WeightedMACalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, WeightedMACalcStrategy);

            return _possibleConstructorReturn(this, (WeightedMACalcStrategy.__proto__ || Object.getPrototypeOf(WeightedMACalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * Moving Average Calculation - Weighted
         */

        _createClass(WeightedMACalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(WeightedMACalcStrategy.prototype.__proto__ || Object.getPrototypeOf(WeightedMACalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var inputs = this.cp.inputs;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var field = inputs.field;
                    var offset = parseInt(inputs.offset, 10);
                    var period = parseInt(inputs.period, 10);
                    var quote = void 0,
                        val = void 0;
                    var accAdd = 0,
                        accSubtract = 0,
                        weight = void 0;

                    offset = isNaN(offset) ? 0 : offset;
                    period = isNaN(period) ? 14 : period;

                    var divisor = period * (period + 1) / 2;

                    for (var i = 0; i < quotes.length; i++) {
                        quote = quotes[i];
                        val = quote[field];

                        if (!val && val !== 0) {
                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }

                            continue;
                        }

                        weight = Math.min(period, i + 1);

                        if (i >= period) {
                            // Age out old values
                            accAdd -= accSubtract;

                            if (quotes[i - period] && quotes[i - period][field]) {
                                accSubtract -= quotes[i - period][field];
                            }
                        }

                        accAdd += weight * val;
                        accSubtract += val;

                        if (i < period - 1) {
                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = undefined;
                            }
                        } else {
                            if (i + offset >= 0 && i + offset < quotes.length) {
                                quotes[i + offset][dataKey] = accAdd / divisor;
                            }
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating weighted moving average ' + e);
                }
            }
        }]);

        return WeightedMACalcStrategy;
    }(_calculationStrategy.default);

    exports.default = WeightedMACalcStrategy;
});
define('universal-app/controllers/chart/core/calc-strategy/williams-per-r-calc-strategy', ['exports', './calculation-strategy', '../../../../utils/utils'], function (exports, _calculationStrategy, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var WPERRCalcStrategy = function (_CalculationStrategy) {
        _inherits(WPERRCalcStrategy, _CalculationStrategy);

        function WPERRCalcStrategy(calcDataProvider, cp) {
            _classCallCheck(this, WPERRCalcStrategy);

            return _possibleConstructorReturn(this, (WPERRCalcStrategy.__proto__ || Object.getPrototypeOf(WPERRCalcStrategy)).call(this, calcDataProvider, cp));
        }

        /**
         * William's %R
         */


        _createClass(WPERRCalcStrategy, [{
            key: 'calculate',
            value: function calculate() {
                _get(WPERRCalcStrategy.prototype.__proto__ || Object.getPrototypeOf(WPERRCalcStrategy.prototype), 'calculate', this).call(this);

                try {
                    if (this.isCalculated || !this.basedDataSet && this.basedDataSet.length <= 0) {
                        return;
                    }

                    var quotes = this.basedDataSet;
                    var dataKey = this.cp.plotInfos[0].propertyKey;
                    var period = parseInt(this.cp.inputs.period, 10);

                    period = period < 0 ? 0 : period;

                    if (quotes.length > 0) {
                        var low = -1,
                            high = -1,
                            j = void 0,
                            result = 0;

                        for (var i = 0; i < quotes.length; i++) {
                            high = Math.max(high === -1 ? quotes[i].High : high, quotes[i].High);
                            low = Math.min(low === -1 ? quotes[i].Low : low, quotes[i].Low);

                            if (i >= period) {
                                if (quotes[i - period].High === high) {
                                    high = quotes[i].High;

                                    for (j = 1; j < period; j++) {
                                        high = Math.max(high, quotes[i - j].High);
                                    }
                                }

                                if (quotes[i - period].Low === low) {
                                    low = quotes[i].Low;

                                    for (j = 1; j < period; j++) {
                                        low = Math.min(low, quotes[i - j].Low);
                                    }
                                }
                            }

                            result = -100 * (high - quotes[i].Close) / (high - low);
                            quotes[i][dataKey] = result;

                            if (i === quotes.length - 1) {
                                break;
                            }

                            quotes[i + 1][dataKey] = result;
                        }
                    }

                    this.isCalculated = true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating Williams %R ' + e);
                }
            }
        }]);

        return WPERRCalcStrategy;
    }(_calculationStrategy.default);

    exports.default = WPERRCalcStrategy;
});
define('universal-app/controllers/chart/core/calculated-data-provider', ['exports', './utils/chart-core-constants', '../../../utils/utils', '../../../models/shared/shared-service', '../../../models/chart/business-entities/ohlc', './calc-strategy/calc_strategy-factory'], function (exports, _chartCoreConstants, _utils, _sharedService, _ohlc, _calc_strategyFactory) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var CalculatedDataProvider = function () {
        function CalculatedDataProvider(chartDP) {
            _classCallCheck(this, CalculatedDataProvider);

            this.chartDP = chartDP;
            this.dataSource = [];
            this.beginIndex = 0;
            this.endIndex = 0;
            this.rawDataType = _chartCoreConstants.default.RawDataType.Minute;
            this.interval = _chartCoreConstants.default.IntradayInterval.EveryMinutes;
            this.tmpLatestTime = 0;
            this.lastUpdatedPrice = 0; // For sync with Last Price line and last candles
            this.baseSymObj = undefined;
            this.beginDayOfWeekAdj = _chartCoreConstants.default.WeekBeginAdjustment.Adj_Saturday;
            this.modelParamObj = undefined;
            this.calculatedStudies = {}; // Keeps all calculated fields which in data source
            this.isZoomedDataArray = false; // Keeps to handle begin, end index of zoomed chart
            this.isIndexing = true;
        }

        _createClass(CalculatedDataProvider, [{
            key: 'getCalcData',
            value: function getCalcData(params) {
                if (params.cp.studyKey && !params.cp.studyKey.isEmpty()) {
                    var calcObj = this.getCalculationStrategy(params.cp);

                    if (calcObj) {
                        calcObj.cp = params.cp;
                        calcObj.basedDataSet = this.getBasedDataSet(calcObj.basedOnSym);
                        calcObj.calculate(); // Todo: [Ravindu] Handle is calculated in common place instead of checking every calculation strategy
                    }
                }

                if ($.isFunction(params.onSuccesFn)) {
                    params.onSuccesFn();
                }
            }
        }, {
            key: 'getCalculationStrategy',
            value: function getCalculationStrategy(cp) {
                var calcObj = void 0;

                try {
                    calcObj = this.calculatedStudies[cp.propertyKey];

                    if (!calcObj) {
                        calcObj = _calc_strategyFactory.default.getCalcStrategy(this, cp);

                        if (calcObj) {
                            this.calculatedStudies[cp.propertyKey] = calcObj;
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError(' [Calculated Data Provider] Return calculation strategy' + e);
                }

                return calcObj;
            }
        }, {
            key: 'getTimeMilliSec',
            value: function getTimeMilliSec(index) {
                var recMilliSec = 0;

                try {
                    if (this.dataSource.length > 0) {
                        if (this.dataSource[index]) {
                            var date = this.dataSource[index].DT;

                            if (date) {
                                recMilliSec = date.getTime();
                            }
                        } else {
                            _utils.default.logger.logDebug('[pro chart] getTimeMilliSec index ' + index);
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Get Time Millisecond ' + e);
                }

                return recMilliSec;
            }
        }, {
            key: 'hasDailyRawData',
            value: function hasDailyRawData() {
                return this.rawDataType === _chartCoreConstants.default.RawDataType.Daily;
            }
        }, {
            key: 'hasMinuteRawData',
            value: function hasMinuteRawData() {
                return this.rawDataType === _chartCoreConstants.default.RawDataType.Minute;
            }
        }, {
            key: 'hasTickRawData',
            value: function hasTickRawData() {
                return this.rawDataType === _chartCoreConstants.default.RawDataType.Tick;
            }
        }, {
            key: 'indexOfElement',
            value: function indexOfElement(key) {
                var lo = 0;

                if (this.dataSource && this.dataSource.length > 0) {
                    var hi = this.dataSource.length - 1,
                        mid = void 0,
                        element = void 0;

                    try {
                        while (lo <= hi) {
                            mid = lo + hi >> 1;
                            element = this.dataSource[mid];

                            if (element && element.DT.getTime() < key) {
                                lo = mid + 1;
                            } else if (element && element.DT.getTime() > key) {
                                hi = mid - 1;
                            } else {
                                return mid;
                            }
                        }
                    } catch (e) {
                        _utils.default.logger.logError('[pro Chart] Index of element' + e);
                    }
                }

                // If not found, return lo and the period will be calculated from that element
                return lo;
            }
        }, {
            key: 'resetCalStatus',
            value: function resetCalStatus() {
                try {
                    this.calculatedStudies = {};

                    /*   $.each(this.calculatedStudies, function (index, study) {
                           study.isCalculated = false;
                       });*/
                } catch (e) {
                    _utils.default.logger.logError(' [Calculated Data Provider] Reset calc status ' + e);
                }
            }
        }, {
            key: 'removeCompareSymbol',
            value: function removeCompareSymbol(cp) {
                try {
                    var symObj = {
                        exg: cp.symObj.exg,
                        sym: cp.symObj.sym,
                        chartPointArray: []
                    };

                    this.chartDP.removeChartDataSubscription(symObj);
                    this.chartDP.removeChartSymbol(cp.symObj.exg, cp.symObj.sym);

                    if (this.chartDP.chartSymbolArray.length === 1) {
                        this.chartDP.chartSymbolArray[0].indexFactor = 1.0; // Reset indexing factor when removed all compare symbols
                    }

                    this.resetCalStatus(); // Resetting study calculation to be recalculated according to new IndexFactor
                    this.refindModelData(true);
                } catch (e) {
                    _utils.default.logger.logError('Error in remove compare symbol' + e);
                }
            }
        }, {
            key: 'getDataArray',
            value: function getDataArray() {
                return this.dataSource.slice(this.beginIndex, this.endIndex + 1); // Calculated datasource is sliced from begin to end index for zooming
            }
        }, {
            key: 'refindModelData',
            value: function refindModelData(isDataModelingRequired) {
                if (this.modelParamObj) {
                    this.modelParamObj.isDataModelingRequired = isDataModelingRequired;
                    this.modelData(this.modelParamObj);
                }
            }
        }, {
            key: 'modelData',
            value: function modelData(params) {
                var that = this;
                // let isSuccess = true;

                if (params.isDataModelingRequired) {
                    try {
                        this.modelParamObj = params;
                        this.baseSymObj = params.chartSymObj;
                        this.dataSource = []; // Resetting data source
                        var chartSymbolArray = this.chartDP.chartSymbolArray;

                        $.each(chartSymbolArray, function (index, symObj) {
                            /* isSuccess = isSuccess && */
                            that._updateSymbolRecords(0, symObj); // Todo: [Ravindu] this function can be utilized to update only change set
                        });

                        if (!this.isZoomedDataArray) {
                            this.beginIndex = 0; // After begin index is changed datasource is restored to changed begin index, So Again rest begin index to zero.
                            this.endIndex = this.dataSource.length - 1;
                        }
                    } catch (e) {
                        _utils.default.logger.logError('[pro Chart] Array clone error ' + e);
                    }
                }

                if ( /* isSuccess && */$.isFunction(params.onSuccesFn)) {
                    params.onSuccesFn();
                }
            }
        }, {
            key: '_updateSymbolRecords',
            value: function _updateSymbolRecords(oldSize, symObj) {
                var that = this;
                var rawData = symObj.chartPointArray;

                if (rawData.length === 0) {
                    return true;
                }

                var totVolume = 0,
                    totTurnover = 0,
                    tmpTime = void 0,
                    dR = void 0,
                    aPoint = void 0,
                    pointBeginTime = void 0,
                    lastPointBeginTime = 0;
                var latestTime = that._getLatestMilliSecDateObject();
                var iF = this.isIndexing ? symObj.indexFactor : 1.0; // Comparison chart
                var compO = symObj.sym + '-' + 'Open';
                var compH = symObj.sym + '-' + 'High';
                var compL = symObj.sym + '-' + 'Low';
                var compC = symObj.sym + '-' + 'Close';

                try {
                    for (var i = oldSize; i < rawData.length; i++) {
                        dR = rawData[i];

                        if (dR && dR.DT.getTime() !== 0) {
                            // tmpTime = this._getTimeZoneAdjustment(dR.DT);
                            tmpTime = dR.DT; // Todo: [Ravindu] This should be enabled after ohlc store keeps UTC time stamps

                            pointBeginTime = that._getPointBeginTime(tmpTime.getTime(), latestTime.getTime());

                            that.tmpLatestTime = Math.max(that.tmpLatestTime, pointBeginTime);

                            aPoint = that._getDatePoint(pointBeginTime);

                            if (symObj.isBaseSymbol) {
                                aPoint.Open = aPoint.Open === 0 || !aPoint.Open ? dR.Open * iF : aPoint.Open;
                                aPoint.High = Math.max(aPoint.High, dR.High * iF);
                                aPoint.Low = Math.min(aPoint.Low, dR.Low * iF);
                                aPoint.Close = dR.Close * iF;
                                aPoint.HLC3 = (aPoint.High + aPoint.Low + aPoint.Close) / 3;
                                aPoint.PBR = dR.PBR > 0 ? dR.PBR * iF : undefined;
                                aPoint.PER = dR.PER > 0 ? dR.PER * iF : undefined;

                                that.lastUpdatedPrice = aPoint.Close;

                                if (pointBeginTime !== lastPointBeginTime) {
                                    aPoint.Volume = 0;
                                    aPoint.Turnover = 0;
                                }

                                totVolume = aPoint.Volume + dR.Volume;
                                aPoint.Volume = totVolume;

                                totTurnover = aPoint.Turnover + dR.Turnover;
                                aPoint.Turnover = totTurnover;

                                lastPointBeginTime = pointBeginTime;
                            } else {
                                // Indexing value is assigned to all ohlc fields to interactive with user preference.

                                aPoint[compO] = !aPoint[compO] ? dR.Open * iF : aPoint[compO];
                                aPoint[compH] = Math.max(aPoint[compH] ? aPoint[compH] : -Number.MAX_VALUE, dR.High * iF);
                                aPoint[compL] = Math.min(aPoint[compL] ? aPoint[compL] : Number.MAX_VALUE, dR.Low * iF);
                                aPoint[compC] = dR.Close * iF;
                            }
                        }
                    }
                    // Todo: [Ravindu] Recalculate split factors

                    return true;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Modeling sym records ' + e);
                    return false;
                }
            }
        }, {
            key: '_getLatestMilliSecDateObject',
            value: function _getLatestMilliSecDateObject() {
                // Todo: [Ravindu] Below logic is placed by assuming other source data range length is equal with base range length, if base range length is less than other sources length, refactor this logic to retrieve the latest record.
                var rawData = this.chartDP.getDataArray();

                if (rawData.length > 0) {
                    var dR = rawData[rawData.length - 1];

                    if (dR.DT.getTime() === 0 && rawData.length > 1) {
                        // Patch to avoid end 0 point
                        dR = rawData[rawData.length - 2];
                    }

                    return dR.DT;

                    // this._getTimeZoneAdjustment(dR.DT); // Todo: [Ravindu] This should be enabled after ohlc store keeps UTC time stamps
                }

                return new Date();
            }
        }, {
            key: '_getTimeZoneAdjustment',
            value: function _getTimeZoneAdjustment(date) {
                try {
                    if (this.hasMinuteRawData()) {
                        var exgObj = _sharedService.default.getService('price').exchangeDS.getExchange(this.baseSymObj.exg);

                        return _utils.default.formatters.adjustToTimezone(date, exgObj.tzo);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Return time zone adjusted time ' + e);
                }

                return 0;
            }
        }, {
            key: '_getPointBeginTime',
            value: function _getPointBeginTime(pointTimeStmp, latestTimeStmp) {
                try {
                    var aTimeStmp = void 0;

                    if (this.hasTickRawData()) {
                        return pointTimeStmp; // Todo: [Ravindu] Added for tick- check validity.
                    } else if (this.hasMinuteRawData()) {
                        aTimeStmp = parseInt(pointTimeStmp / (this.interval * 1000), 10); // Rounding point time stamp to find responsible interval point time
                        return aTimeStmp * (this.interval * 1000);
                    } else {
                        var date = new Date(pointTimeStmp);
                        var lastDayYear = void 0,
                            lastDayOfMonth = void 0;

                        switch (this.interval) {
                            case _chartCoreConstants.default.HistoryInterval.Yearly:
                                date.setFullYear(date.getFullYear(), 11, 31); // Getting last day of given time stamp's year (December 31)
                                lastDayYear = Math.min(date.getTime(), latestTimeStmp);
                                lastDayYear -= lastDayYear % _chartCoreConstants.default.TicksPerDay;
                                return lastDayYear;
                            case _chartCoreConstants.default.HistoryInterval.Monthly:
                                date.setFullYear(date.getFullYear(), date.getMonth() + 1, 0); // Getting last day of given time stamp's month
                                lastDayOfMonth = Math.min(date.getTime(), latestTimeStmp);
                                lastDayOfMonth -= lastDayOfMonth % _chartCoreConstants.default.TicksPerDay;
                                return lastDayOfMonth;
                            case _chartCoreConstants.default.HistoryInterval.Weekly:
                                aTimeStmp = parseInt((pointTimeStmp - this.beginDayOfWeekAdj * 1000) / (this.interval * 1000), 10);
                                return aTimeStmp * this.interval * 1000 + this.beginDayOfWeekAdj * 1000 + 6 * _chartCoreConstants.default.TicksPerDay; // 6 Days + week begin day
                            default:
                                // daily
                                date.setUTCHours(24, 0, 0, 0); // To return correct date, Converting timezone converted time to midnight
                                aTimeStmp = parseInt(date.getTime() / (this.interval * 1000), 10);
                                return aTimeStmp * (this.interval * 1000);
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Return point begin time  ' + e);
                }
            }
        }, {
            key: '_getDatePoint',
            value: function _getDatePoint(pointBeginTime) {
                try {
                    var searchIndex = this.indexOfElement(pointBeginTime);
                    var ohlcObj = void 0;

                    if (searchIndex >= 0) {
                        // Already available or new insertion

                        ohlcObj = this.dataSource[searchIndex];

                        if (ohlcObj && pointBeginTime !== ohlcObj.DT.getTime()) {
                            ohlcObj = undefined; // Counted as new insertion.
                        }
                    }

                    if (!ohlcObj) {
                        ohlcObj = _ohlc.default.getOHLCObj({
                            dt: new Date(pointBeginTime),
                            open: undefined,
                            high: Number.MIN_VALUE,
                            low: Number.MAX_VALUE,
                            close: undefined,
                            volume: undefined,
                            turnover: undefined
                        });

                        try {
                            this.dataSource.splice(Math.abs(this.indexOfElement(ohlcObj.DT.getTime())), 0, ohlcObj);
                        } catch (e) {
                            _utils.default.logger.logError('[pro Chart] Error in new ohlc insertion ' + e);
                        }
                    }

                    return ohlcObj;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Return responsible interval record ' + e);
                }
            }
        }, {
            key: 'getBasedDataSet',
            value: function getBasedDataSet(basedSym) {
                try {
                    var basedData = [];

                    if (this.dataSource && basedSym === '') {
                        $.each(this.dataSource, function (index, ohlc) {
                            if (ohlc.Close) {
                                // Todo: [Ravindu] Sometime proper validation will be needed.
                                basedData.push(ohlc);
                            }
                        });
                    }

                    return basedData;
                } catch (e) {
                    _utils.default.logger.logError('[Calculated Data Provider] Error in filter data set  ' + e);
                }
            }
        }]);

        return CalculatedDataProvider;
    }();

    exports.default = CalculatedDataProvider;
});
define('universal-app/controllers/chart/core/chart-component', ['exports', './utils/chart-core-constants', './utils/pixel-conversion', './utils/chart-formatters', '../../../utils/utils', './utils/chart-utils', './chart-strategy/line-study-strategy/line-study-factory'], function (exports, _chartCoreConstants, _pixelConversion, _chartFormatters, _utils, _chartUtils, _lineStudyFactory) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartComponent = function () {
        function ChartComponent(calDP, stageProperty, index, gridSetting) {
            _classCallCheck(this, ChartComponent);

            this.chartStrategies = [];
            this.compGraphic = new PIXI.Graphics();
            this.calcDP = calDP;
            this.stageProperty = stageProperty;
            this.yAxis = new PIXI.Graphics();

            this.horizontalGrids = new PIXI.Graphics(); // Grid types
            this.setHorizontalGridsVisiblity(gridSetting);

            this.index = index;
            this.compareLegendGraphic = new PIXI.Graphics();
            this.containerStudyType = undefined;

            this.compGraphic.addChild(this.yAxis);
            this.compGraphic.addChild(this.compareLegendGraphic);
            this.stageProperty.stage.addChild(this.compGraphic);

            this.properties = {
                minY: Number.MAX_VALUE,
                maxY: -Number.MAX_VALUE,
                minCustomY: 0,
                maxCustomY: 0,
                yFact: 0,
                x: 0,
                y: 0,
                ht: 0,
                wd: 0,
                top: 0,
                clearance: 0
            };

            this._createStaticStrategies();
        }

        _createClass(ChartComponent, [{
            key: 'setBounds',
            value: function setBounds(x, y, wd, ht, titleHt) {
                this.properties.x = x;
                this.properties.y = y;
                this.properties.wd = wd;
                this.properties.ht = ht;
                this.properties.top = y + titleHt;

                // Todo: [Ravindu] Reduce title height from height
            }
        }, {
            key: 'addStrategy',
            value: function addStrategy(strategy, stratgId) {
                try {
                    if (strategy) {
                        this.compGraphic.addChild(strategy.strategyGraphic);
                        strategy.cp.chartCompProperties = this.properties;

                        // strategy.addDrawingClip(); // Setting drawing clip for line studies
                        strategy.cp.generateStudyId(); // Generating dataKey {for min max calculation and drawing chart strategy}

                        var stratgPos = this.chartStrategies.push(strategy) - 1; // 0 index based

                        strategy.strategyId = stratgId ? stratgId : [this.index, stratgPos].join('-');
                        return strategy.strategyId;
                    }
                } catch (e) {
                    _utils.default.logger.logError(' [Pro Chart] Add Strategy ' + e);
                }

                return -1;
            }
        }, {
            key: 'removeStrategy',
            value: function removeStrategy(strategy) {
                try {
                    var index = this.chartStrategies.indexOf(strategy);

                    if (index !== -1) {
                        this.compGraphic.removeChild(strategy.strategyGraphic);
                        this.chartStrategies.splice(index, 1);
                    }
                } catch (e) {
                    _utils.default.logger.logError(' [Pro Chart] Remove Strategy ' + e);
                }
            }
        }, {
            key: 'setHorizontalGridsVisiblity',
            value: function setHorizontalGridsVisiblity(option) {
                this.horizontalGrids.visible = _chartCoreConstants.default.ProChartGridStyle.Both.ID === option.ID || _chartCoreConstants.default.ProChartGridStyle.Horizontal.ID === option.ID;
            }
        }, {
            key: 'loadCharts',
            value: function loadCharts() {
                _utils.default.logger.logInfo('[Drw Path] Started chart loading');

                $.each(this.chartStrategies, function (index, strategy) {
                    strategy.drawChart(true);
                });

                _utils.default.logger.logInfo('[Drw Path] Finished chart loading');
            }
        }, {
            key: 'drawChartComponent',
            value: function drawChartComponent() {
                _utils.default.logger.logInfo('[Drw Path] Started Component Drawing');

                this._drawRightYAxis();

                $.each(this.chartStrategies, function (index, strategy) {
                    strategy.drawGraphics(undefined);
                    strategy.addDrawingClip();
                });

                // this._drawCompareLegend();
                this._drawComponentBorders(this.properties);

                _utils.default.logger.logInfo('[Drw Path] Finished Component Drawing');
            }
        }, {
            key: '_drawRightYAxis',
            value: function _drawRightYAxis() {
                try {
                    this.yAxis.clear();
                    this.horizontalGrids.clear();

                    _chartUtils.default.removeParentChildren(this.yAxis);
                    this.yAxis.addChild(this.horizontalGrids);

                    var yLbl = void 0,
                        allowedPitch = void 0;
                    var freePlotHt = this.properties.ht - 2 * this.properties.clearance;

                    this.yAxis.beginFill(0, 0);
                    this.horizontalGrids.beginFill(0, 0);
                    this.horizontalGrids.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-grid-color', 'color')), 0.2, 0);

                    var bestPitch = this._getBestYAxisPitch(this.properties.maxY - this.properties.minY, freePlotHt); // Divide proportionally Y Axis drawing space within min-max

                    if (bestPitch > 0) {
                        if (this.properties.yFact === 0) {
                            // Todo: [Ravindu] Add Semi-log condition here
                            allowedPitch = bestPitch;
                        } else {
                            allowedPitch = this._getAllowedPitch(bestPitch, freePlotHt, this.properties.yFact, this.stageProperty.decimals);
                        }

                        var multiplier = [1];
                        var displayPitch = this._getDisplayPitch(allowedPitch, multiplier);
                        var H_div_h = (this.properties.ht - this.properties.clearance) / freePlotHt; // Large window height (without 1 clearance) ratio to drawing window height
                        var count = 0;
                        var scaleMinValue = H_div_h * this.properties.minY + (1 - H_div_h) * this.properties.maxY; // Todo: [Ravindu] Not clear
                        var beginVal = this._calculateBeginValue(scaleMinValue, allowedPitch);
                        var val = beginVal;
                        var currPXPos = _pixelConversion.default.getPixelForTheYValue(val, this.properties);
                        var xPos = Math.round(this.properties.x + this.properties.wd);
                        var gapBetwAxis = 3;
                        var formatedVal = void 0,
                            multipliedVal = void 0;

                        while (currPXPos > this.properties.top) {
                            if (currPXPos <= this.properties.ht + this.properties.y) {
                                if (this.containerStudyType === _chartCoreConstants.default.ChartStudyType.Indicator || multiplier[0] >= 1000) {
                                    multipliedVal = val / multiplier[0]; // To check whether it is zero to remove decimals
                                    formatedVal = _chartFormatters.default.formatToDecimal(multipliedVal, multipliedVal === 0 ? 0 : _chartFormatters.default.getDecimalFormatter(displayPitch));
                                } else {
                                    formatedVal = _chartFormatters.default.formatToDecimal(val, this.stageProperty.decimals);
                                }

                                // Draw horizontal line step by step by multiplying 1 point pixel distance
                                this.yAxis.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 1, 0);
                                this.yAxis.moveTo(xPos, currPXPos);
                                this.yAxis.lineTo(xPos + gapBetwAxis - 2, currPXPos);

                                yLbl = new PIXI.Text(formatedVal, this.stageProperty.textStyle);

                                yLbl.resolution = 2;
                                yLbl.position.set(xPos + gapBetwAxis, Math.round(currPXPos - this.stageProperty.textStyle.fontSize / 2 - 2));

                                this.yAxis.addChild(yLbl);

                                this.horizontalGrids.moveTo(0, currPXPos);
                                this.horizontalGrids.lineTo(xPos, currPXPos);
                            }

                            if (count > 10000) {
                                break;
                            }

                            count++;

                            val = beginVal + count * allowedPitch;

                            currPXPos = _pixelConversion.default.getPixelForTheYValue(val, this.properties);
                        }

                        if (multiplier[0] > 1) {
                            this.yAxis.addChild(this._drawMultiplier(this.properties, multiplier));
                        }
                    }

                    this.horizontalGrids.endFill();
                    this.yAxis.endFill();
                } catch (e) {
                    _utils.default.logger.logError(' [Pro Chart] Draw Y Axis ' + e);
                }
            }
        }, {
            key: '_getBestYAxisPitch',
            value: function _getBestYAxisPitch(minMaxDiff, viewHeightPx) {
                if (viewHeightPx <= 0) {
                    return minMaxDiff * 10;
                }

                // This gives value represented by quarter of an inch

                var valueDiffPerQtrInch = minMaxDiff / viewHeightPx * (this.stageProperty.halfInchDpi / 2); // (val/ px) * (px / inches) =  valInch-1 (inches = px/dpi)
                var pitch = _chartCoreConstants.default.PriceVolPitch[0];

                for (var j = 1; j < _chartCoreConstants.default.LongMaxVal; j *= 10) {
                    var Multiplier = j / _chartCoreConstants.default.Billion;

                    for (var i = 0; i < _chartCoreConstants.default.PriceVolPitch.length; i++) {
                        if (valueDiffPerQtrInch >= Multiplier * _chartCoreConstants.default.PriceVolPitch[i]) {
                            pitch = Multiplier * _chartCoreConstants.default.PriceVolPitch[i];
                        } else {
                            return pitch;
                        }
                    }

                    if (j > _chartCoreConstants.default.LongMaxVal / 10) {
                        return pitch;
                    }
                }

                return pitch;
            }
        }, {
            key: '_getAllowedPitch',
            value: function _getAllowedPitch(bestPitch, freePlotHt, winYFactor, decimals) {
                var minGap = this._getYMinGap(freePlotHt);
                var allowPitch = bestPitch;
                var currentPXGap = bestPitch * winYFactor;
                var allowedLoopCount = 100;
                var count = 0;

                if (minGap / currentPXGap > allowedLoopCount) {
                    allowPitch = bestPitch * Math.round(minGap / currentPXGap);
                } else {
                    count = 0;

                    while (currentPXGap < minGap) {
                        if (currentPXGap > freePlotHt || count > allowedLoopCount) {
                            break;
                        }

                        allowPitch += bestPitch;
                        currentPXGap = allowPitch * winYFactor;
                        count++;
                    }
                }

                var minimumIncrementVal = 1;

                for (var i = 0; i < decimals; i++) {
                    minimumIncrementVal /= 10;
                }

                if (allowPitch < minimumIncrementVal) {
                    allowPitch = minimumIncrementVal;
                }

                return allowPitch;
            }
        }, {
            key: '_getYMinGap',
            value: function _getYMinGap(winHeight) {
                var minGap = this.stageProperty.halfInchDpi / 2; // Quarter of an inch

                if (winHeight <= 2 * this.stageProperty.halfInchDpi) {
                    // If height is less than or equal to inch use min gap as eighth of the inch
                    minGap = this.stageProperty.halfInchDpi / 4;
                } else if (winHeight <= 4 * this.stageProperty.halfInchDpi) {
                    // If height is less than or equal to 2 inch use min gap as sixth of the inch
                    minGap = this.stageProperty.halfInchDpi / 3;
                }

                return minGap;
            }
        }, {
            key: '_getDisplayPitch',
            value: function _getDisplayPitch(allowedPitch, multiplier) {
                if (allowedPitch >= _chartCoreConstants.default.Billion && allowedPitch % _chartCoreConstants.default.Billion === 0) {
                    multiplier[0] = _chartCoreConstants.default.Billion;
                    return allowedPitch / _chartCoreConstants.default.Billion;
                } else if (allowedPitch >= _chartCoreConstants.default.Million && allowedPitch % _chartCoreConstants.default.Million === 0) {
                    multiplier[0] = _chartCoreConstants.default.Million;
                    return allowedPitch / _chartCoreConstants.default.Million;
                } else if (allowedPitch >= _chartCoreConstants.default.Thousand && allowedPitch % _chartCoreConstants.default.Thousand === 0) {
                    multiplier[0] = _chartCoreConstants.default.Thousand;
                    return allowedPitch / _chartCoreConstants.default.Thousand;
                } else {
                    multiplier[0] = 1;
                    return allowedPitch;
                }
            }
        }, {
            key: '_drawMultiplier',
            value: function _drawMultiplier(properties, multiplier) {
                var yMulti = new PIXI.Graphics();
                var displayText = multiplier[0] === _chartCoreConstants.default.Thousand ? 'x1K' : multiplier[0] === _chartCoreConstants.default.Million ? 'x1M' : 'x1B';
                var yMultiTxt = new PIXI.Text(displayText, this.stageProperty.textStyle);
                var xGap = 12;

                yMultiTxt.resolution = 2;
                yMultiTxt.position.set(Math.round(properties.x + properties.wd + xGap), Math.round(properties.y + properties.ht - this.stageProperty.textStyle.fontSize - 2));

                yMulti.beginFill(0, 0);
                yMulti.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 1, 0);

                yMulti.drawRect(Math.round(properties.x + properties.wd + xGap - 2), Math.round(properties.y + properties.ht - this.stageProperty.textStyle.fontSize - 2), yMultiTxt.width + 4, this.stageProperty.textStyle.fontSize + 4);

                yMulti.endFill();

                yMulti.addChild(yMultiTxt);

                return yMulti;
            }
        }, {
            key: '_calculateBeginValue',
            value: function _calculateBeginValue(minYp, allowedPitch) {
                return allowedPitch * Math.floor(minYp / allowedPitch);
            }
        }, {
            key: '_drawCompareLegend',
            value: function _drawCompareLegend() {
                _utils.default.logger.logInfo('[Drw Path] Started Compare Legend');

                try {
                    _chartUtils.default.removeParentChildren(this.compareLegendGraphic);

                    if (this.chartStrategies.length > 0) {
                        var that = this;
                        var y = this.properties.clearance;
                        var txtStyle = JSON.parse(JSON.stringify(that.stageProperty.textStyle));
                        txtStyle.fontSize = 14;
                        txtStyle.strokeThickness = 0;

                        var gap = txtStyle.fontSize / 4; // Gap between rect to text;
                        var rectWH = txtStyle.fontSize;
                        var x = this.properties.wd / 3;
                        var rect = void 0,
                            cp = void 0,
                            label = void 0,
                            closeBtn = void 0;

                        var closeTxt = that._createCloseBtnTexture(x, y, rectWH);

                        $.each(this.chartStrategies, function (index, strat) {
                            if (strat.cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Compare) {
                                try {
                                    cp = strat.cp;
                                    rect = new PIXI.Graphics(); // Color icon
                                    label = new PIXI.Text(cp.name, txtStyle); // Symbol
                                    closeBtn = new PIXI.Sprite(closeTxt); // Close
                                    closeBtn.identifier = strat;

                                    closeBtn.interactive = true;
                                    closeBtn.buttonMode = true;

                                    closeBtn.on('pointerdown', function (e) {
                                        that._onCloseButtonDown(e);
                                    });

                                    rect.beginFill(cp.plotInfos[0].lineColor);
                                    rect.drawRect(x, y, rectWH, rectWH);
                                    rect.endFill();

                                    x += rectWH + gap;

                                    label.resolution = 3;
                                    label.position.set(x, y - 1); // 1 px is used to vertically center compare text

                                    x += label.width + gap;

                                    if (x + gap > that.properties.x + that.properties.wd - 2 * that.stageProperty.xClearance) {
                                        return false; // Exceeding boundary
                                    }

                                    closeBtn.position.x = x;
                                    closeBtn.position.y = y;

                                    x += rectWH + 3 * gap;

                                    that.compareLegendGraphic.addChild(rect);
                                    that.compareLegendGraphic.addChild(label);
                                    that.compareLegendGraphic.addChild(closeBtn);
                                } catch (e) {
                                    _utils.default.logger.logError('Error in ' + e);
                                }
                            }
                        });
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error -> Draw compare symbol legend' + e);
                }

                _utils.default.logger.logInfo('[Drw Path] Finished Compare Legend');
            }
        }, {
            key: '_createCloseBtnTexture',
            value: function _createCloseBtnTexture(x, y, rectWH) {
                var close = new PIXI.Graphics();
                var rectWH_modi = rectWH - 2;

                close.beginFill(0, 0);
                close.lineStyle(0.8, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')).replace('0X', '#'), 1);

                close.moveTo(x, y + rectWH_modi);
                close.lineTo(x + rectWH_modi, y);

                close.moveTo(x, y);
                close.lineTo(x + rectWH_modi, y + rectWH_modi);

                close.endFill();
                return this.stageProperty.renderer.generateTexture(close);
            }
        }, {
            key: '_onCloseButtonDown',
            value: function _onCloseButtonDown(event) {
                try {
                    var strategy = event.target.identifier;

                    this.removeStrategy(strategy);
                    this.calcDP.removeCompareSymbol(strategy.cp);
                } catch (e) {
                    _utils.default.logger.logError('Error in compare close btn action' + e);
                }
            }
        }, {
            key: '_drawComponentBorders',
            value: function _drawComponentBorders(property) {
                if (this.compGraphic && !(this.stageProperty.isMobile && !this.stageProperty.chartParams.isLandscape)) {
                    this.compGraphic.clear();

                    this.compGraphic.beginFill(0, 0);
                    this.compGraphic.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 0.5, 0);
                    this.compGraphic.moveTo(property.x, property.y + property.ht - 1); // 1px is reduced to draw line inside mask
                    this.compGraphic.lineTo(property.x + property.wd, property.y + property.ht - 1);
                    this.compGraphic.endFill();
                }
            }
        }, {
            key: '_createStaticStrategies',
            value: function _createStaticStrategies() {
                if (this.index === 0) {
                    var staticStrat = _lineStudyFactory.default.getLineStudy(_chartCoreConstants.default.LineStudyTypes.LastValue, this.calcDP, this.stageProperty);
                    staticStrat.zIndex = -1;
                    this.addStrategy(staticStrat);
                }
            }
        }]);

        return ChartComponent;
    }();

    exports.default = ChartComponent;
});
define('universal-app/controllers/chart/core/chart-drawing', ['exports', '../../../utils/utils'], function (exports, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartDraw = function () {
        function ChartDraw() {
            _classCallCheck(this, ChartDraw);
        }

        _createClass(ChartDraw, null, [{
            key: 'createPIXIenv',
            value: function createPIXIenv(chartContainerCls, jCanvas) {
                return this._createRenderer(this._createCanvas(chartContainerCls, jCanvas[0]));
            }
        }, {
            key: '_createCanvas',
            value: function _createCanvas(chartContainerCls, canvas) {
                var chartContainer = $(chartContainerCls);

                canvas.width = chartContainer.width();
                canvas.height = chartContainer.height();
                canvas.id = 'chartCanvas';

                chartContainer.append(canvas);

                return canvas;
            }
        }, {
            key: '_createRenderer',
            value: function _createRenderer(canvas) {
                // Create the renderer
                var renderer = PIXI.autoDetectRenderer(canvas.width, canvas.height, {
                    view: canvas,
                    antialias: true,
                    transparent: true,
                    resolution: window.devicePixelRatio,
                    preserveDrawingBuffer: true,
                    roundPixels: true
                });

                _utils.default.logger.logInfo('Device pixel ratio ' + window.devicePixelRatio);

                renderer.view.style.position = 'relative';
                renderer.view.style.display = 'block';
                renderer.autoResize = true;

                PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
                // renderer.backgroundColor = 0xFFFFFF;
                // renderer.view.style.border = '1px solid #0000ff';

                return renderer;
            }
        }]);

        return ChartDraw;
    }();

    exports.default = ChartDraw;
});
define('universal-app/controllers/chart/core/chart-property', ['exports', '../../../utils/utils', './plot-info', './utils/chart-utils'], function (exports, _utils, _plotInfo, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartProperty = function () {
        function ChartProperty(stageProperty) {
            _classCallCheck(this, ChartProperty);

            this.stageProperty = stageProperty;
            this.propertyKey = ''; // Key for accessing data
            this.studyKey = ''; // Key for selecting defined calculation class

            this.inputs = {
                field: 'Close'
            };

            this.name = '';
            this.overlay = true;
            this.chartCompProperties = {};
            this.plotInfos = [new _plotInfo.default()];
            this.chartStudyType = undefined;
            this.isOpenDialog = false;
            this.channelFillBands = undefined;
        }

        /**
         * Return distinguish key for added study [eg: Ma (50,Close,simple,0,false)-2]
         */

        _createClass(ChartProperty, [{
            key: 'generateStudyId',
            value: function generateStudyId() {
                var that = this;
                var isTechStudy = that.studyKey && !that.studyKey.isEmpty();
                var formattedInput = void 0;
                var id = that.studyKey + ' (';
                var first = false;

                try {
                    $.each(that.inputs, function (field) {
                        if (!first) {
                            first = true;
                        } else {
                            id += ',';
                        }

                        formattedInput = that.inputs[field];

                        if (isTechStudy && (formattedInput.constructor === String || formattedInput.constructor === Boolean)) {
                            formattedInput = _chartUtils.default.capitalizeEachWord(formattedInput.toString());
                        }

                        id += formattedInput;
                    });
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Return id for added studies ' + e);
                }

                id += ')';

                if (!isTechStudy && id.length > 0) {
                    id = id.substring(2, id.length - 1); // Key of OHLC values in data source doesn't have '()'
                }

                that.propertyKey = id; // MA(Close, 20, 0, true);

                try {
                    $.each(that.plotInfos, function (index, info) {
                        info.propertyKey = isTechStudy && !info.key.isEmpty() ? info.key + '-' + id : id; // Todo: [Ravindu] Make a good design for link with calculation in calculation strategy.
                    });
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Updating plot info property key ' + e);
                }

                return id;
            }
        }]);

        return ChartProperty;
    }();

    exports.default = ChartProperty;
});
define('universal-app/controllers/chart/core/chart-strategy/area-chart-strategy', ['exports', './chart-strategy', '../utils/pixel-conversion', '../../../../utils/utils', '../utils/chart-utils'], function (exports, _chartStrategy, _pixelConversion, _utils, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var AreaChartStrategy = function (_ChartStrategy) {
        _inherits(AreaChartStrategy, _ChartStrategy);

        function AreaChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, AreaChartStrategy);

            var _this = _possibleConstructorReturn(this, (AreaChartStrategy.__proto__ || Object.getPrototypeOf(AreaChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.plotInfos[0].upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart-line-color', 'color'));
            return _this;
        }

        _createClass(AreaChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    var that = this;
                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;

                    that.strategyGraphic.clear();

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        var pointArr = [];
                        var lastPointY = Math.round(compProp.y + compProp.ht);
                        var px = void 0,
                            start = false;

                        try {
                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                px = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i][info.propertyKey], compProp);

                                if (px !== 0 && px <= lastPointY) {
                                    pointArr.push(new PIXI.Point(compProp.x + i * this.cp.stageProperty.xScale, px));
                                }
                            }
                        } catch (e) {
                            _utils.default.logger.logError('[pro Chart] Making point drawing array ' + e);
                        }

                        if (pointArr.length > 0) {
                            var pointArrPoly = pointArr.slice();

                            pointArrPoly.push(new PIXI.Point(pointArr[pointArr.length - 1].x, lastPointY));
                            pointArrPoly.push(new PIXI.Point(pointArr[0].x, lastPointY)); // x
                            pointArrPoly.push(new PIXI.Point(pointArr[0].x, pointArr[0].y)); // First y value is used to link with starting point and last point

                            that.strategyGraphic.beginFill(info.upColor, 0.5);

                            // Get shader code as a string
                            // const gradientFilter = new PIXI.Filter(null, GLShaders.gradientShader); // Create our Pixi filter using our custom shader code

                            // utils.logger.logInfo(simpleShader.vertexSrc, simpleShader.fragmentSrc);

                            // that.strategyGraphic.filters = [gradientFilter]; // Apply it to our object

                            that.strategyGraphic.drawPolygon(pointArrPoly);
                            that.strategyGraphic.hitArea = new PIXI.Polygon(pointArrPoly);
                            that.strategyGraphic.endFill();

                            that.strategyGraphic.beginFill(0, 0);
                            that.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                            $.each(pointArr, function (index, point) {
                                if (!start) {
                                    that.strategyGraphic.moveTo(point.x, point.y);
                                    start = true;
                                } else {
                                    that.strategyGraphic.lineTo(point.x, point.y);
                                }
                            });

                            that.strategyGraphic.endFill();
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot area ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                this.cp.plotInfos[0].upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart-line-color', 'color'));
            }
        }]);

        return AreaChartStrategy;
    }(_chartStrategy.default);

    exports.default = AreaChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/bar-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var BarChartStrategy = function (_ChartStrategy) {
        _inherits(BarChartStrategy, _ChartStrategy);

        function BarChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, BarChartStrategy);

            var _this = _possibleConstructorReturn(this, (BarChartStrategy.__proto__ || Object.getPrototypeOf(BarChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.isTrendEnabled = false;

            var info = _this.cp.plotInfos[0];

            info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
            info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            info.lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
            return _this;
        }

        _createClass(BarChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var px = void 0,
                        c = void 0,
                        color = void 0,
                        prevY = void 0,
                        barH = void 0;
                    var drawingHt = Math.round(compProp.y + compProp.ht - compProp.clearance);
                    var dataSource = this.calcDP.getDataArray();

                    if (dataSource && dataSource.length > 0) {
                        this.strategyGraphic.beginFill(info.lineColor, 1);

                        try {
                            for (var i = 0; i < dataSource.length; i++) {
                                if (dataSource[i][info.propertyKey] > 0) {
                                    px = _pixelConversion.default.getPixelForTheYValue(dataSource[i][info.propertyKey], compProp);

                                    if (px !== 0 && px <= drawingHt) {
                                        if (this.isTrendEnabled) {
                                            c = dataSource[i].Close;
                                            color = c >= prevY ? info.upColor : info.downColor;
                                            this.strategyGraphic.beginFill(color, 1);

                                            prevY = c;
                                        }

                                        barH = drawingHt - px > 1 ? Math.round(drawingHt - px) : 1; // Small volume will be shown as 1 px height

                                        this.strategyGraphic.drawRect(Math.round(compProp.x + i * this.cp.stageProperty.xScale - this.cp.stageProperty.barThickness / 2), px, this.cp.stageProperty.barThickness, barH); // Bar height from min value to point value
                                    }
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making bar chart ' + x);
                        }

                        this.strategyGraphic.endFill();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot bar ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                var info = this.cp.plotInfos[0];

                info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
                info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
                info.lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
            }
        }]);

        return BarChartStrategy;
    }(_chartStrategy.default);

    exports.default = BarChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/candle-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CandleChartStrategy = function (_ChartStrategy) {
        _inherits(CandleChartStrategy, _ChartStrategy);

        function CandleChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, CandleChartStrategy);

            var _this = _possibleConstructorReturn(this, (CandleChartStrategy.__proto__ || Object.getPrototypeOf(CandleChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.isUsedHighLow = true;
            var info = _this.cp.plotInfos[0];

            info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
            info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            return _this;
        }

        _createClass(CandleChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        try {
                            var oPx = 0,
                                cPx = 0,
                                hPx = 0,
                                lPx = 0,
                                xPos = void 0,
                                rectXPos = void 0,
                                rectWd = void 0;
                            var lastPointY = Math.round(compProp.y + compProp.ht);

                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                oPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Open, compProp);
                                cPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Close, compProp);
                                hPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].High, compProp);
                                lPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Low, compProp);

                                xPos = Math.round(compProp.x + i * this.cp.stageProperty.xScale);
                                rectXPos = Math.round(compProp.x + (i * this.cp.stageProperty.xScale - this.cp.stageProperty.dashLength));
                                rectWd = 2 * this.cp.stageProperty.dashLength;

                                // utils.logger.logInfo('Candle Chart Strategy drawing ' + oPx + ',' + cPx + ',' + hPx + ',' + lPx + ',' + xPos + ',' + rectXPos + ',' + rectWd);

                                if (oPx !== 0 && oPx <= lastPointY && hPx !== 0 && hPx <= lastPointY && lPx !== 0 && lPx <= lastPointY && cPx !== 0 && cPx <= lastPointY) {
                                    this.strategyGraphic.beginFill(info.upColor, 1);
                                    this.strategyGraphic.lineStyle(1, info.upColor, 1, 0);

                                    if (oPx === cPx) {
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.drawRect(rectXPos, oPx, rectWd, 1);
                                    } else if (oPx > cPx) {
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, cPx);

                                        this.strategyGraphic.moveTo(xPos, oPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.drawRect(rectXPos, cPx, rectWd, oPx - cPx);
                                    } else {
                                        this.strategyGraphic.lineStyle(1, info.downColor, 1, 0);
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, oPx);

                                        this.strategyGraphic.moveTo(xPos, cPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.beginFill(info.downColor, 1);
                                        this.strategyGraphic.drawRect(rectXPos, oPx, rectWd, cPx - oPx);
                                    }
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making candle chart ' + x);
                        }

                        this.strategyGraphic.endFill();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot candle ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                var info = this.cp.plotInfos[0];

                info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
                info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            }
        }]);

        return CandleChartStrategy;
    }(_chartStrategy.default);

    exports.default = CandleChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/chart-strategy-factory', ['exports', './area-chart-strategy', './line-chart-strategy', './point-chart-strategy', './candle-chart-strategy', './hollow-candle-chart-strategy', './tech-indicator/ma-chart-strategy', '../utils/chart-studies', '../utils/chart-core-constants', './tech-indicator/bb-chart-strategy', './tech-indicator/vol-chart-strategy', './tech-indicator/momentum-chart-strategy', './histo-chart-strategy', './tech-indicator/macd-chart-strategy', './ohlc-chart-strategy', './bar-chart-strategy', './fundamental-indicator/per-chart-strategy', './fundamental-indicator/pbr-chart-strategy', './tech-indicator/wilders-smoth-chart-strategy', './tech-indicator/atr-chart-strategy', './tech-indicator/plus-di-chart-strategy', './tech-indicator/minus-di-chart-strategy', './tech-indicator/dx-chart-strategy', './tech-indicator/adx-chart-strategy', './tech-indicator/adxr-chart-strategy', './tech-indicator/acc-dis-chart-strategy', './tech-indicator/time-forc-chart-strategy', './tech-indicator/chaikin-mf-chart-strategy', './tech-indicator/trix-chart-strategy', './tech-indicator/cci-chart-strategy', './tech-indicator/rsi-chart-strategy', './tech-indicator/psar-chart-strategy', './tech-indicator/williams-per-r-chart-strategy', './tech-indicator/vol-oscillator-chart-strategy', './tech-indicator/mfi-chart-strategy', './tech-indicator/cmo-chart-strategy', './tech-indicator/mp-chart-strategy', './tech-indicator/obv-chart-strategy', './tech-indicator/stoch-oscillator-chart-strategy'], function (exports, _areaChartStrategy, _lineChartStrategy, _pointChartStrategy, _candleChartStrategy, _hollowCandleChartStrategy, _maChartStrategy, _chartStudies, _chartCoreConstants, _bbChartStrategy, _volChartStrategy, _momentumChartStrategy, _histoChartStrategy, _macdChartStrategy, _ohlcChartStrategy, _barChartStrategy, _perChartStrategy, _pbrChartStrategy, _wildersSmothChartStrategy, _atrChartStrategy, _plusDiChartStrategy, _minusDiChartStrategy, _dxChartStrategy, _adxChartStrategy, _adxrChartStrategy, _accDisChartStrategy, _timeForcChartStrategy, _chaikinMfChartStrategy, _trixChartStrategy, _cciChartStrategy, _rsiChartStrategy, _psarChartStrategy, _williamsPerRChartStrategy, _volOscillatorChartStrategy, _mfiChartStrategy, _cmoChartStrategy, _mpChartStrategy, _obvChartStrategy, _stochOscillatorChartStrategy) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartStrategyFactory = function () {
        function ChartStrategyFactory() {
            _classCallCheck(this, ChartStrategyFactory);
        }

        _createClass(ChartStrategyFactory, null, [{
            key: 'getChartStrategy',
            value: function getChartStrategy(id, calcDP, stageProp) {
                if (_chartCoreConstants.default.ChartStyle.Area.ChartType === id) {
                    return new _areaChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.Line.ChartType === id) {
                    return new _lineChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.Point.ChartType === id) {
                    return new _pointChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.Bar.ChartType === id) {
                    return new _barChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.OHLC.ChartType === id) {
                    return new _ohlcChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.Candle.ChartType === id) {
                    return new _candleChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.CandleWithTrend.ChartType === id) {
                    return new _hollowCandleChartStrategy.default(calcDP, stageProp);
                } else if (_chartCoreConstants.default.ChartStyle.Histogram.ChartType === id) {
                    return new _histoChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.MovingAverage.ChartIndID === id) {
                    return new _maChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.BollingerBands.ChartIndID === id) {
                    return new _bbChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.Vol.ChartIndID === id) {
                    return new _volChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.Momentum.ChartIndID === id) {
                    return new _momentumChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.MACD.ChartIndID === id) {
                    return new _macdChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.PER.ChartIndID === id) {
                    return new _perChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.PBR.ChartIndID === id) {
                    return new _pbrChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.WildersSmoothing.ChartIndID === id) {
                    return new _wildersSmothChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.AverageTrueRange.ChartIndID === id) {
                    return new _atrChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementPlusDI.ChartIndID === id) {
                    return new _plusDiChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementMinusDI.ChartIndID === id) {
                    return new _minusDiChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementDX.ChartIndID === id) {
                    return new _dxChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID === id) {
                    return new _adxChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.DirectionalMovementADXR.ChartIndID === id) {
                    return new _adxrChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.AccumulationDistribution.ChartIndID === id) {
                    return new _accDisChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.TimeSeriesForecast.ChartIndID === id) {
                    return new _timeForcChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.ChaikinMF.ChartIndID === id) {
                    return new _chaikinMfChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.TRIX.ChartIndID === id) {
                    return new _trixChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.CommodityChannelIndex.ChartIndID === id) {
                    return new _cciChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.RelativeStrengthIndex.ChartIndID === id) {
                    return new _rsiChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.PSAR.ChartIndID === id) {
                    return new _psarChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.WilliamsPerR.ChartIndID === id) {
                    return new _williamsPerRChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.VolOsc.ChartIndID === id) {
                    return new _volOscillatorChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.MoneyFlowIndex.ChartIndID === id) {
                    return new _mfiChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.ChandeMomentumOscillator.ChartIndID === id) {
                    return new _cmoChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.MedianPrice.ChartIndID === id) {
                    return new _mpChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.onBalanceVolume.ChartIndID === id) {
                    return new _obvChartStrategy.default(calcDP, stageProp);
                } else if (_chartStudies.default.Indicators.StochasticOscillator.ChartIndID === id) {
                    return new _stochOscillatorChartStrategy.default(calcDP, stageProp);
                }
            }
        }]);

        return ChartStrategyFactory;
    }();

    exports.default = ChartStrategyFactory;
});
define('universal-app/controllers/chart/core/chart-strategy/chart-strategy', ['exports', '../../core/chart-property', '../plot-info', '../utils/pixel-conversion', '../../../../utils/utils'], function (exports, _chartProperty, _plotInfo, _pixelConversion, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartStrategy = function () {
        function ChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, ChartStrategy);

            this.calcDP = calcDataProvider;
            this.cp = new _chartProperty.default(stageProp);
            this.plotChartStrategy = [];
            this.cp.plotInfos[0] = new _plotInfo.default();
            this.strategyGraphic = new PIXI.Graphics();
            this.strategyId = undefined;
            this.onAdjustLayout = undefined;
            this.strategyGraphic.interactive = true;
            this.zIndex = 0;
            this.randomColorIndex = -1; // When Theme changing comparison chart current color should be changed to its relevant changed theme color
            this.isUsedHighLow = false; // Drawing used High & Low
            this.channelFillObj = new PIXI.Graphics();
            this.strategyGraphic.addChild(this.channelFillObj);
        }

        /**
         * Calculate Indicator and Draw
         * @param hasMultipleInvokes: Avoiding multiple onAdjustLayout's invocations
         */

        _createClass(ChartStrategy, [{
            key: 'drawChart',
            value: function drawChart(hasMultipleInvokes) {
                var that = this;

                this.calcDP.getCalcData({
                    cp: that.cp,

                    onSuccesFn: function onSuccesFn() {
                        // Finished Chart Calculation

                        if (that.onAdjustLayout && $.isFunction(that.onAdjustLayout)) {
                            if (!hasMultipleInvokes) {
                                that.onAdjustLayout(); // ReAdjusting whole chart with calculated strategy' new min max
                            }
                        } else {
                            that.strategyGraphic.clear();
                            that.drawGraphics(undefined); // Drawing strategies for Readjustment is not required
                        }
                    }
                });
            }
        }, {
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                var that = this;

                for (var i = 0; i < that.plotChartStrategy.length; i++) {
                    that.plotChartStrategy[i].drawGraphics(that.cp.plotInfos[i]);
                }

                if (!plotInfo) {
                    that.createChannelFill();
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {}
        }, {
            key: 'addDrawingClip',
            value: function addDrawingClip() {}
        }, {
            key: 'createPlot',
            value: function createPlot(params) {
                var plotInfo = new _plotInfo.default();
                var propKey = void 0;

                if (params.innerPlots) {
                    $.each(params.innerPlots, function (index, innerPlot) {
                        propKey = Object.keys(innerPlot)[1];
                        plotInfo[propKey] = innerPlot[propKey];
                    });

                    plotInfo.innerPlots = params.innerPlots;
                }

                plotInfo.key = params.key; // Todo: [Ravindu] Make a good design for link with calculation in calculation strategy.

                if (params.index) {
                    this.cp.plotInfos[params.index] = plotInfo;
                } else {
                    this.cp.plotInfos.push(plotInfo);
                }

                if (params.chartStrategy) {
                    var plot = params.chartStrategy;
                    plot.cp = this.cp; // Assigned parent chart property

                    this.plotChartStrategy.push(plot);
                    this.strategyGraphic.addChild(plot.strategyGraphic);
                }
            }
        }, {
            key: 'createChannelFill',
            value: function createChannelFill() {
                try {
                    this.channelFillObj.clear();

                    if (this.cp.channelFillBands && this.cp.channelFillBands.topBand) {
                        var compProp = this.cp.chartCompProperties;
                        var topInfo = this.cp.channelFillBands.topBand;
                        var medianInfo = this.cp.channelFillBands.medianBand;
                        var bottomInfo = this.cp.channelFillBands.bottomBand;
                        var dataSrc = this.calcDP.getDataArray();

                        if (dataSrc && dataSrc.length > 0) {
                            var pointArr = [];
                            var px = void 0,
                                startPx = 0,
                                endPx = 0;

                            try {
                                for (var i = 0; i < dataSrc.length; i++) {
                                    px = _pixelConversion.default.getPixelForTheYValue(dataSrc[i][topInfo.propertyKey], compProp);

                                    if (medianInfo && startPx === 0) {
                                        startPx = _pixelConversion.default.getPixelForTheYValue(dataSrc[i][medianInfo.propertyKey], compProp);

                                        if (startPx !== 0) {
                                            pointArr.push(new PIXI.Point(Math.round(compProp.x + i * this.cp.stageProperty.xScale), startPx));
                                        }
                                    }

                                    if (px !== 0) {
                                        pointArr.push(new PIXI.Point(Math.round(compProp.x + i * this.cp.stageProperty.xScale), px));
                                    }
                                }
                            } catch (e) {
                                _utils.default.logger.logError('[pro Chart] Making top point drawing array ' + e);
                            }

                            try {
                                for (var _i = dataSrc.length - 1; _i >= 0; _i--) {
                                    px = _pixelConversion.default.getPixelForTheYValue(dataSrc[_i][bottomInfo.propertyKey], compProp);

                                    if (medianInfo && endPx === 0) {
                                        endPx = _pixelConversion.default.getPixelForTheYValue(dataSrc[_i][medianInfo.propertyKey], compProp);

                                        if (endPx !== 0) {
                                            pointArr.push(new PIXI.Point(Math.round(compProp.x + _i * this.cp.stageProperty.xScale), endPx));
                                        }
                                    }

                                    if (px !== 0) {
                                        pointArr.push(new PIXI.Point(Math.round(compProp.x + _i * this.cp.stageProperty.xScale), px));
                                    }
                                }
                            } catch (e) {
                                _utils.default.logger.logError('[pro Chart] Making bottom point drawing array ' + e);
                            }

                            if (pointArr.length > 0) {
                                pointArr.push(new PIXI.Point(pointArr[0].x, pointArr[0].y));

                                this.channelFillObj.beginFill(0X006ABE, 0.1);
                                this.channelFillObj.drawPolygon(pointArr);
                                this.channelFillObj.hitArea = new PIXI.Polygon(pointArr);
                                this.channelFillObj.endFill();
                            }

                            /* const that = this;
                            that.channelFillObj.beginFill(0x000000, 1);
                            that.channelFillObj.lineStyle(1, 0x000000, 1, 0);
                            let start = false;
                              pointArr.push(new PIXI.Point(pointArr[0].x, pointArr[0].y));
                              $.each(pointArr, function (index, point) {
                                if (!start) {
                                    that.channelFillObj.moveTo(point.x, point.y);
                                    start = true;
                                } else {
                                    that.channelFillObj.lineTo(point.x, point.y);
                                }
                            });
                              that.channelFillObj.endFill();*/
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot channel fill' + e);
                }
            }
        }]);

        return ChartStrategy;
    }();

    exports.default = ChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/fundamental-indicator/pbr-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        var _createClass = function () {
                function defineProperties(target, props) {
                        for (var i = 0; i < props.length; i++) {
                                var descriptor = props[i];
                                descriptor.enumerable = descriptor.enumerable || false;
                                descriptor.configurable = true;
                                if ("value" in descriptor) descriptor.writable = true;
                                Object.defineProperty(target, descriptor.key, descriptor);
                        }
                }

                return function (Constructor, protoProps, staticProps) {
                        if (protoProps) defineProperties(Constructor.prototype, protoProps);
                        if (staticProps) defineProperties(Constructor, staticProps);
                        return Constructor;
                };
        }();

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var PBRChartStrategy = function (_ChartStrategy) {
                _inherits(PBRChartStrategy, _ChartStrategy);

                function PBRChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, PBRChartStrategy);

                        var _this = _possibleConstructorReturn(this, (PBRChartStrategy.__proto__ || Object.getPrototypeOf(PBRChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.name = 'chartPBR';
                        _this.cp.overlay = false;

                        _this.cp.inputs = {
                                field: 'PBR'
                        };

                        var innerPlot = {
                                langKey: 'PBR',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var perPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        perPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = perPlot0;
                        _this.strategyGraphic.addChild(perPlot0.strategyGraphic);
                        return _this;
                }

                _createClass(PBRChartStrategy, [{
                        key: 'changeThemeProperties',
                        value: function changeThemeProperties() {
                                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
                        }
                }]);

                return PBRChartStrategy;
        }(_chartStrategy.default);

        exports.default = PBRChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/fundamental-indicator/per-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        var _createClass = function () {
                function defineProperties(target, props) {
                        for (var i = 0; i < props.length; i++) {
                                var descriptor = props[i];
                                descriptor.enumerable = descriptor.enumerable || false;
                                descriptor.configurable = true;
                                if ("value" in descriptor) descriptor.writable = true;
                                Object.defineProperty(target, descriptor.key, descriptor);
                        }
                }

                return function (Constructor, protoProps, staticProps) {
                        if (protoProps) defineProperties(Constructor.prototype, protoProps);
                        if (staticProps) defineProperties(Constructor, staticProps);
                        return Constructor;
                };
        }();

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var PERChartStrategy = function (_ChartStrategy) {
                _inherits(PERChartStrategy, _ChartStrategy);

                function PERChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, PERChartStrategy);

                        var _this = _possibleConstructorReturn(this, (PERChartStrategy.__proto__ || Object.getPrototypeOf(PERChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.name = 'chartPER';
                        _this.cp.overlay = false;

                        _this.cp.inputs = {
                                field: 'PER'
                        };

                        var innerPlot = {
                                langKey: 'PER',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var perPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        perPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = perPlot0;
                        _this.strategyGraphic.addChild(perPlot0.strategyGraphic);
                        return _this;
                }

                _createClass(PERChartStrategy, [{
                        key: 'changeThemeProperties',
                        value: function changeThemeProperties() {
                                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
                        }
                }]);

                return PERChartStrategy;
        }(_chartStrategy.default);

        exports.default = PERChartStrategy;
});
define("universal-app/controllers/chart/core/chart-strategy/gl-shaders", ["exports"], function (exports) {
    "use strict";

    exports.default = {
        gradientShader: "\n    precision mediump float;\n    varying vec2 vTextureCoord;\n    varying vec2 vFilterCoord;\n\n    uniform sampler2D uSampler;\n\n    // start and end colors\n    vec4 color1 = vec4(1.0, 1.0, 1.0, 1.0);\n    vec4 color2 = vec4(0.21, 0.47, 0.68, 1.0);\n\n    void main(){\n        vec4 mixCol = mix(color2, color1, vFilterCoord.y);\n        vec4 fg = texture2D(uSampler, vTextureCoord);\n\n        gl_FragColor = mixCol * fg.a;\n    }"
    };
});
define('universal-app/controllers/chart/core/chart-strategy/histo-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var HistoChartStrategy = function (_ChartStrategy) {
        _inherits(HistoChartStrategy, _ChartStrategy);

        function HistoChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, HistoChartStrategy);

            var _this = _possibleConstructorReturn(this, (HistoChartStrategy.__proto__ || Object.getPrototypeOf(HistoChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.isTrendEnabled = true;

            var info = _this.cp.plotInfos[0];

            info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
            info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            info.lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
            return _this;
        }

        _createClass(HistoChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var px = void 0,
                        prevY = void 0,
                        color = void 0,
                        val = void 0;
                    var bottom = Math.round(compProp.y + compProp.ht - compProp.clearance); // Math.min(r.getClearance() / 3, 5)
                    var isCandleTrendUp = true; // To show correct trend of first point, need to compare with previous point of first point. Hence this trend should be calculated in ohlc-data-store and send with ohlc-series when data buld data receiving.

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        try {
                            prevY = isCandleTrendUp ? Number.MAX_VALUE : Number.MIN_VALUE;
                            var zero = _pixelConversion.default.getPixelForTheYValue(0, compProp);

                            if (zero > bottom) {
                                zero = bottom;
                            }

                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                val = this.calcDP.getDataArray()[i][info.propertyKey];

                                if (this.isTrendEnabled) {
                                    color = val >= prevY ? info.upColor : info.downColor;

                                    // this.strategyGraphic.lineStyle(1, color, 1);
                                    this.strategyGraphic.beginFill(color, 1);

                                    prevY = val;
                                }

                                px = _pixelConversion.default.getPixelForTheYValue(val, compProp);

                                if (px !== 0) {
                                    this.strategyGraphic.drawRect(Math.round(compProp.x + i * this.cp.stageProperty.xScale - this.cp.stageProperty.barThickness / 2), Math.min(px, zero), this.cp.stageProperty.barThickness, Math.abs(zero - px));
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making bar chart ' + x);
                        }

                        this.strategyGraphic.endFill();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot bar ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                var info = this.cp.plotInfos[0];

                info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
                info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
                info.lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('area-chart', 'background-color'));
            }
        }]);

        return HistoChartStrategy;
    }(_chartStrategy.default);

    exports.default = HistoChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/hollow-candle-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var HollowCandleChartStrategy = function (_ChartStrategy) {
        _inherits(HollowCandleChartStrategy, _ChartStrategy);

        function HollowCandleChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, HollowCandleChartStrategy);

            var _this = _possibleConstructorReturn(this, (HollowCandleChartStrategy.__proto__ || Object.getPrototypeOf(HollowCandleChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.isUsedHighLow = true;
            var info = _this.cp.plotInfos[0];

            info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
            info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            return _this;
        }

        _createClass(HollowCandleChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        try {
                            var isCandleTrendUp = true; // To show correct trend of first point, need to compare with previous point of first point. Hence this trend should be calculated in ohlc-data-store and send with ohlc-series when data buld data receiving.
                            var prevY = isCandleTrendUp ? Number.MAX_VALUE : Number.MIN_VALUE;
                            var oPx = 0,
                                cPx = 0,
                                hPx = 0,
                                lPx = 0,
                                c = void 0,
                                color = void 0,
                                xPos = void 0,
                                rectXPos = void 0,
                                rectWd = void 0;
                            var lastPointY = Math.round(compProp.y + compProp.ht);

                            // Todo: [Ravindu] Calculation should do with selected ohlc type

                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                oPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Open, compProp);
                                cPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Close, compProp);
                                hPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].High, compProp);
                                lPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Low, compProp);

                                c = this.calcDP.getDataArray()[i].Close;
                                xPos = Math.round(compProp.x + i * this.cp.stageProperty.xScale);
                                rectXPos = Math.round(compProp.x + (i * this.cp.stageProperty.xScale - this.cp.stageProperty.dashLength));
                                rectWd = 2 * this.cp.stageProperty.dashLength;

                                if (oPx !== 0 && oPx <= lastPointY && hPx !== 0 && hPx <= lastPointY && lPx !== 0 && lPx <= lastPointY && cPx !== 0 && cPx <= lastPointY) {
                                    color = c >= prevY ? info.upColor : info.downColor;
                                    this.strategyGraphic.lineStyle(1, color, 1, 0);
                                    this.strategyGraphic.beginFill(color, 1);

                                    if (oPx === cPx) {
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.drawRect(rectXPos, oPx, rectWd, 1);
                                    } else if (oPx > cPx) {
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, cPx);

                                        this.strategyGraphic.moveTo(xPos, oPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.beginFill(0, 0);
                                        this.strategyGraphic.drawRect(rectXPos, cPx, rectWd, oPx - cPx);
                                    } else {
                                        this.strategyGraphic.moveTo(xPos, hPx);
                                        this.strategyGraphic.lineTo(xPos, oPx);

                                        this.strategyGraphic.moveTo(xPos, cPx);
                                        this.strategyGraphic.lineTo(xPos, lPx);

                                        this.strategyGraphic.drawRect(rectXPos, oPx, rectWd, cPx - oPx);
                                    }

                                    prevY = c;
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making candle chart ' + x);
                        }

                        this.strategyGraphic.endFill();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot candle ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                var info = this.cp.plotInfos[0];

                info.upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'));
                info.downColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'));
            }
        }]);

        return HollowCandleChartStrategy;
    }(_chartStrategy.default);

    exports.default = HollowCandleChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var LineChartStrategy = function (_ChartStrategy) {
        _inherits(LineChartStrategy, _ChartStrategy);

        function LineChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, LineChartStrategy);

            var _this = _possibleConstructorReturn(this, (LineChartStrategy.__proto__ || Object.getPrototypeOf(LineChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(LineChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var start = false,
                        px = void 0,
                        xPos = void 0;
                    var lastPointY = Math.round(compProp.y + compProp.ht);

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                        try {
                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                px = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i][info.propertyKey], compProp);

                                if (px !== 0 && px <= lastPointY) {
                                    xPos = compProp.x + i * this.cp.stageProperty.xScale;

                                    if (!start) {
                                        // Move it to the beginning of the line

                                        this.strategyGraphic.moveTo(xPos, px);
                                        start = true;
                                    } else {
                                        this.strategyGraphic.lineTo(xPos, px);
                                    }
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making line chart ' + x);
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot Line ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                this.cp.plotInfos[0].lineColor = this.randomColorIndex === -1 ? _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')) : this.cp.stageProperty.getComparisonColorArray()[this.randomColorIndex];
            }
        }]);

        return LineChartStrategy;
    }(_chartStrategy.default);

    exports.default = LineChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/circle-chart-strategy', ['exports', './line-study-chart-strategy', '../../../../../utils/utils', '../../utils/pixel-conversion', '../../utils/chart-core-constants'], function (exports, _lineStudyChartStrategy, _utils, _pixelConversion, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CircleChartStrategy = function (_LineStudyChartStrate) {
        _inherits(CircleChartStrategy, _LineStudyChartStrate);

        function CircleChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, CircleChartStrategy);

            var _this = _possibleConstructorReturn(this, (CircleChartStrategy.__proto__ || Object.getPrototypeOf(CircleChartStrategy)).call(this, calcDataProvider, stageProp, true));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.Ellipse;
            return _this;
        }

        _createClass(CircleChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var wd = void 0,
                        ht = void 0,
                        radius = void 0,
                        x = void 0,
                        y = void 0;

                    this.strategyGraphic.beginFill(info.lineColor, 0.5);
                    this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                    _utils.default.logger.logInfo('Circ Line Study beginIndex ' + this.calcDP.beginIndex);
                    _utils.default.logger.logInfo('Circ Line Study conversion ' + this.mouse.xStartIndex + ',' + this.mouse.yStartVal);

                    wd = Math.abs(this.mouse.xIndex - this.mouse.xStartIndex) * this.cp.stageProperty.xScale;
                    ht = Math.abs(this.mouse.yVal - this.mouse.yStartVal) * compProp.yFact;
                    radius = Math.round(Math.sqrt(Math.pow(wd, 2) + Math.pow(ht, 2)));

                    _utils.default.logger.logInfo('Circ Line Study drawing ' + this.mouse.xStartIndex + ',' + this.mouse.yStartVal + ',' + wd + ',' + ht + ', rad ' + radius);

                    x = Math.round((this.mouse.xStartIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale);
                    y = _pixelConversion.default.getPixelForTheYValue(this.mouse.yStartVal, compProp);

                    this.strategyGraphic.drawCircle(x, y, radius);
                    this.strategyGraphic.hitArea = new PIXI.Circle(x, y, radius);

                    this.strategyGraphic.endFill();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Circle ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(CircleChartStrategy.prototype.__proto__ || Object.getPrototypeOf(CircleChartStrategy.prototype), 'changeThemeProperties', this).call(this);
            }
        }, {
            key: 'addDragPoints',
            value: function addDragPoints() {
                var compProp = this.cp.chartCompProperties;

                this.xEnd = (this.mouse.xIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale;
                this.yEnd = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);

                if (this.strategyGraphic.children.indexOf(this.dragEndPoints) < 0) {
                    this.dragEndPoints = new PIXI.Sprite(this.resizePoint);
                    this.strategyGraphic.addChild(this.dragEndPoints);
                }

                this.locateDragEndPoints();
            }
        }]);

        return CircleChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = CircleChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/cross-hair-chart-strategy', ['exports', './line-study-chart-strategy', '../../../../../utils/utils', '../../utils/chart-utils', '../../utils/pixel-conversion', '../../utils/chart-core-constants', '../../utils/chart-formatters'], function (exports, _lineStudyChartStrategy, _utils, _chartUtils, _pixelConversion, _chartCoreConstants, _chartFormatters) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var CrossHairChartStrategy = function (_LineStudyChartStrate) {
        _inherits(CrossHairChartStrategy, _LineStudyChartStrate);

        function CrossHairChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, CrossHairChartStrategy);

            var _this = _possibleConstructorReturn(this, (CrossHairChartStrategy.__proto__ || Object.getPrototypeOf(CrossHairChartStrategy)).call(this, calcDataProvider, stageProp, false));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.CrossHair;
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-axis-color', 'color'));
            _this.cp.plotInfos[0].labelColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-crosshair-label-color', 'color'));
            return _this;
        }

        _createClass(CrossHairChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();
                    _chartUtils.default.removeParentChildren(this.strategyGraphic);

                    var compProp = this.cp.chartCompProperties;
                    var stageProperty = this.cp.stageProperty;
                    var hX1 = void 0,
                        hY = void 0,
                        hX2 = void 0,
                        vX = void 0,
                        vY1 = void 0,
                        vY2 = void 0;

                    hX1 = stageProperty.yAxisLeft;
                    hY = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);
                    hX2 = stageProperty.drawingWd;

                    vX = Math.round((this.mouse.xIndex - this.calcDP.beginIndex) * stageProperty.xScale);
                    vY1 = Math.round(stageProperty.yTopClearance);
                    vY2 = stageProperty.drawingHt;

                    if (this.mouse.x > 0 && this.mouse.y > 0 && this.mouse.y < vY2 && this.mouse.x < hX2) {
                        var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;

                        this.strategyGraphic.beginFill(0, 0);
                        this.strategyGraphic.addChild(_chartUtils.default.drawDashLine(hX1, hY, hX2, hY, 1, info.lineColor, 0.5));
                        this.strategyGraphic.addChild(_chartUtils.default.drawDashLine(vX, vY1, vX, vY2, 1, info.lineColor, 0.5));
                        this.strategyGraphic.endFill();

                        var txtStyle = JSON.parse(JSON.stringify(stageProperty.textStyle));

                        txtStyle.fill = 0xffffff; // Forecolor

                        // Draw time rect

                        var dataArray = this.calcDP.getDataArray();
                        var roundedXIndex = Math.round(this.mouse.xIndex);

                        if (dataArray && dataArray[roundedXIndex]) {
                            var date = dataArray[roundedXIndex].DT;
                            var xPos = void 0;

                            if (!isNaN(date)) {
                                var timeTxt = new PIXI.Text(this._createCrosshairYLabel(date), txtStyle);

                                if (vX < timeTxt.width / 2) {
                                    xPos = 0;
                                } else if (vX > hX2 - timeTxt.width / 2) {
                                    xPos = hX2 - timeTxt.width;
                                } else {
                                    xPos = vX - timeTxt.width / 2;
                                }

                                timeTxt.resolution = 2;
                                timeTxt.position.set(xPos + 2, vY2 + 5);

                                this.strategyGraphic.addChild(timeTxt);

                                this.strategyGraphic.beginFill(info.labelColor, 1);
                                this.strategyGraphic.lineStyle(0, 0, 1, 1);
                                this.strategyGraphic.drawRect(xPos, vY2 + 2, timeTxt.width + 4, timeTxt.height + 5);
                                this.strategyGraphic.endFill();
                            }
                        }

                        // Draw Price Arrow

                        if (this.mouse.y <= compProp.ht) {
                            var valTxt = new PIXI.Text(_chartFormatters.default.formatToDecimal(this.mouse.yVal, stageProperty.decimals), txtStyle);

                            valTxt.resolution = 2;
                            valTxt.position.set(hX2 + 5, hY - Math.round(stageProperty.textStyle.fontSize / 2));

                            this.strategyGraphic.addChild(valTxt);

                            this.strategyGraphic.beginFill(info.labelColor, 1);
                            this.strategyGraphic.lineStyle(0, 0, 1);
                            this.strategyGraphic.drawRect(hX2, hY - Math.round(stageProperty.textStyle.fontSize / 2) - 2, valTxt.width + 7, Math.round(stageProperty.textStyle.fontSize) + 6);
                            this.strategyGraphic.endFill();
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Crosshair lines ' + e);
                }
            }
        }, {
            key: '_createCrosshairYLabel',
            value: function _createCrosshairYLabel(date) {
                var txt = void 0;

                if (!this.calcDP.hasDailyRawData()) {
                    txt = _chartFormatters.default.convertDateTo_ddMMyyyy(date) + ' ' + _chartFormatters.default.convertDateToHHMM(date);
                } else {
                    if (this.calcDP.interval !== _chartCoreConstants.default.HistoryInterval.Monthly) {
                        txt = _chartFormatters.default.convertDateToDD(date) + ' ' + _chartFormatters.default.convertDateTo_MMMyyyy(date);
                    } else {
                        txt = _chartFormatters.default.convertDateTo_MMMyyyy(date);
                    }
                }

                return txt;
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(CrossHairChartStrategy.prototype.__proto__ || Object.getPrototypeOf(CrossHairChartStrategy.prototype), 'changeThemeProperties', this).call(this);

                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-axis-color', 'color'));
                this.cp.plotInfos[0].labelColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-crosshair-label-color', 'color'));
            }
        }]);

        return CrossHairChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = CrossHairChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/horiz-chart-strategy', ['exports', './line-study-chart-strategy', '../../../../../utils/utils', '../../utils/chart-utils', '../../utils/pixel-conversion', '../../utils/chart-core-constants'], function (exports, _lineStudyChartStrategy, _utils, _chartUtils, _pixelConversion, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var HorizChartStrategy = function (_LineStudyChartStrate) {
        _inherits(HorizChartStrategy, _LineStudyChartStrate);

        function HorizChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, HorizChartStrategy);

            var _this = _possibleConstructorReturn(this, (HorizChartStrategy.__proto__ || Object.getPrototypeOf(HorizChartStrategy)).call(this, calcDataProvider, stageProp, false));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.Horizontal;
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(HorizChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var stageProperty = this.cp.stageProperty;
                    var x1 = void 0,
                        y1 = void 0,
                        x2 = void 0,
                        y2 = void 0;

                    this.strategyGraphic.beginFill(0, 0);
                    this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                    _utils.default.logger.logInfo('Horiz Line Study conversion ' + this.mouse.yVal);

                    x1 = stageProperty.yAxisLeft;
                    y1 = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);
                    x2 = stageProperty.drawingWd;
                    y2 = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);

                    this.strategyGraphic.moveTo(x1, y1);
                    this.strategyGraphic.lineTo(x2, y2);

                    this.strategyGraphic.hitArea = new PIXI.Rectangle(x1, y1 - 5, x2, 10);

                    this.strategyGraphic.endFill();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Horizontal line ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(HorizChartStrategy.prototype.__proto__ || Object.getPrototypeOf(HorizChartStrategy.prototype), 'changeThemeProperties', this).call(this);

                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            }
        }]);

        return HorizChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = HorizChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/line-study-chart-strategy', ['exports', '../chart-strategy', '../../utils/pixel-conversion', '../../../../../utils/utils', '../../utils/chart-utils', '../../utils/chart-formatters', '../../utils/chart-core-constants'], function (exports, _chartStrategy, _pixelConversion, _utils, _chartUtils, _chartFormatters, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var LineStudyChartStrategy = function (_ChartStrategy) {
        _inherits(LineStudyChartStrategy, _ChartStrategy);

        function LineStudyChartStrategy(calcDataProvider, stageProp, isExpandable) {
            _classCallCheck(this, LineStudyChartStrategy);

            var _this = _possibleConstructorReturn(this, (LineStudyChartStrategy.__proto__ || Object.getPrototypeOf(LineStudyChartStrategy)).call(this, calcDataProvider, stageProp));

            var that = _this;
            _this.isDrawing = false;
            _this.isEnabled = true; // Without selected line study can't retrieve strategy id Hence selected line study is kept and isEnabled is introduced to implement on of feature
            _this.isExpandable = isExpandable;
            _this.removeFN = undefined;
            _this.strategyGraphic.buttonMode = true;
            _this.highlightColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color'));
            _this.resizePointLineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-resize-line-color', 'color'));
            _this.resizePointFillColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-resize-fill-color', 'color'));
            _this.toolTipMsg = undefined;
            _this.dragStartPoints = undefined;
            _this.dragEndPoints = undefined;
            _this.mouseDragging = false;
            _this.mouseDrgStart = undefined;
            _this.resizePointRadius = 8;
            _this.resizePointLineWidth = 2;
            _this.xStart = undefined;
            _this.yStart = undefined;
            _this.xEnd = undefined;
            _this.yEnd = undefined;
            _this.tooltipMsgWidth = undefined;
            _this.tooltipMsgHeight = undefined;
            _this.resizePoint = _this._createDragPoints();
            _this.px_mask_outter_bounds = new PIXI.Graphics();

            _this.strategyGraphic.on('rightdown', function () {
                if (that.removeFN && $.isFunction(that.removeFN)) {
                    that.removeFN(that.strategyId);
                }
            }).on('mouseover', function (ev) {
                try {
                    var event = ev.data.getLocalPosition(that.cp.stageProperty.stage);

                    if (that.cp.name === _chartCoreConstants.default.LineStudyTypes.CrossHair) {
                        that.strategyGraphic.cursor = 'crosshair';
                    } else {
                        that.strategyGraphic.cursor = 'move';
                    }

                    if (that.strategyGraphic.graphicsData[0]) {
                        that.strategyGraphic.graphicsData[0]['lineColor'] = _this.highlightColor;
                        that.strategyGraphic.graphicsData[0]['lineWidth'] = 2; // Increasing line width
                        that.strategyGraphic.graphicsData[0]['lineAlignment'] = 0;
                    }

                    _this.toolTipMsg = _this._createMouseOverTooltip();

                    that.strategyGraphic.addChild(that.toolTipMsg);

                    that.toolTipMsg.position.x = event.x;
                    that.toolTipMsg.position.y = event.y;

                    if (that.isExpandable) {
                        that.addDragPoints();
                    }

                    that.strategyGraphic.dirty++;
                    that.strategyGraphic.clearDirty++;
                } catch (e) {
                    _utils.default.logger.logError('Error in change mouseover color' + e);
                }
            }).on('mouseout', function () {
                try {
                    if (that.strategyGraphic.graphicsData[0]) {
                        that.strategyGraphic.graphicsData[0]['lineColor'] = that.cp.plotInfos[0].lineColor;
                        that.strategyGraphic.graphicsData[0]['lineWidth'] = 1;
                        that.strategyGraphic.graphicsData[0]['lineAlignment'] = 0;
                    }

                    that.strategyGraphic.removeChild(that.toolTipMsg);

                    if (that.dragStartPoints) {
                        that.dragStartPoints.visible = false;
                    }
                    if (that.dragEndPoints) {
                        that.dragEndPoints.visible = false;
                    }

                    that.strategyGraphic.dirty++;
                    that.strategyGraphic.clearDirty++;
                } catch (e) {
                    _utils.default.logger.logError('Error in change mouseout color' + e);
                }
            }).on('pointerdown', function (ev) {
                that._onDragStart(ev);
            }).on('pointerup', function () {
                that._onDragEnd();
            }).on('pointerupoutside', function () {
                that._onDragEnd();
            }).on('pointermove', function (ev) {
                that._onDragMove(ev);
            });

            _this.mouse = {
                x: 0,
                y: 0,
                startX: 0,
                startY: 0,
                xIndex: 0,
                xStartIndex: 0,
                yVal: 0,
                yStartVal: 0
            };

            _this.symbolInfoTextStyle = JSON.parse(JSON.stringify(_this.cp.stageProperty.textStyle));
            _this.symbolInfoTextStyle.fill = 0x333333;
            _this.symbolInfoTextStyle.fontSize = 12;
            _this.symbolInfoTextStyle.padding = 5;

            _this.deleteTxtStyle = JSON.parse(JSON.stringify(_this.cp.stageProperty.textStyle));
            _this.deleteTxtStyle.fill = 0x333333;
            return _this;
        }

        _createClass(LineStudyChartStrategy, [{
            key: 'setPositionDetails',
            value: function setPositionDetails() {
                this.mouse.xIndex = _pixelConversion.default.getIndexForThePixel(this.mouse.x, this.cp.chartCompProperties, this.cp.stageProperty, this.calcDP);
                this.mouse.xStartIndex = _pixelConversion.default.getIndexForThePixel(this.mouse.startX, this.cp.chartCompProperties, this.cp.stageProperty, this.calcDP);
                this.mouse.yVal = _pixelConversion.default.getYValueFromPX(this.mouse.y, this.cp.chartCompProperties);
                this.mouse.yStartVal = _pixelConversion.default.getYValueFromPX(this.mouse.startY, this.cp.chartCompProperties);
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                this.highlightColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color'));
                this.resizePointLineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-resize-line-color', 'color'));
                this.resizePointFillColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-resize-fill-color', 'color'));
            }
        }, {
            key: 'addDrawingClip',
            value: function addDrawingClip() {
                if (this.isExpandable) {
                    var compProp = this.cp.chartCompProperties;
                    var index = this.strategyGraphic.parent.children.indexOf(this.px_mask_outter_bounds);

                    if (index === -1) {
                        this.strategyGraphic.parent.addChild(this.px_mask_outter_bounds);
                    }

                    this.px_mask_outter_bounds.beginFill(0, 0);
                    this.px_mask_outter_bounds.lineStyle(0, 0, 1);
                    this.px_mask_outter_bounds.drawRect(compProp.x, compProp.y, this.cp.stageProperty.jCanvas[0].width, compProp.ht);
                    this.px_mask_outter_bounds.endFill();

                    this.strategyGraphic.mask = this.px_mask_outter_bounds;
                }
            }
        }, {
            key: '_createMouseOverTooltip',
            value: function _createMouseOverTooltip() {
                var graphic = new PIXI.Graphics();
                var deleteText = new PIXI.Text(this.cp.stageProperty.langObj.lang.labels.chartLabels.rgtClickDel, this.deleteTxtStyle);

                this.tooltipMsgWidth = deleteText.width;
                this.tooltipMsgHeight = deleteText.height;

                if (this.isExpandable) {
                    var symbolInfoText = new PIXI.Text(this._getSymbolInfo(), this.symbolInfoTextStyle);

                    symbolInfoText.anchor.set(0, 0);
                    deleteText.anchor.set(0, -2);

                    graphic.addChild(deleteText, symbolInfoText);

                    this.tooltipMsgWidth = Math.max(deleteText.width, symbolInfoText.width);
                    this.tooltipMsgHeight = deleteText.height + symbolInfoText.height + 5;
                } else {
                    graphic.addChild(deleteText);
                }

                graphic.lineStyle(5, 0xe1e3e8, 1, 0);
                graphic.beginFill(0xe1e3e8, 1);
                graphic.drawRoundedRect(0, 0, this.tooltipMsgWidth, this.tooltipMsgHeight, 1);
                graphic.endFill();

                return new PIXI.Sprite(this.cp.stageProperty.renderer.generateTexture(graphic));
            }
        }, {
            key: '_onDragStart',
            value: function _onDragStart(event) {
                // store a reference to the data
                // the reason for this is because of multitouch
                // we want to track the movement of this particular touch
                this.mouseDrgStart = event.data.getLocalPosition(this.cp.stageProperty.stage);
                // this.strategyGraphic.alpha = 0.5;
                this.mouseDragging = true;
            }
        }, {
            key: '_onDragEnd',
            value: function _onDragEnd() {
                // this.strategyGraphic.alpha = 1;
                this.mouseDragging = false;
                // set the interaction data to null
                this.mouseDrgStart = null;
            }
        }, {
            key: '_onDragMove',
            value: function _onDragMove(ev) {
                if (this.mouseDragging) {
                    var mouseEnd = ev.data.getLocalPosition(this.cp.stageProperty.stage);
                    var xAdj = mouseEnd.x - this.mouseDrgStart.x;
                    var yAdj = mouseEnd.y - this.mouseDrgStart.y;

                    if (this.dragStartPoints) {
                        this.dragStartPoints.visible = false;
                    }

                    if (this.dragEndPoints) {
                        this.dragEndPoints.visible = false;
                    }

                    // utils.logger.logInfo('[Drag] parent move x adj - ' + xAdj + ', y adj - ' + yAdj);

                    if (this.mouse.startX <= this.mouse.x) {
                        if (this.dragStartPoints && this.mouseDrgStart.x <= this.mouse.startX + this.resizePointRadius && this.mouseDrgStart.y <= this.mouse.startY + this.resizePointRadius) {
                            this.mouse.startX += xAdj;
                            this.mouse.startY += yAdj;
                        } else if (this.dragEndPoints && this.mouseDrgStart.x >= this.mouse.x - this.resizePointRadius && this.mouseDrgStart.y >= this.mouse.y - this.resizePointRadius) {
                            this.mouse.x += xAdj;
                            this.mouse.y += yAdj;
                        } else {
                            this.mouse.x += xAdj;
                            this.mouse.y += yAdj;
                            this.mouse.startX += xAdj;
                            this.mouse.startY += yAdj;
                        }
                    } else if (this.mouse.startX >= this.mouse.x) {
                        if (this.dragStartPoints && this.mouseDrgStart.x >= this.mouse.startX - this.resizePointRadius && this.mouseDrgStart.y >= this.mouse.startY - this.resizePointRadius) {
                            this.mouse.startX += xAdj;
                            this.mouse.startY += yAdj;
                        } else if (this.dragEndPoints && this.mouseDrgStart.x <= this.mouse.x + this.resizePointRadius && this.mouseDrgStart.y <= this.mouse.y + this.resizePointRadius) {
                            this.mouse.x += xAdj;
                            this.mouse.y += yAdj;
                        } else {
                            this.mouse.x += xAdj;
                            this.mouse.y += yAdj;
                            this.mouse.startX += xAdj;
                            this.mouse.startY += yAdj;
                        }
                    }

                    this.mouseDrgStart = mouseEnd;
                    this.setPositionDetails();
                    this.drawChart();
                }
            }
        }, {
            key: '_createDragPoints',
            value: function _createDragPoints() {
                var graphic = new PIXI.Graphics();

                graphic.lineStyle(this.resizePointLineWidth, this.resizePointLineColor, 1, 0);
                graphic.beginFill(this.resizePointFillColor, 1);
                graphic.drawCircle(0, 0, this.resizePointRadius);
                graphic.endFill();
                return this.cp.stageProperty.renderer.generateTexture(graphic);
            }
        }, {
            key: 'addDragPoints',
            value: function addDragPoints() {
                var compProp = this.cp.chartCompProperties;

                this.xStart = (this.mouse.xStartIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale;
                this.yStart = _pixelConversion.default.getPixelForTheYValue(this.mouse.yStartVal, compProp);
                this.xEnd = (this.mouse.xIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale;
                this.yEnd = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);

                if (this.strategyGraphic.children.indexOf(this.dragStartPoints) < 0) {
                    this.dragStartPoints = new PIXI.Sprite(this.resizePoint);
                    this.strategyGraphic.addChild(this.dragStartPoints);
                }

                if (this.strategyGraphic.children.indexOf(this.dragEndPoints) < 0) {
                    this.dragEndPoints = new PIXI.Sprite(this.resizePoint);
                    this.strategyGraphic.addChild(this.dragEndPoints);
                }

                this._locateDragStartPoints();
                this.locateDragEndPoints();
            }
        }, {
            key: '_locateDragStartPoints',
            value: function _locateDragStartPoints() {
                if (this.dragStartPoints) {
                    this.dragStartPoints.visible = true;
                    this.dragStartPoints.position.x = this.xStart - this.resizePointRadius;
                    this.dragStartPoints.position.y = this.yStart - this.resizePointRadius;
                }
            }
        }, {
            key: 'locateDragEndPoints',
            value: function locateDragEndPoints() {
                if (this.dragEndPoints) {
                    this.dragEndPoints.visible = true;
                    this.dragEndPoints.position.x = this.xEnd - this.resizePointRadius;
                    this.dragEndPoints.position.y = this.yEnd - this.resizePointRadius;
                }
            }
        }, {
            key: '_getSymbolInfo',
            value: function _getSymbolInfo() {
                var change = _chartFormatters.default.formatToDecimal(this.mouse.yVal - this.mouse.yStartVal, 2);
                var changePercentage = _chartFormatters.default.formatToDecimal((this.mouse.yVal - this.mouse.yStartVal) / this.mouse.yStartVal, 2);
                var barCount = Math.round(Math.abs(this.mouse.xIndex - this.mouse.xStartIndex + 1));

                return change + ' (' + changePercentage + '%) ' + barCount + (barCount > 1 ? ' ' + this.cp.stageProperty.langObj.lang.labels.chartBars : ' ' + this.cp.stageProperty.langObj.lang.labels.chartBar);
            }
        }]);

        return LineStudyChartStrategy;
    }(_chartStrategy.default);

    exports.default = LineStudyChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/line-study-factory', ['exports', '../../utils/chart-core-constants', './rect-chart-strategy', './vert-chart-strategy', './horiz-chart-strategy', './circle-chart-strategy', './trend-chart-strategy', './cross-hair-chart-strategy', './static-strategies/price-line-chart-strategy'], function (exports, _chartCoreConstants, _rectChartStrategy, _vertChartStrategy, _horizChartStrategy, _circleChartStrategy, _trendChartStrategy, _crossHairChartStrategy, _priceLineChartStrategy) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var LineStudyFactory = function () {
        function LineStudyFactory() {
            _classCallCheck(this, LineStudyFactory);
        }

        _createClass(LineStudyFactory, null, [{
            key: 'getLineStudy',
            value: function getLineStudy(studyType, calcDP, stageProp) {
                switch (studyType) {
                    case _chartCoreConstants.default.LineStudyTypes.Rectangle:
                        return new _rectChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.Vertical:
                        return new _vertChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.Horizontal:
                        return new _horizChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.Ellipse:
                        return new _circleChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.Trend:
                        return new _trendChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.CrossHair:
                        return new _crossHairChartStrategy.default(calcDP, stageProp);
                    case _chartCoreConstants.default.LineStudyTypes.LastValue:
                        return new _priceLineChartStrategy.default(calcDP, stageProp); // Todo: [Ravindu] Price tag can be changed here
                    default:
                }
            }
        }]);

        return LineStudyFactory;
    }();

    exports.default = LineStudyFactory;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/rect-chart-strategy', ['exports', '../../../../../utils/utils', './line-study-chart-strategy', '../../utils/pixel-conversion', '../../utils/chart-core-constants'], function (exports, _utils, _lineStudyChartStrategy, _pixelConversion, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var RectChartStrategy = function (_LineStudyChartStrate) {
        _inherits(RectChartStrategy, _LineStudyChartStrate);

        function RectChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, RectChartStrategy);

            var _this = _possibleConstructorReturn(this, (RectChartStrategy.__proto__ || Object.getPrototypeOf(RectChartStrategy)).call(this, calcDataProvider, stageProp, true));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.Rectangle;
            return _this;
        }

        _createClass(RectChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var wd = void 0,
                        ht = void 0,
                        xIndex = void 0,
                        yVal = void 0,
                        x = void 0,
                        y = void 0;

                    this.strategyGraphic.beginFill(info.lineColor, 0.5);
                    this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                    _utils.default.logger.logInfo('Rect Line Study beginIndex ' + this.calcDP.beginIndex);
                    _utils.default.logger.logInfo('Rect Line Study conversion ' + this.mouse.xIndex + ',' + this.mouse.xStartIndex + ',' + this.mouse.yVal + ',' + this.mouse.yStartVal);

                    wd = Math.round(Math.abs(this.mouse.xIndex - this.mouse.xStartIndex) * this.cp.stageProperty.xScale);
                    ht = Math.round(Math.abs(this.mouse.yVal - this.mouse.yStartVal) * compProp.yFact);
                    xIndex = this.mouse.x - this.mouse.startX < 0 ? this.mouse.xIndex : this.mouse.xStartIndex;
                    yVal = this.mouse.y - this.mouse.startY < 0 ? this.mouse.yVal : this.mouse.yStartVal;

                    x = Math.round((xIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale);
                    y = _pixelConversion.default.getPixelForTheYValue(yVal, compProp);

                    _utils.default.logger.logInfo('Rect Line Study drawing ' + x + ',' + y + ',' + wd + ',' + ht);

                    this.strategyGraphic.drawRect(x, y, wd, ht);
                    this.strategyGraphic.hitArea = new PIXI.Rectangle(x, y, wd, ht);

                    this.strategyGraphic.endFill();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Rectangle ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(RectChartStrategy.prototype.__proto__ || Object.getPrototypeOf(RectChartStrategy.prototype), 'changeThemeProperties', this).call(this);
            }
        }]);

        return RectChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = RectChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/static-strategies/price-line-chart-strategy', ['exports', '../line-study-chart-strategy', '../../../../../../utils/utils', '../../../utils/chart-utils', '../../../utils/pixel-conversion', '../../../utils/chart-core-constants', '../../../utils/chart-formatters'], function (exports, _lineStudyChartStrategy, _utils, _chartUtils, _pixelConversion, _chartCoreConstants, _chartFormatters) {
                'use strict';

                function _classCallCheck(instance, Constructor) {
                                if (!(instance instanceof Constructor)) {
                                                throw new TypeError("Cannot call a class as a function");
                                }
                }

                var _createClass = function () {
                                function defineProperties(target, props) {
                                                for (var i = 0; i < props.length; i++) {
                                                                var descriptor = props[i];
                                                                descriptor.enumerable = descriptor.enumerable || false;
                                                                descriptor.configurable = true;
                                                                if ("value" in descriptor) descriptor.writable = true;
                                                                Object.defineProperty(target, descriptor.key, descriptor);
                                                }
                                }

                                return function (Constructor, protoProps, staticProps) {
                                                if (protoProps) defineProperties(Constructor.prototype, protoProps);
                                                if (staticProps) defineProperties(Constructor, staticProps);
                                                return Constructor;
                                };
                }();

                function _possibleConstructorReturn(self, call) {
                                if (!self) {
                                                throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                                }

                                return call && (typeof call === "object" || typeof call === "function") ? call : self;
                }

                var _get = function get(object, property, receiver) {
                                if (object === null) object = Function.prototype;
                                var desc = Object.getOwnPropertyDescriptor(object, property);

                                if (desc === undefined) {
                                                var parent = Object.getPrototypeOf(object);

                                                if (parent === null) {
                                                                return undefined;
                                                } else {
                                                                return get(parent, property, receiver);
                                                }
                                } else if ("value" in desc) {
                                                return desc.value;
                                } else {
                                                var getter = desc.get;

                                                if (getter === undefined) {
                                                                return undefined;
                                                }

                                                return getter.call(receiver);
                                }
                };

                function _inherits(subClass, superClass) {
                                if (typeof superClass !== "function" && superClass !== null) {
                                                throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                                }

                                subClass.prototype = Object.create(superClass && superClass.prototype, {
                                                constructor: {
                                                                value: subClass,
                                                                enumerable: false,
                                                                writable: true,
                                                                configurable: true
                                                }
                                });
                                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
                }

                var PriceLineChartStrategy = function (_LineStudyChartStrate) {
                                _inherits(PriceLineChartStrategy, _LineStudyChartStrate);

                                function PriceLineChartStrategy(calcDataProvider, stageProp) {
                                                _classCallCheck(this, PriceLineChartStrategy);

                                                var _this = _possibleConstructorReturn(this, (PriceLineChartStrategy.__proto__ || Object.getPrototypeOf(PriceLineChartStrategy)).call(this, calcDataProvider, stageProp, false));

                                                _this.strategyGraphic.interactive = false;
                                                _this.cp.name = _chartCoreConstants.default.LineStudyTypes.LastValue;
                                                _this.cp.plotInfos[0].upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-5-color', 'color'));
                                                _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
                                                return _this;
                                }

                                _createClass(PriceLineChartStrategy, [{
                                                key: 'drawGraphics',
                                                value: function drawGraphics(plotInfo) {
                                                                try {
                                                                                this.strategyGraphic.clear();
                                                                                // ChartUtils.removeParentChildren(this.strategyGraphic);

                                                                                var compProp = this.cp.chartCompProperties;
                                                                                var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                                                                                var stageProperty = this.cp.stageProperty;
                                                                                var x = void 0,
                                                                                    y = void 0,
                                                                                    price = void 0,
                                                                                    dashedLineSpri = void 0;
                                                                                var lastNotNull = _chartUtils.default.lastNotNullVal(this.calcDP.dataSource, _chartCoreConstants.default.OHLCFields.Close);

                                                                                if (lastNotNull) {
                                                                                                price = _chartFormatters.default.formatToDecimal(lastNotNull[info.propertyKey], 2);
                                                                                                y = _pixelConversion.default.getPixelForTheYValue(price, compProp);
                                                                                                x = stageProperty.drawingWd;

                                                                                                // Draw Line

                                                                                                /*  this.strategyGraphic.beginFill(0, 0);
                                                                                                    this.strategyGraphic.lineStyle(stageProperty.isMobile ? 0.5 : 1, info.lineColor, stageProperty.isMobile ? 0.4 : 1, 0);
                                                                                                  this.strategyGraphic.moveTo(stageProperty.yAxisLeft, y);
                                                                                                  this.strategyGraphic.lineTo(x, y);
                                                                                                    this.strategyGraphic.endFill();*/

                                                                                                dashedLineSpri = _chartUtils.default.drawDashLine(stageProperty.yAxisLeft, y, x, y, 1, info.lineColor); // 1 px is used as a dash width
                                                                                                this.strategyGraphic.addChild(dashedLineSpri);

                                                                                                /* PIXI.ticker.shared.add(function (delta) {
                                                                                                    dashedLineSpri.tilePosition.x += 0.5 * delta;
                                                                                                });*/

                                                                                                // Draw Price Arrow

                                                                                                var txtStyle = JSON.parse(JSON.stringify(stageProperty.textStyle));
                                                                                                txtStyle.fill = 0xffffff;

                                                                                                var valTxt = new PIXI.Text(price, txtStyle);

                                                                                                valTxt.resolution = 2;
                                                                                                valTxt.position.set(x + 5, y - Math.round(stageProperty.textStyle.fontSize / 2)); // 1 px is used to center price value

                                                                                                this.strategyGraphic.addChild(valTxt);

                                                                                                this.strategyGraphic.beginFill(info.upColor, 1);
                                                                                                this.strategyGraphic.lineStyle(0, 0, 1);
                                                                                                this.strategyGraphic.drawRect(x, y - Math.round(stageProperty.textStyle.fontSize / 2) - 2, valTxt.width + 7, Math.round(stageProperty.textStyle.fontSize) + 6);
                                                                                                this.strategyGraphic.endFill();
                                                                                }
                                                                } catch (e) {
                                                                                _utils.default.logger.logError('[pro Chart] Drawing Price Line line ' + e);
                                                                }
                                                }
                                }, {
                                                key: 'changeThemeProperties',
                                                value: function changeThemeProperties() {
                                                                _get(PriceLineChartStrategy.prototype.__proto__ || Object.getPrototypeOf(PriceLineChartStrategy.prototype), 'changeThemeProperties', this).call(this);

                                                                this.cp.plotInfos[0].upColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-5-color', 'color'));
                                                                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
                                                }
                                }]);

                                return PriceLineChartStrategy;
                }(_lineStudyChartStrategy.default);

                exports.default = PriceLineChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/trend-chart-strategy', ['exports', './line-study-chart-strategy', '../../../../../utils/utils', '../../utils/pixel-conversion', '../../utils/chart-utils', '../../utils/chart-core-constants'], function (exports, _lineStudyChartStrategy, _utils, _pixelConversion, _chartUtils, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var TrendChartStrategy = function (_LineStudyChartStrate) {
        _inherits(TrendChartStrategy, _LineStudyChartStrate);

        function TrendChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, TrendChartStrategy);

            var _this = _possibleConstructorReturn(this, (TrendChartStrategy.__proto__ || Object.getPrototypeOf(TrendChartStrategy)).call(this, calcDataProvider, stageProp, true));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.Trend;
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(TrendChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var x1 = void 0,
                        y1 = void 0,
                        x2 = void 0,
                        y2 = void 0;
                    var hitPoints = [];

                    this.strategyGraphic.beginFill(0, 0);
                    this.strategyGraphic.lineStyle(1.5, info.lineColor, 1, 0);

                    _utils.default.logger.logInfo('Trend Line Study beginIndex ' + this.calcDP.beginIndex);
                    _utils.default.logger.logInfo('Trend Line Study conversion ' + this.mouse.xIndex + ',' + this.mouse.xStartIndex + ',' + this.mouse.yVal + ',' + this.mouse.yStartVal);

                    x1 = Math.round((this.mouse.xStartIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale);
                    y1 = _pixelConversion.default.getPixelForTheYValue(this.mouse.yStartVal, compProp);
                    x2 = Math.round((this.mouse.xIndex - this.calcDP.beginIndex) * this.cp.stageProperty.xScale);
                    y2 = _pixelConversion.default.getPixelForTheYValue(this.mouse.yVal, compProp);

                    this.strategyGraphic.moveTo(x1, y1);
                    this.strategyGraphic.lineTo(x2, y2);

                    hitPoints.push(new PIXI.Point(x1, y1 + 5));
                    hitPoints.push(new PIXI.Point(x2, y2 + 5));
                    hitPoints.push(new PIXI.Point(x2, y2 - 5));
                    hitPoints.push(new PIXI.Point(x1, y1 - 5));
                    hitPoints.push(new PIXI.Point(x1, y1 + 5));

                    this.strategyGraphic.hitArea = new PIXI.Polygon(hitPoints);

                    this.strategyGraphic.endFill();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Trend Lin' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(TrendChartStrategy.prototype.__proto__ || Object.getPrototypeOf(TrendChartStrategy.prototype), 'changeThemeProperties', this).call(this);

                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            }
        }]);

        return TrendChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = TrendChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/line-study-strategy/vert-chart-strategy', ['exports', '../../../../../utils/utils', './line-study-chart-strategy', '../../utils/chart-utils', '../../utils/chart-core-constants'], function (exports, _utils, _lineStudyChartStrategy, _chartUtils, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    var _get = function get(object, property, receiver) {
        if (object === null) object = Function.prototype;
        var desc = Object.getOwnPropertyDescriptor(object, property);

        if (desc === undefined) {
            var parent = Object.getPrototypeOf(object);

            if (parent === null) {
                return undefined;
            } else {
                return get(parent, property, receiver);
            }
        } else if ("value" in desc) {
            return desc.value;
        } else {
            var getter = desc.get;

            if (getter === undefined) {
                return undefined;
            }

            return getter.call(receiver);
        }
    };

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var VertChartStrategy = function (_LineStudyChartStrate) {
        _inherits(VertChartStrategy, _LineStudyChartStrate);

        function VertChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, VertChartStrategy);

            var _this = _possibleConstructorReturn(this, (VertChartStrategy.__proto__ || Object.getPrototypeOf(VertChartStrategy)).call(this, calcDataProvider, stageProp, false));

            _this.cp.name = _chartCoreConstants.default.LineStudyTypes.Vertical;
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(VertChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var stageProperty = this.cp.stageProperty;
                    var x1 = void 0,
                        y1 = void 0,
                        x2 = void 0,
                        y2 = void 0;

                    this.strategyGraphic.beginFill(0, 0);
                    this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                    _utils.default.logger.logInfo('Vert Line Study begin Index ' + this.calcDP.beginIndex);
                    _utils.default.logger.logInfo('Vert Line Study conversion ' + this.mouse.xIndex);

                    x1 = Math.round((this.mouse.xIndex - this.calcDP.beginIndex) * stageProperty.xScale);
                    y1 = Math.round(stageProperty.yTopClearance);
                    x2 = Math.round((this.mouse.xIndex - this.calcDP.beginIndex) * stageProperty.xScale);
                    y2 = stageProperty.drawingHt;

                    this.strategyGraphic.moveTo(x1, y1);
                    this.strategyGraphic.lineTo(x2, y2);

                    this.strategyGraphic.hitArea = new PIXI.Rectangle(x1 - 5, y1, 10, y2);

                    this.strategyGraphic.endFill();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Drawing Vetical line ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                _get(VertChartStrategy.prototype.__proto__ || Object.getPrototypeOf(VertChartStrategy.prototype), 'changeThemeProperties', this).call(this);

                this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            }
        }]);

        return VertChartStrategy;
    }(_lineStudyChartStrategy.default);

    exports.default = VertChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/ohlc-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var OHLCChartStrategy = function (_ChartStrategy) {
        _inherits(OHLCChartStrategy, _ChartStrategy);

        function OHLCChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, OHLCChartStrategy);

            var _this = _possibleConstructorReturn(this, (OHLCChartStrategy.__proto__ || Object.getPrototypeOf(OHLCChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.isUsedHighLow = true;
            _this.isUsedSameColor = false;
            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(OHLCChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        this.strategyGraphic.beginFill(0, 0);
                        this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                        try {
                            var isCandleTrendUp = true; // To show correct trend of first point, need to compare with previous point of first point. Hence this trend should be calculated in ohlc-data-store and send with ohlc-series when data buld data receiving.
                            var prevY = isCandleTrendUp ? Number.MAX_VALUE : Number.MIN_VALUE;
                            var oPx = 0,
                                cPx = 0,
                                hPx = 0,
                                lPx = 0,
                                c = void 0,
                                color = void 0,
                                xPos = void 0;
                            var lastPointY = Math.round(compProp.y + compProp.ht);

                            // Todo: [Ravindu] Calculation should do with selected ohlc type

                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                oPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Open, compProp);
                                cPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Close, compProp);
                                hPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].High, compProp);
                                lPx = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i].Low, compProp);

                                c = this.calcDP.getDataArray()[i].Close;
                                xPos = Math.round(compProp.x + i * this.cp.stageProperty.xScale);

                                if (oPx !== 0 && oPx <= lastPointY && hPx !== 0 && hPx <= lastPointY && lPx !== 0 && lPx <= lastPointY && cPx !== 0 && cPx <= lastPointY) {
                                    if (!this.isUsedSameColor) {
                                        color = c >= prevY ? info.upColor : info.downColor;
                                        this.strategyGraphic.lineStyle(1, color, 1, 0);
                                    }

                                    this.strategyGraphic.moveTo(xPos, hPx); // Body
                                    this.strategyGraphic.lineTo(xPos, lPx);

                                    this.strategyGraphic.moveTo(xPos, cPx); // Left
                                    this.strategyGraphic.lineTo(xPos + this.cp.stageProperty.dashLength, cPx);

                                    this.strategyGraphic.moveTo(xPos - this.cp.stageProperty.dashLength, oPx); // Left
                                    this.strategyGraphic.lineTo(xPos, oPx);

                                    prevY = c;
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making ohlc chart ' + x);
                        }

                        this.strategyGraphic.endFill();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot ohlc chart ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                this.cp.plotInfos[0].lineColor = this.randomColorIndex === -1 ? _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')) : this.cp.stageProperty.getComparisonColorArray()[this.randomColorIndex];
            }
        }]);

        return OHLCChartStrategy;
    }(_chartStrategy.default);

    exports.default = OHLCChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/point-chart-strategy', ['exports', './chart-strategy', '../../../../utils/utils', '../utils/pixel-conversion', '../utils/chart-utils'], function (exports, _chartStrategy, _utils, _pixelConversion, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var PointChartStrategy = function (_ChartStrategy) {
        _inherits(PointChartStrategy, _ChartStrategy);

        function PointChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, PointChartStrategy);

            var _this = _possibleConstructorReturn(this, (PointChartStrategy.__proto__ || Object.getPrototypeOf(PointChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.plotInfos[0].lineColor = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color'));
            return _this;
        }

        _createClass(PointChartStrategy, [{
            key: 'drawGraphics',
            value: function drawGraphics(plotInfo) {
                try {
                    this.strategyGraphic.clear();

                    var compProp = this.cp.chartCompProperties;
                    var info = !plotInfo ? this.cp.plotInfos[0] : plotInfo;
                    var px = void 0,
                        xPos = void 0;
                    var lastPointY = Math.round(compProp.y + compProp.ht);

                    if (this.calcDP.getDataArray() && this.calcDP.getDataArray().length > 0) {
                        this.strategyGraphic.lineStyle(1, info.lineColor, 1, 0);

                        try {
                            for (var i = 0; i < this.calcDP.getDataArray().length; i++) {
                                px = _pixelConversion.default.getPixelForTheYValue(this.calcDP.getDataArray()[i][info.propertyKey], compProp);

                                if (px !== 0 && px <= lastPointY) {
                                    xPos = compProp.x + i * this.cp.stageProperty.xScale;
                                    this.strategyGraphic.drawEllipse(xPos, px, 2, 1);
                                }
                            }
                        } catch (x) {
                            _utils.default.logger.logError('Error -> Making point chart ' + x);
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Plot Point Chart ' + e);
                }
            }
        }, {
            key: 'changeThemeProperties',
            value: function changeThemeProperties() {
                this.cp.plotInfos[0].lineColor = this.randomColorIndex === -1 ? _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')) : this.cp.stageProperty.getComparisonColorArray()[this.randomColorIndex];
            }
        }]);

        return PointChartStrategy;
    }(_chartStrategy.default);

    exports.default = PointChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/acc-dis-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var AccDisChartStrategy = function (_ChartStrategy) {
                _inherits(AccDisChartStrategy, _ChartStrategy);

                function AccDisChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, AccDisChartStrategy);

                        var _this = _possibleConstructorReturn(this, (AccDisChartStrategy.__proto__ || Object.getPrototypeOf(AccDisChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.AccumulationDistribution.ChartIndID;
                        _this.cp.name = 'chartIndiAcDe';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                useVolume: false
                        };

                        var innerPlot = {
                                langKey: 'accDistri',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var adxPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        adxPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = adxPlot0;
                        _this.strategyGraphic.addChild(adxPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return AccDisChartStrategy;
        }(_chartStrategy.default);

        exports.default = AccDisChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/adx-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var ADXChartStrategy = function (_ChartStrategy) {
        _inherits(ADXChartStrategy, _ChartStrategy);

        function ADXChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, ADXChartStrategy);

            var _this = _possibleConstructorReturn(this, (ADXChartStrategy.__proto__ || Object.getPrototypeOf(ADXChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.studyKey = _chartStudies.default.Indicators.DirectionalMovementADX.ChartIndID;
            _this.cp.name = 'chartIndiDMA';
            _this.cp.overlay = false;
            _this.cp.isOpenDialog = true;

            _this.cp.inputs = {
                period: 14,
                field: 'Close',
                series: true,
                /* shading: false,*/
                histogram: false
            };

            _this.cp.plotInfos = []; // To remove default plotInfo

            _this.createPlot({
                key: 'ADX',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'directADX',
                    lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                }]
            });

            _this.createPlot({
                key: 'Histo',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Histogram.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'IncBar',
                    upColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'))
                }, {
                    langKey: 'DecBar',
                    downColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'))
                }]
            });

            // Not for display, Plus DI and Minus DI values are beyond ADX values min max values.
            // Hence Plus DI and Minus DI to be included in to min max calculation, added in here

            _this.createPlot({ key: 'Plus-DI' });
            _this.createPlot({ key: 'Minus-DI' });
            return _this;
        }

        return ADXChartStrategy;
    }(_chartStrategy.default);

    exports.default = ADXChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/adxr-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var ADXRChartStrategy = function (_ChartStrategy) {
                _inherits(ADXRChartStrategy, _ChartStrategy);

                function ADXRChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, ADXRChartStrategy);

                        var _this = _possibleConstructorReturn(this, (ADXRChartStrategy.__proto__ || Object.getPrototypeOf(ADXRChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.DirectionalMovementADXR.ChartIndID;
                        _this.cp.name = 'chartIndiDMADXR';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'directADXR',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-5-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var adxrPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        adxrPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = adxrPlot0;
                        _this.strategyGraphic.addChild(adxrPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return ADXRChartStrategy;
        }(_chartStrategy.default);

        exports.default = ADXRChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/atr-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var ATRChartStrategy = function (_ChartStrategy) {
                _inherits(ATRChartStrategy, _ChartStrategy);

                function ATRChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, ATRChartStrategy);

                        var _this = _possibleConstructorReturn(this, (ATRChartStrategy.__proto__ || Object.getPrototypeOf(ATRChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.AverageTrueRange.ChartIndID;
                        _this.cp.name = 'chartIndiATR';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'avgTrueRange',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var atrPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        atrPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = atrPlot0;
                        _this.strategyGraphic.addChild(atrPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return ATRChartStrategy;
        }(_chartStrategy.default);

        exports.default = ATRChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/bb-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-core-constants', '../../utils/chart-studies', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartCoreConstants, _chartStudies, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var BBChartStrategy = function (_ChartStrategy) {
                _inherits(BBChartStrategy, _ChartStrategy);

                function BBChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, BBChartStrategy);

                        var _this = _possibleConstructorReturn(this, (BBChartStrategy.__proto__ || Object.getPrototypeOf(BBChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.BollingerBands.ChartIndID;
                        _this.cp.name = 'chartIndiBB';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 20,
                                field: 'Close',
                                stndDev: 2,
                                maType: 'simple',
                                channelFill: true
                        };

                        // Todo: [Ravindu] Load defined studies with their properties from json enum

                        _this.cp.plotInfos = [];

                        _this.createPlot({
                                key: 'Top',
                                index: 0,
                                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                                innerPlots: [{
                                        langKey: 'Top',
                                        lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-bb-top-color', 'color'))
                                }]
                        }); // Top Band

                        _this.createPlot({
                                key: 'Median',
                                index: 1,
                                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                                innerPlots: [{
                                        langKey: 'Median',
                                        lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-bb-median-color', 'color'))
                                }]
                        }); // Median Band

                        _this.createPlot({
                                key: 'Bottom',
                                index: 2,
                                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                                innerPlots: [{
                                        langKey: 'Bottom',
                                        lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-bb-down-color', 'color'))
                                }]
                        }); // Bottom Band
                        return _this;
                }

                return BBChartStrategy;
        }(_chartStrategy.default);

        exports.default = BBChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/cci-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var CCIChartStrategy = function (_ChartStrategy) {
                _inherits(CCIChartStrategy, _ChartStrategy);

                function CCIChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, CCIChartStrategy);

                        var _this = _possibleConstructorReturn(this, (CCIChartStrategy.__proto__ || Object.getPrototypeOf(CCIChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.CommodityChannelIndex.ChartIndID;
                        _this.cp.name = 'chartIndiCCI';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 20
                        };

                        var innerPlot = {
                                langKey: 'CCI',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-macd-macd-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var cciPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);
                        cciPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = cciPlot;
                        _this.strategyGraphic.addChild(cciPlot.strategyGraphic);
                        return _this;
                }

                return CCIChartStrategy;
        }(_chartStrategy.default);

        exports.default = CCIChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/chaikin-mf-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var ChaikinMFChartStrategy = function (_ChartStrategy) {
                _inherits(ChaikinMFChartStrategy, _ChartStrategy);

                function ChaikinMFChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, ChaikinMFChartStrategy);

                        var _this = _possibleConstructorReturn(this, (ChaikinMFChartStrategy.__proto__ || Object.getPrototypeOf(ChaikinMFChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.ChaikinMF.ChartIndID;
                        _this.cp.name = 'chartIndChaikinMF';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 20
                        };

                        var innerPlot = {
                                langKey: 'chaikinMF',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-3-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var pPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        pPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = pPlot0;
                        _this.strategyGraphic.addChild(pPlot0.strategyGraphic);
                        return _this;
                }

                // changeThemeProperties() {
                //     this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-3-color', 'color'));
                // }


                return ChaikinMFChartStrategy;
        }(_chartStrategy.default);

        exports.default = ChaikinMFChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/cmo-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var CMOChartStrategy = function (_ChartStrategy) {
                _inherits(CMOChartStrategy, _ChartStrategy);

                function CMOChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, CMOChartStrategy);

                        var _this = _possibleConstructorReturn(this, (CMOChartStrategy.__proto__ || Object.getPrototypeOf(CMOChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.ChandeMomentumOscillator.ChartIndID;
                        _this.cp.name = 'chartIndiCMO';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 9
                        };

                        var innerPlot = {
                                langKey: 'CMO',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var cmoPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        cmoPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = cmoPlot;
                        _this.strategyGraphic.addChild(cmoPlot.strategyGraphic);
                        return _this;
                }

                return CMOChartStrategy;
        }(_chartStrategy.default);

        exports.default = CMOChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/dx-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var DXChartStrategy = function (_ChartStrategy) {
                _inherits(DXChartStrategy, _ChartStrategy);

                function DXChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, DXChartStrategy);

                        var _this = _possibleConstructorReturn(this, (DXChartStrategy.__proto__ || Object.getPrototypeOf(DXChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.DirectionalMovementDX.ChartIndID;
                        _this.cp.name = 'chartIndiDMDX';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'directDX',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var dxPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        dxPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = dxPlot0;
                        _this.strategyGraphic.addChild(dxPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return DXChartStrategy;
        }(_chartStrategy.default);

        exports.default = DXChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/ma-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var MAChartStrategy = function (_ChartStrategy) {
                _inherits(MAChartStrategy, _ChartStrategy);

                function MAChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, MAChartStrategy);

                        var _this = _possibleConstructorReturn(this, (MAChartStrategy.__proto__ || Object.getPrototypeOf(MAChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.MovingAverage.ChartIndID;
                        _this.cp.name = 'chartIndiMV';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close',
                                type: 'simple',
                                offset: 0,
                                underlay: false
                        };

                        var innerPlot = {
                                langKey: 'MA',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var maPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        maPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = maPlot0;
                        _this.strategyGraphic.addChild(maPlot0.strategyGraphic);
                        return _this;
                }

                return MAChartStrategy;
        }(_chartStrategy.default);

        exports.default = MAChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/macd-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var MACDChartStrategy = function (_ChartStrategy) {
        _inherits(MACDChartStrategy, _ChartStrategy);

        function MACDChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, MACDChartStrategy);

            var _this = _possibleConstructorReturn(this, (MACDChartStrategy.__proto__ || Object.getPrototypeOf(MACDChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.studyKey = _chartStudies.default.Indicators.MACD.ChartIndID;
            _this.cp.name = 'chartIndiMACD';
            _this.cp.overlay = false;
            _this.cp.isOpenDialog = true;

            _this.cp.inputs = {
                field: 'Close',
                fastMAPeriod: 12,
                slowMAPeriod: 26,
                signalPeriod: 9
            };

            // Todo: [Ravindu] Load defined studies with their properties from json enum

            _this.cp.plotInfos = [];

            _this.createPlot({
                key: 'MACD',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'MACD',
                    lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-macd-macd-color', 'color'))
                }]
            }); // MACD

            _this.createPlot({
                key: 'Signal',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'Signal',
                    lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-macd-signal-color', 'color'))
                }]
            }); // Signal

            _this.createPlot({
                key: 'Histo',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Histogram.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'IncBar',
                    upColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_up', 'color'))
                }, {
                    langKey: 'DecBar',
                    downColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('candle_down', 'color'))
                }]
            }); // Histogram
            return _this;
        }

        return MACDChartStrategy;
    }(_chartStrategy.default);

    exports.default = MACDChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/mfi-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var MFIChartStrategy = function (_ChartStrategy) {
                _inherits(MFIChartStrategy, _ChartStrategy);

                function MFIChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, MFIChartStrategy);

                        var _this = _possibleConstructorReturn(this, (MFIChartStrategy.__proto__ || Object.getPrototypeOf(MFIChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.MoneyFlowIndex.ChartIndID;
                        _this.cp.name = 'chartIndiMFI';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14
                        };

                        var innerPlot = {
                                langKey: 'MFI',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var mfiPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        mfiPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = mfiPlot;
                        _this.strategyGraphic.addChild(mfiPlot.strategyGraphic);
                        return _this;
                }

                return MFIChartStrategy;
        }(_chartStrategy.default);

        exports.default = MFIChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/minus-di-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var MinusDIChartStrategy = function (_ChartStrategy) {
                _inherits(MinusDIChartStrategy, _ChartStrategy);

                function MinusDIChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, MinusDIChartStrategy);

                        var _this = _possibleConstructorReturn(this, (MinusDIChartStrategy.__proto__ || Object.getPrototypeOf(MinusDIChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.DirectionalMovementMinusDI.ChartIndID;
                        _this.cp.name = 'chartIndiDMMinDI';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'directMinusDI',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var mDIPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        mDIPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = mDIPlot0;
                        _this.strategyGraphic.addChild(mDIPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return MinusDIChartStrategy;
        }(_chartStrategy.default);

        exports.default = MinusDIChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/momentum-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var MomentumChartStrategy = function (_ChartStrategy) {
                _inherits(MomentumChartStrategy, _ChartStrategy);

                function MomentumChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, MomentumChartStrategy);

                        var _this = _possibleConstructorReturn(this, (MomentumChartStrategy.__proto__ || Object.getPrototypeOf(MomentumChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.Momentum.ChartIndID;
                        _this.cp.name = 'chartIndiMomentum';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'Momentum',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var moPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        moPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = moPlot0;
                        _this.strategyGraphic.addChild(moPlot0.strategyGraphic);
                        return _this;
                }

                // changeThemeProperties() {
                //     this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-2-color', 'color'));
                // }


                return MomentumChartStrategy;
        }(_chartStrategy.default);

        exports.default = MomentumChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/mp-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var MPChartStrategy = function (_ChartStrategy) {
                _inherits(MPChartStrategy, _ChartStrategy);

                function MPChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, MPChartStrategy);

                        var _this = _possibleConstructorReturn(this, (MPChartStrategy.__proto__ || Object.getPrototypeOf(MPChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.MedianPrice.ChartIndID;
                        _this.cp.name = 'chartIndiMP';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {};

                        var innerPlot = {
                                langKey: 'mpInd',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var mpPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        mpPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = mpPlot0;
                        _this.strategyGraphic.addChild(mpPlot0.strategyGraphic);
                        return _this;
                }

                return MPChartStrategy;
        }(_chartStrategy.default);

        exports.default = MPChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/obv-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var OBVChartStrategy = function (_ChartStrategy) {
                _inherits(OBVChartStrategy, _ChartStrategy);

                function OBVChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, OBVChartStrategy);

                        var _this = _possibleConstructorReturn(this, (OBVChartStrategy.__proto__ || Object.getPrototypeOf(OBVChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.onBalanceVolume.ChartIndID;
                        _this.cp.name = 'chartIndiOBV';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'obvInd',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var obvPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);
                        obvPlot.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = obvPlot;
                        _this.strategyGraphic.addChild(obvPlot.strategyGraphic);
                        return _this;
                }

                return OBVChartStrategy;
        }(_chartStrategy.default);

        exports.default = OBVChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/plus-di-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var PlusDIChartStrategy = function (_ChartStrategy) {
                _inherits(PlusDIChartStrategy, _ChartStrategy);

                function PlusDIChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, PlusDIChartStrategy);

                        var _this = _possibleConstructorReturn(this, (PlusDIChartStrategy.__proto__ || Object.getPrototypeOf(PlusDIChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.DirectionalMovementPlusDI.ChartIndID;
                        _this.cp.name = 'chartIndiDMPlusDI';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'directPlusDI',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-3-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var pDIPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        pDIPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = pDIPlot0;
                        _this.strategyGraphic.addChild(pDIPlot0.strategyGraphic);
                        return _this;
                }

                /* changeThemeProperties() {
                    this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                }*/


                return PlusDIChartStrategy;
        }(_chartStrategy.default);

        exports.default = PlusDIChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/psar-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var PSARChartStrategy = function (_ChartStrategy) {
                _inherits(PSARChartStrategy, _ChartStrategy);

                function PSARChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, PSARChartStrategy);

                        var _this = _possibleConstructorReturn(this, (PSARChartStrategy.__proto__ || Object.getPrototypeOf(PSARChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.PSAR.ChartIndID;
                        _this.cp.name = 'chartIndPSAR';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                minimumAF: 0.02,
                                maximumAF: 0.2
                        };

                        var innerPlot = {
                                langKey: 'PSAR',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var psarPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Point.ChartType, _this.calcDP, _this.cp.stageProperty);

                        psarPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = psarPlot;
                        _this.strategyGraphic.addChild(psarPlot.strategyGraphic);
                        return _this;
                }

                return PSARChartStrategy;
        }(_chartStrategy.default);

        exports.default = PSARChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/rsi-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var RSIChartStrategy = function (_ChartStrategy) {
                _inherits(RSIChartStrategy, _ChartStrategy);

                function RSIChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, RSIChartStrategy);

                        var _this = _possibleConstructorReturn(this, (RSIChartStrategy.__proto__ || Object.getPrototypeOf(RSIChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.RelativeStrengthIndex.ChartIndID;
                        _this.cp.name = 'chartIndiRSI';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14
                        };

                        var innerPlot = {
                                langKey: 'RSI',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var rsiPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        rsiPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = rsiPlot;
                        _this.strategyGraphic.addChild(rsiPlot.strategyGraphic);
                        return _this;
                }

                return RSIChartStrategy;
        }(_chartStrategy.default);

        exports.default = RSIChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/stoch-oscillator-chart-strategy', ['exports', '../chart-strategy', '../../utils/chart-studies', '../../utils/chart-utils', '../../utils/chart-core-constants', '../chart-strategy-factory'], function (exports, _chartStrategy, _chartStudies, _chartUtils, _chartCoreConstants, _chartStrategyFactory) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var StochasticOscillatorChartStrategy = function (_ChartStrategy) {
        _inherits(StochasticOscillatorChartStrategy, _ChartStrategy);

        function StochasticOscillatorChartStrategy(calcDataProvider, stageProp) {
            _classCallCheck(this, StochasticOscillatorChartStrategy);

            var _this = _possibleConstructorReturn(this, (StochasticOscillatorChartStrategy.__proto__ || Object.getPrototypeOf(StochasticOscillatorChartStrategy)).call(this, calcDataProvider, stageProp));

            _this.cp.studyKey = _chartStudies.default.Indicators.StochasticOscillator.ChartIndID;
            _this.cp.name = 'chartIndiSO';
            _this.cp.overlay = false;
            _this.cp.isOpenDialog = true;

            _this.cp.inputs = {
                period: 14,
                field: 'Close',
                smooth: true
            };

            // TODO: [Ravindu] Load defined studies with their properties from json enum

            _this.cp.plotInfos = [];

            _this.createPlot({
                key: 'Fast',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'Fast',
                    lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color'))
                }]
            });

            _this.createPlot({
                key: 'Slow',
                chartStrategy: _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty),

                innerPlots: [{
                    langKey: 'Slow',
                    lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-5-color', 'color'))
                }]
            });
            return _this;
        }

        return StochasticOscillatorChartStrategy;
    }(_chartStrategy.default);

    exports.default = StochasticOscillatorChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/time-forc-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var TimeForcChartStrategy = function (_ChartStrategy) {
                _inherits(TimeForcChartStrategy, _ChartStrategy);

                function TimeForcChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, TimeForcChartStrategy);

                        var _this = _possibleConstructorReturn(this, (TimeForcChartStrategy.__proto__ || Object.getPrototypeOf(TimeForcChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.TimeSeriesForecast.ChartIndID;
                        _this.cp.name = 'chartIndiTSF';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'timeSeriesForc',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-macd-hist-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var pPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        pPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = pPlot0;
                        _this.strategyGraphic.addChild(pPlot0.strategyGraphic);
                        return _this;
                }

                // changeThemeProperties() {
                //     this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-3-color', 'color'));
                // }


                return TimeForcChartStrategy;
        }(_chartStrategy.default);

        exports.default = TimeForcChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/trix-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var TRIXChartStrategy = function (_ChartStrategy) {
                _inherits(TRIXChartStrategy, _ChartStrategy);

                function TRIXChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, TRIXChartStrategy);

                        var _this = _possibleConstructorReturn(this, (TRIXChartStrategy.__proto__ || Object.getPrototypeOf(TRIXChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.TRIX.ChartIndID;
                        _this.cp.name = 'chartIndTRIX';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close'
                        };

                        var innerPlot = {
                                langKey: 'trixInd',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('compare-line-1-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var pPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        pPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = pPlot0;
                        _this.strategyGraphic.addChild(pPlot0.strategyGraphic);
                        return _this;
                }

                // changeThemeProperties() {
                //     this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-3-color', 'color'));
                // }


                return TRIXChartStrategy;
        }(_chartStrategy.default);

        exports.default = TRIXChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/vol-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var VolChartStrategy = function (_ChartStrategy) {
                _inherits(VolChartStrategy, _ChartStrategy);

                function VolChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, VolChartStrategy);

                        var _this = _possibleConstructorReturn(this, (VolChartStrategy.__proto__ || Object.getPrototypeOf(VolChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.name = 'chartVolume';
                        _this.cp.overlay = false;

                        _this.cp.inputs = {
                                field: 'Volume'
                        };

                        var innerPlot = {
                                langKey: 'Volume',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-vol-label-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var volPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Bar.ChartType, _this.calcDP, _this.cp.stageProperty);

                        volPlot0.cp = _this.cp; // Assigned parent chart property
                        volPlot0.isTrendEnabled = true;

                        _this.plotChartStrategy[0] = volPlot0;
                        _this.strategyGraphic.addChild(volPlot0.strategyGraphic);
                        return _this;
                }

                // changeThemeProperties() {
                //     this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('chart-vol-label-color', 'color'));
                // }


                return VolChartStrategy;
        }(_chartStrategy.default);

        exports.default = VolChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/vol-oscillator-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var VolOscChartStrategy = function (_ChartStrategy) {
                _inherits(VolOscChartStrategy, _ChartStrategy);

                function VolOscChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, VolOscChartStrategy);

                        var _this = _possibleConstructorReturn(this, (VolOscChartStrategy.__proto__ || Object.getPrototypeOf(VolOscChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.VolOsc.ChartIndID;
                        _this.cp.name = 'chartIndVolOsc';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                shortCycle: 12,
                                longCycle: 26,
                                PointsOrPercent: 'Points'
                        };

                        var innerPlot = {
                                langKey: 'volOsc',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-bb-median-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var voPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        voPlot0.cp = _this.cp;

                        _this.plotChartStrategy[0] = voPlot0;
                        _this.strategyGraphic.addChild(voPlot0.strategyGraphic);
                        return _this;
                }

                return VolOscChartStrategy;
        }(_chartStrategy.default);

        exports.default = VolOscChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/wilders-smoth-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var WildersSmoothChartStrategy = function (_ChartStrategy) {
                _inherits(WildersSmoothChartStrategy, _ChartStrategy);

                function WildersSmoothChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, WildersSmoothChartStrategy);

                        var _this = _possibleConstructorReturn(this, (WildersSmoothChartStrategy.__proto__ || Object.getPrototypeOf(WildersSmoothChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.WildersSmoothing.ChartIndID;
                        _this.cp.name = 'chartIndiWS';
                        _this.cp.overlay = true;
                        _this.cp.isOpenDialog = true;
                        _this.cp.mvType = _chartStudies.default.MVTypes.WellesWilder;

                        _this.cp.inputs = {
                                period: 14,
                                field: 'Close',
                                offset: 0
                        };

                        var innerPlot = {
                                langKey: 'wildersSmooth',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-momentum-line-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var wsPlot0 = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        wsPlot0.cp = _this.cp; // Assigned parent chart property

                        _this.plotChartStrategy[0] = wsPlot0;
                        _this.strategyGraphic.addChild(wsPlot0.strategyGraphic);
                        return _this;
                }

                /*  changeThemeProperties() {
                      this.cp.plotInfos[0].lineColor = ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-1-color', 'color'));
                  }*/


                return WildersSmoothChartStrategy;
        }(_chartStrategy.default);

        exports.default = WildersSmoothChartStrategy;
});
define('universal-app/controllers/chart/core/chart-strategy/tech-indicator/williams-per-r-chart-strategy', ['exports', '../chart-strategy', '../chart-strategy-factory', '../../utils/chart-studies', '../../utils/chart-core-constants', '../../utils/chart-utils'], function (exports, _chartStrategy, _chartStrategyFactory, _chartStudies, _chartCoreConstants, _chartUtils) {
        'use strict';

        function _classCallCheck(instance, Constructor) {
                if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                }
        }

        function _possibleConstructorReturn(self, call) {
                if (!self) {
                        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                }

                return call && (typeof call === "object" || typeof call === "function") ? call : self;
        }

        function _inherits(subClass, superClass) {
                if (typeof superClass !== "function" && superClass !== null) {
                        throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
                }

                subClass.prototype = Object.create(superClass && superClass.prototype, {
                        constructor: {
                                value: subClass,
                                enumerable: false,
                                writable: true,
                                configurable: true
                        }
                });
                if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
        }

        var WPERRChartStrategy = function (_ChartStrategy) {
                _inherits(WPERRChartStrategy, _ChartStrategy);

                function WPERRChartStrategy(calcDataProvider, stageProp) {
                        _classCallCheck(this, WPERRChartStrategy);

                        var _this = _possibleConstructorReturn(this, (WPERRChartStrategy.__proto__ || Object.getPrototypeOf(WPERRChartStrategy)).call(this, calcDataProvider, stageProp));

                        _this.cp.studyKey = _chartStudies.default.Indicators.WilliamsPerR.ChartIndID;
                        _this.cp.name = 'chartIndiWPerR';
                        _this.cp.overlay = false;
                        _this.cp.isOpenDialog = true;

                        _this.cp.inputs = {
                                period: 14
                        };

                        var innerPlot = {
                                langKey: 'williamsperr',
                                lineColor: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color'))
                        };

                        _this.cp.plotInfos[0].lineColor = innerPlot.lineColor;
                        _this.cp.plotInfos[0].innerPlots = [innerPlot];

                        var wprPlot = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, _this.calcDP, _this.cp.stageProperty);

                        wprPlot.cp = _this.cp;

                        _this.plotChartStrategy[0] = wprPlot;
                        _this.strategyGraphic.addChild(wprPlot.strategyGraphic);
                        return _this;
                }

                return WPERRChartStrategy;
        }(_chartStrategy.default);

        exports.default = WPERRChartStrategy;
});
define('universal-app/controllers/chart/core/plot-info', ['exports'], function (exports) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var PlotInfo = function PlotInfo() {
        _classCallCheck(this, PlotInfo);

        this.upColor = 0x008000;
        this.downColor = 0xFF0000;
        this.lineColor = 0x3577ae;
        this.key = ''; // // Key for identifying plot
        this.propertyKey = ''; // Key for accessing data
        // this.hasDualColors = false;
        this.innerPlots = [];
        this.labelColor = 0x4f9ece;
    };

    exports.default = PlotInfo;
});
define('universal-app/controllers/chart/core/stage-property', ['exports', './utils/chart-core-constants', './utils/chart-utils', '../../../utils/utils'], function (exports, _chartCoreConstants, _chartUtils, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var StageProperty = function () {
        function StageProperty(params) {
            _classCallCheck(this, StageProperty);

            this.divContainer = $(params.containerCls);
            this.jCanvas = params.jCanvas;
            // this.halfInchDpi = params.dpi / 2;
            this.yAxisLeft = 0;
            this.yAxisRight = _chartCoreConstants.default.YAxisWidth;
            this.legendHt = 0;
            this.drawingWd = 0;
            this.drawingHt = 0;
            this.barThickness = 0;
            this.dashLength = 0;
            this.xScale = 0;
            this.decimals = 2;
            this.xAxisHt = 0;
            this.yTopClearance = 0; // Canvas Vertical Top Clearance
            this.isMobile = params.chartParams.isMobile;

            this.textStyle = new PIXI.TextStyle({
                fontFamily: 'Arial',
                fontSize: this.isMobile ? 12 : 9,
                fill: _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')).replace('0X', '#'),
                strokeThickness: 0
            });

            this.yAxisPosition = _chartCoreConstants.default.YAxisPos.Right;
            this.stage = params.stage;
            this.renderer = params.renderer;
            this.barThickness = 0;
            this.dashLength = 0;
            this.xClearance = 10; // Controlling gap between left and right Vertical axis lines.
            this.colorPointer = -1;
            this.chartParams = params.chartParams;
            this.langObj = params.langObj;

            // Calculating dpi

            try {
                var dpiEle = $('#dpi')[0];
                var devicePixelRatio = window.devicePixelRatio; // Ratio of the resolution in physical pixels to the resolution in CSS pixels for the current display device

                var inchDPI = dpiEle ? dpiEle.offsetWidth : devicePixelRatio * 96; // 1 inch = 96px in real px context
                this.halfInchDpi = inchDPI / 2;

                _utils.default.logger.logInfo('DPI : ' + inchDPI + ', Inch from device pixel ratio : ' + devicePixelRatio * 96);
            } catch (e) {
                this.halfInchDpi = 96 / 2;

                _utils.default.logger.logError('Error in Calculating dpi ' + e);
            }
        }

        /**
         * Adjusting canvas size according to div size, Defining action hit area and calculating drawing space
         */

        _createClass(StageProperty, [{
            key: 'calculateDrawingDimension',
            value: function calculateDrawingDimension() {
                try {
                    this.xAxisHt = (this.chartParams.isTimesOnChart ? this.textStyle.fontSize : 2 * this.textStyle.fontSize) + 15; // Added 15 pixel bottom margin
                    this.jCanvas[0].width = this.divContainer.width();
                    this.jCanvas[0].height = this.divContainer.height();

                    this.renderer.resize(this.jCanvas[0].width, this.jCanvas[0].height);

                    this.stage.hitArea = new PIXI.Rectangle(0, 0, this.jCanvas.width(), this.jCanvas.height()); // Define canvas hit area

                    var calDrwWd = this.jCanvas.width() - this.yAxisLeft - this.yAxisRight;
                    var calDrwHt = this.jCanvas.height() - this.xAxisHt - this.legendHt;

                    this.drawingWd = calDrwWd < _chartCoreConstants.default.MinDrawingWidth ? _chartCoreConstants.default.MinDrawingWidth : calDrwWd;
                    this.drawingHt = calDrwHt < _chartCoreConstants.default.MinDrawingHeight ? _chartCoreConstants.default.MinDrawingHeight : calDrwHt;
                } catch (e) {
                    _utils.default.logger.logError('Error in Calculating drawing dimension' + e);
                }
            }
        }, {
            key: 'calculateThickness',
            value: function calculateThickness() {
                var that = this;

                switch (Math.round(this.xScale)) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        that.barThickness = 1;
                        that.dashLength = 1;
                        break;

                    case 5:
                    case 6:
                    case 7:
                        that.barThickness = 2;
                        that.dashLength = 2;
                        break;

                    case 8:
                        that.barThickness = 3;
                        that.dashLength = 3;
                        break;

                    default:
                        that.barThickness = Math.round(Math.min(Math.round(this.xScale / 5), 35)); // Todo: [Ravindu] Use correct propotional formula here
                        that.dashLength = Math.round(Math.min(Math.round(this.xScale / 3), 10)); // Todo: [Ravindu] Use correct propotional formula here
                        break;
                }
            }
        }, {
            key: 'getComparisonColor',
            value: function getComparisonColor() {
                var colors = this.getComparisonColorArray();
                this.colorPointer = this.colorPointer >= colors.length - 1 ? 0 : ++this.colorPointer;
                return colors[this.colorPointer];
            }
        }, {
            key: 'getComparisonColorArray',
            value: function getComparisonColorArray() {
                return [_chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-1-color', 'color')), _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-2-color', 'color')), _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-3-color', 'color')), _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('compare-line-1-color', 'color')), _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-5-color', 'color'))];
            }
        }]);

        return StageProperty;
    }();

    exports.default = StageProperty;
});
define('universal-app/controllers/chart/core/stock-graph', ['exports', './calculated-data-provider', './chart-component', './stage-property', './utils/chart-core-constants', './utils/chart-formatters', './chart-drawing', './chart-strategy/chart-strategy-factory', '../../../utils/utils', './utils/chart-utils', './utils/study-dialog', './utils/pixel-conversion', './chart-strategy/line-study-strategy/line-study-factory'], function (exports, _calculatedDataProvider, _chartComponent, _stageProperty, _chartCoreConstants, _chartFormatters, _chartDrawing, _chartStrategyFactory, _utils, _chartUtils, _studyDialog, _pixelConversion, _lineStudyFactory) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var StockGraph = function () {
        function StockGraph(params) {
            _classCallCheck(this, StockGraph);

            var that = this;
            this.chartComponents = [];
            this.sym = '';
            this.exg = '';
            this.chartDP = params.chartDataProvider;
            this.subWinSplitters = [0, 1];
            this.calcDP = new _calculatedDataProvider.default(params.chartDataProvider);
            this.stage = new PIXI.Container(); // Create a container object called the `stage`
            this.jCanvas = $('<canvas></canvas>');
            this.renderer = _chartDrawing.default.createPIXIenv(params.chartContainerCls, this.jCanvas);
            this.chartStyle = _chartCoreConstants.default.ChartStyle.Area;
            this.gridSetting = _chartCoreConstants.default.ProChartGridStyle.Both;

            this.chartParams = {
                isCompactMode: false,
                isTimesOnChart: params.isMobile,
                isMobile: params.isMobile,
                isLandscape: params.isLandscape
            };

            this.stageProperty = new _stageProperty.default({
                containerCls: params.chartContainerCls,
                jCanvas: this.jCanvas,
                // dpi: params.dpi,
                stage: this.stage,
                renderer: this.renderer,
                chartParams: this.chartParams,
                langObj: params.langObj
            });

            this.midNights = [];
            this.baseChartStrategy = undefined;
            this.selectedLineStudy = undefined;
            this.crosshair = undefined;
            this.chartContainerClass = params.chartContainerCls;
            this.onFinishedDrawingChart = undefined;
            this.pointOnChartFN = undefined;
            this.isYAxisRescaling = false;

            this.yScaleMouse = {
                mouseUp: undefined,
                mouseDown: undefined
            };

            this.ticker = PIXI.ticker.shared;
            this.ticker.autoStart = true;

            this.ticker.add(function () {
                that.renderer.render(that.stage); // Every 60fps - https://sprite-storm.com/tutorial/pixi-tutorial/pixi-js-getting-started/
            }, this);

            this.stage.interactive = true;

            this.stage.on('mousemove', function (ev) {
                that._mouseMoveEventHandler(ev);
            });

            this.stage.on('mousedown', function (ev) {
                that._mouseClickEventHandler(ev);
            });

            this.stage.on('mouseup', function (ev) {
                that._mouseReleasedEventHandler(ev);
            });

            var chartContainer = $(this.chartContainerClass)[0];

            if (this.chartParams.isMobile && chartContainer) {
                chartContainer.addEventListener('touchstart', function (ev) {
                    that._mouseMoveEventHandler(ev);
                });
            }

            /* this.chartDP.onDataChunk = function (chartSymbolObj) {
             that.onReceivedData();
             }; */

            // this.horizLine = new PIXI.Graphics();
            this.vertiLine = new PIXI.Graphics();
            this.xAxis = new PIXI.Graphics();
            this.verticalGrids = new PIXI.Graphics(); // Grid types

            this.stage.addChild(this.vertiLine);
            this.stage.addChild(this.xAxis);

            this._drawAxisesLine();
        }

        _createClass(StockGraph, [{
            key: 'addBaseSymbol',
            value: function addBaseSymbol(exg, sym) {
                var that = this;
                this.sym = sym;
                this.exg = exg;

                $.each(this._getMainChartComponent().chartStrategies, function (index, strategy) {
                    if (strategy && strategy.cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Compare && sym === strategy.cp.symObj.sym && exg === strategy.cp.symObj.exg) {
                        that._getMainChartComponent().removeStrategy(strategy);
                        return false;
                    }
                }); // When base symbol is changed to added compare symbol, compare symbol will be removed as in pro 10

                this.calcDP.isZoomedDataArray = false; // Doesn't keeps applied zoom level

                if (!this.baseChartStrategy) {
                    this.baseChartStrategy = _chartStrategyFactory.default.getChartStrategy(this.chartStyle.ChartType, this.calcDP, this.stageProperty);
                    this.baseChartStrategy.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.Base;

                    this._createChartComponent(_chartCoreConstants.default.ChartComponentType.Main).addStrategy(this.baseChartStrategy);
                }

                // Todo: [Ravindu] Invoke addSubscription of chart data provider in here.
            }
        }, {
            key: 'addCompareSymbol',
            value: function addCompareSymbol(exg, sym, lineColor, colorIndex) {
                if (_chartUtils.default.getSymbolKey(this.exg, this.sym) !== _chartUtils.default.getSymbolKey(exg, sym)) {
                    var compare = _chartStrategyFactory.default.getChartStrategy(_chartCoreConstants.default.ChartStyle.Line.ChartType, this.calcDP, this.stageProperty);

                    var info = compare.cp.plotInfos[0];

                    info.lineColor = lineColor ? lineColor : this.stageProperty.getComparisonColor();
                    this.stageProperty.colorPointer = colorIndex || colorIndex === 0 ? colorIndex : this.stageProperty.colorPointer;
                    compare.randomColorIndex = this.stageProperty.colorPointer;
                    compare.cp.inputs.field = sym + '-' + 'Close';
                    compare.cp.name = sym;

                    compare.cp.symObj = {
                        exg: exg,
                        sym: sym
                    };

                    compare.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.Compare;

                    this._createChartComponent(_chartCoreConstants.default.ChartComponentType.Main).addStrategy(compare);
                }
            }
        }, {
            key: 'openDialog',
            value: function openDialog(strategyId, strategy) {
                var chartStrategy = strategy;

                if (!chartStrategy) {
                    chartStrategy = _chartStrategyFactory.default.getChartStrategy(strategyId, this.calcDP, this.stageProperty);
                }

                var studyDialog = _studyDialog.default.createStudyDialog(chartStrategy);

                if (studyDialog) {
                    studyDialog.style.display = 'block';
                }
            }
        }, {
            key: 'modifyChartStrategy',
            value: function modifyChartStrategy(div) {
                var clonedStat = void 0;
                var chartStrategy = _studyDialog.default.extractDialog(div);

                if (chartStrategy.strategyId) {
                    // Checking if the strategy is already added
                    clonedStat = _chartStrategyFactory.default.getChartStrategy(chartStrategy.cp.studyKey, chartStrategy.calcDP, chartStrategy.cp.stageProperty);

                    this._applySDtoChartProperty(clonedStat.cp, chartStrategy.cp);
                    this.removeAddedChart(chartStrategy.strategyId);
                } else {
                    clonedStat = chartStrategy;
                }

                this.addNewChart(clonedStat, false);
                return chartStrategy;
            }
        }, {
            key: 'quickAddStudy',
            value: function quickAddStudy(strategyId) {
                var chartStrategy = _chartStrategyFactory.default.getChartStrategy(strategyId, this.calcDP, this.stageProperty);
                return this.addNewChart(chartStrategy, false);
            }
        }, {
            key: 'addChartFromSDArray',
            value: function addChartFromSDArray(sdArray) {
                var that = this;
                var chartStrategy = void 0;

                $.each(sdArray, function (index, sd) {
                    chartStrategy = _chartStrategyFactory.default.getChartStrategy(sd.studyKey, that.calcDP, that.stageProperty);
                    that._applySDtoChartProperty(chartStrategy.cp, sd);
                    that.addNewChart(chartStrategy, true);
                });

                // this.clearChart();
                // this.calcDP.refindModelData(false);

                this._loadChartComponents();
            }
        }, {
            key: 'addNewChart',
            value: function addNewChart(strategy, isBulkReload) {
                if (strategy) {
                    var that = this;
                    var drawComponent = strategy.cp['overlay'] ? _chartCoreConstants.default.ChartComponentType.Main : _chartCoreConstants.default.ChartComponentType.Sub;
                    var comp = this._addNewSubWindow(false, this._createChartComponent(drawComponent)); // Todo: [Ravindu] Improve source to client can add any indicator to existing sub window.
                    var stratId = comp.addStrategy(strategy);

                    if (drawComponent !== _chartCoreConstants.default.ChartComponentType.Main) {
                        comp.containerStudyType = _chartCoreConstants.default.ChartStudyType.Indicator; // This flag is used to select y axis multiplier
                    }

                    strategy.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.Indicator;

                    strategy.onAdjustLayout = function () {
                        that.onAdjustLayoutForNewStudy();
                    };

                    if (!isBulkReload) {
                        // this.clearChart(); // Todo: [Ravindu] Check if strategy draw is enough to draw and calculate added indicator
                        // this.calcDP.refindModelData(false);

                        strategy.drawChart(false);
                    }

                    return stratId;
                }
            }
        }, {
            key: 'removeAddedChart',
            value: function removeAddedChart(stratId) {
                var arr = this._getChartComponentStrategyPos(stratId);

                if (arr.length > 0) {
                    var compIndex = parseInt(arr[0], 10);

                    if (compIndex > 0) {
                        try {
                            this._deleteAddedPanel(compIndex);

                            // this.clearChart();
                            // this.calcDP.refindModelData(false);

                            this.onRevalidateChart(true);
                        } catch (e) {
                            _utils.default.logger.logError('Error in removing added chart - sub window' + e);
                        }
                    } else {
                        this.removeStrategy(stratId);
                    }
                }
            }
        }, {
            key: 'removeStrategy',
            value: function removeStrategy(stratId) {
                try {
                    var chartComponent = this.getChartComponent(stratId);

                    if (chartComponent) {
                        var strategy = this._getChartStrategy(chartComponent, stratId);

                        if (strategy) {
                            chartComponent.removeStrategy(strategy);

                            if (this.onFinishedDrawingChart && $.isFunction(this.onFinishedDrawingChart)) {
                                this.onFinishedDrawingChart();
                            }
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error in removing added strategy' + e);
                }
            }
        }, {
            key: 'getChartComponent',
            value: function getChartComponent(stratId) {
                var arr = this._getChartComponentStrategyPos(stratId);

                if (arr.length > 0) {
                    return this.chartComponents[parseInt(arr[0], 10)];
                }
            }
        }, {
            key: 'setPeriodicity',
            value: function setPeriodicity(rawDataType, interval) {
                var isRawDataChanged = this.calcDP.rawDataType !== rawDataType;

                this.calcDP.rawDataType = rawDataType;
                this.calcDP.interval = interval;
                this.calcDP.isZoomedDataArray = false; // Doesn't keeps applied zoom level

                // Function is invoked when changing intraday period to history period and vice versa so at that time to avoid invoking refine model as
                // model update is called for changing period

                if (!isRawDataChanged) {
                    // Manually changing chart intervals

                    // this.clearChart();
                    this.onResetYDragZoom();
                    this.onResetCalcStatus();
                    this.calcDP.refindModelData(true);
                }
            }
        }, {
            key: 'setChartType',
            value: function setChartType(chartStyle) {
                try {
                    if (this.baseChartStrategy) {
                        this.chartStyle = chartStyle;

                        var mainComp = this._createChartComponent(_chartCoreConstants.default.ChartComponentType.Main);
                        var prevStragId = this.baseChartStrategy.strategyId; // When changing chart type, previous base chart removal will mess strategy indexing order, so strategy id of prev chart type is set to new chart as solution.

                        this.baseChartStrategy.strategyGraphic.clear(); // Base Chart Graphic Object
                        mainComp.removeStrategy(this.baseChartStrategy);

                        this.baseChartStrategy = _chartStrategyFactory.default.getChartStrategy(chartStyle.ChartType, this.calcDP, this.stageProperty);
                        this.baseChartStrategy.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.Base;

                        mainComp.addStrategy(this.baseChartStrategy, prevStragId);
                        this.onRevalidateChart(true);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro chart] Set Chart Type');
                }
            }
        }, {
            key: 'onThemeChanged',
            value: function onThemeChanged() {
                this.stageProperty.textStyle.fill = _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-grid-color', 'color')).replace('0X', '#');
                this.vertiLine.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 0.5, 0);
                this.xAxis.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 1, 0);
                // this.horizLine.lineStyle(1, ChartUtils.colorToHex(ChartUtils.getStyleOfElement('line-4-color', 'color')), 0.6);

                // Repainting
                $.each(this.chartComponents, function (index, component) {
                    $.each(component.chartStrategies, function (pos, strategy) {
                        strategy.changeThemeProperties();
                    });
                });

                this._drawChartComponents();
            }
        }, {
            key: 'onLanguageChanged',
            value: function onLanguageChanged() {
                this._drawChartComponents();

                var dialog = $('#studyDialog')[0];

                if (dialog && dialog.style.display !== 'none') {
                    _studyDialog.default.changeDialogLang(dialog, this.stageProperty.langObj);
                }
            }
        }, {
            key: 'onRedrawChart',
            value: function onRedrawChart() {
                try {
                    this.clearChart();
                    this.calcDP.refindModelData(true);
                } catch (e) {
                    _utils.default.logger.logError('Error in on redraw chart' + e);
                }
            }
        }, {
            key: 'onAdjustLayoutForNewStudy',
            value: function onAdjustLayoutForNewStudy() {
                this.clearChart();

                this._calculateMinMaxBounds();
                this._setYAxisWidth();
                this._recalculateChartCompRectBounds();
                this._calculateXYFactors();
                this.stageProperty.calculateThickness();

                this._drawAxisesLine();
                this._drawXAxis();
                this._drawChartComponents(); // Don't recalculate

                if (this.onFinishedDrawingChart && $.isFunction(this.onFinishedDrawingChart)) {
                    this.onFinishedDrawingChart();
                }
            }
        }, {
            key: 'onRevalidateChart',
            value: function onRevalidateChart(isDimenChanged) {
                _utils.default.logger.logInfo('Invoked on revalidate chart l1');

                this.clearChart();
                this._adjustChartSpace(isDimenChanged);
                this._drawAxisesLine();
                this._drawXAxis();
                this._drawChartComponents();

                if (this.onFinishedDrawingChart && $.isFunction(this.onFinishedDrawingChart)) {
                    this.onFinishedDrawingChart();
                }
            }
        }, {
            key: 'setGridType',
            value: function setGridType(option) {
                this.gridSetting = option;

                this.verticalGrids.visible = _chartCoreConstants.default.ProChartGridStyle.Both.ID === option.ID || _chartCoreConstants.default.ProChartGridStyle.Vertical.ID === option.ID;

                $.each(this.chartComponents, function (index, component) {
                    component.setHorizontalGridsVisiblity(option);
                });
            }
        }, {
            key: 'quickAddLineStudy',
            value: function quickAddLineStudy(studyType) {
                var studyStrategy = _lineStudyFactory.default.getLineStudy(studyType, this.calcDP, this.stageProperty);
                this.addLineStudy(studyStrategy);
            }
        }, {
            key: 'addLineStudyFromSD',
            value: function addLineStudyFromSD(sd) {
                try {
                    var that = this;
                    var studyStrategy = _lineStudyFactory.default.getLineStudy(sd.key, this.calcDP, this.stageProperty);

                    studyStrategy.cp.plotInfos = sd.plotInfos;
                    studyStrategy.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.LineStudy;
                    studyStrategy.mouse = sd.point;

                    studyStrategy.removeFN = function (strategyId) {
                        that.removeAddedChart(strategyId);
                    };

                    var chartComponent = that.getChartComponent(sd.strategyId);

                    if (chartComponent) {
                        chartComponent.addStrategy(studyStrategy); // Todo: [Ravindu] Fixed for line study saving
                        // this._getMainChartComponent().addStrategy(studyStrategy); // Todo: [Ravindu] Line study can be drawn everywhere of chart
                        // studyStrategy.drawChart();
                        that._loadChartComponents();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Error in Add line study from save status ' + e);
                }
            }
        }, {
            key: 'addLineStudy',
            value: function addLineStudy(studyStrategy) {
                var that = this;

                that.selectedLineStudy = studyStrategy;
                that.selectedLineStudy.cp.chartStudyType = _chartCoreConstants.default.ChartStudyType.LineStudy;

                that.selectedLineStudy.removeFN = function (strategyId) {
                    that.removeStrategy(strategyId);
                };
            }
        }, {
            key: 'setCrossHair',
            value: function setCrossHair(enable) {
                var chartContainer = $(this.chartContainerClass)[0];

                if (!this.crosshair) {
                    this.crosshair = _lineStudyFactory.default.getLineStudy(_chartCoreConstants.default.LineStudyTypes.CrossHair, this.calcDP, this.stageProperty);
                    this._getMainChartComponent().addStrategy(this.crosshair);
                }

                if (enable) {
                    $('#crosshair-btn').addClass('active');
                } else {
                    $('#crosshair-btn').removeClass('active');
                }

                this.crosshair.isEnabled = enable;
                this.crosshair.isDrawing = enable;
                this.crosshair.strategyGraphic.visible = enable;

                if (chartContainer) {
                    chartContainer.style.cursor = enable ? 'crosshair' : 'default';
                }
            }
        }, {
            key: 'clearChart',
            value: function clearChart() {
                try {
                    if (this.stage) {
                        _chartUtils.default.clearParent(this.stage);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Clear chart ' + e);
                }
            }
        }, {
            key: 'clearCalcDataSource',
            value: function clearCalcDataSource() {
                try {
                    if (this.calcDP) {
                        this.calcDP.dataSource = [];
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Clear calculated datasource ' + e);
                }
            }
        }, {
            key: 'destroyChart',
            value: function destroyChart() {
                try {
                    if (this.renderer) {
                        // Free renderer, all plugins, all shaders, all textures that are loaded in GPU
                        this.renderer.destroy();
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Destroy chart ' + e);
                }
            }
        }, {
            key: 'onResetCalcStatus',
            value: function onResetCalcStatus() {
                try {
                    this.calcDP.resetCalStatus();
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Error in Resetting cal status ' + e);
                }
            }
        }, {
            key: 'onReceivedData',
            value: function onReceivedData(chartSymbolObj) {
                var that = this;

                that.calcDP.isZoomedDataArray = false; // Doesn't keeps applied zoom level
                that.onResetYDragZoom();
                that.onResetCalcStatus();

                that.calcDP.modelData({
                    onSuccesFn: function onSuccesFn() {
                        _utils.default.logger.logInfo('[Drw Path] Received data invoked - Starting redraw');

                        that.clearChart();
                        // that.onResetCalcStatus();

                        that._adjustChartSpace(true);
                        that._drawAxisesLine(); // Updating Axis line according to real y axis width
                        that._calculateMidNights(that.calcDP.beginIndex, that.calcDP.endIndex, that.calcDP.dataSource);
                        that._drawXAxis();
                        that._loadChartComponents();

                        if (that.onFinishedDrawingChart && $.isFunction(that.onFinishedDrawingChart)) {
                            that.onFinishedDrawingChart();
                        }

                        _utils.default.logger.logInfo('[Drw Path] Ended - Received data invoked - Finished redraw');
                    },

                    chartSymObj: chartSymbolObj,
                    isDataModelingRequired: true
                });
            }
        }, {
            key: 'onReceivedRealtimePoint',
            value: function onReceivedRealtimePoint(ohlcPoint, exg, sym) {
                if (this.calcDP.baseSymObj && this.calcDP.baseSymObj.exg === exg && this.calcDP.baseSymObj.sym === sym) {
                    // Todo: [Ravindu] Only intraday chart is updated from realtime point until last candle implementation
                    this.clearChart();
                    this.onResetCalcStatus();
                    this.calcDP.refindModelData(true);
                }
            }
        }, {
            key: 'setIndexing',
            value: function setIndexing(isIndexing) {
                this.calcDP.isIndexing = isIndexing;
                this.calcDP.refindModelData(true);
            }
        }, {
            key: '_applySDtoChartProperty',
            value: function _applySDtoChartProperty(chartProperty, sd) {
                chartProperty.inputs = sd.inputs;
                chartProperty.overlay = sd.overlay;
                chartProperty.isOpenDialog = sd.isOpenDialog;
                chartProperty.plotInfos = sd.plotInfos;
            }
        }, {
            key: '_createChartComponent',
            value: function _createChartComponent(compType) {
                var that = this;

                switch (compType) {
                    case _chartCoreConstants.default.ChartComponentType.Main:
                        return that._getMainChartComponent();

                    case _chartCoreConstants.default.ChartComponentType.Sub:
                        return new _chartComponent.default(that.calcDP, that.stageProperty, undefined, that.gridSetting);
                }
            }
        }, {
            key: '_getMainChartComponent',
            value: function _getMainChartComponent() {
                if (this.chartComponents.length === 0 || !this.chartComponents[0]) {
                    this.chartComponents[0] = new _chartComponent.default(this.calcDP, this.stageProperty, 0, this.gridSetting);
                    this.chartComponents[0].containerStudyType = _chartCoreConstants.default.ChartStudyType.Base;
                }

                return this.chartComponents[0];
            }
        }, {
            key: '_adjustChartSpace',
            value: function _adjustChartSpace(isDimenChanged) {
                this._calculateMinMaxBounds();
                this._setYAxisWidth();

                if (isDimenChanged) {
                    this.stageProperty.calculateDrawingDimension();
                    this._recalculateChartCompRectBounds();
                }

                this._calculateXYFactors();
                this.stageProperty.calculateThickness();
            }
        }, {
            key: '_calculateMinMaxBounds',
            value: function _calculateMinMaxBounds() {
                // Todo: [Ravindu] This implementation may be rebuild after having indicator because indicator minY, maxY values can be calculated after indicator calculation.
                var that = this;
                var bIndex = Math.round(Math.max(this.calcDP.beginIndex, 0));
                var dataArray = this.calcDP.dataSource;
                var ohlcPoint = void 0,
                    eIndex = void 0,
                    minY = void 0,
                    maxY = void 0,
                    comp = void 0,
                    val = void 0,
                    high = void 0,
                    low = void 0,
                    strategy = void 0,
                    plotInfo = void 0;

                // Todo: [Ravindu] Calculated min max values when processing  chart reqeust. - ohlc-series and other solution can be found at mincustom and maxcustom in pro10
                // Todo: [Ravindu] This calculation can be done on entire ohlc point field list (for in), To exclude unwanted fields from calculation use some sign like (_) to distinguish unwanted fields.

                try {
                    if (!dataArray && dataArray.length === 0) {
                        return false;
                    }

                    eIndex = Math.min(Math.round(that.calcDP.endIndex), dataArray.length - 1);

                    $.each(that.chartComponents, function (index, comp) {
                        // Todo: [Ravindu] Revisit, Check if this implementation can be implemented efficient way in data processing
                        comp.properties.minY = Number.MAX_VALUE;
                        comp.properties.maxY = -Number.MAX_VALUE;
                    });

                    for (var i = bIndex; i <= eIndex; i++) {
                        // Todo: [Ravindu] Reduce nested looping
                        ohlcPoint = dataArray[i];

                        for (var j = 0; j < that.chartComponents.length; j++) {
                            comp = that.chartComponents[j];
                            minY = comp.properties.minY;
                            maxY = comp.properties.maxY;

                            for (var k = 0; k < comp.chartStrategies.length; k++) {
                                strategy = comp.chartStrategies[k];

                                if (strategy.isUsedHighLow) {
                                    // Drawing uses high & low values
                                    high = ohlcPoint['High'];
                                    low = ohlcPoint['Low'];

                                    minY = Math.min(minY, low);
                                    maxY = Math.max(maxY, high);
                                } else {
                                    for (var l = 0; l < strategy.cp.plotInfos.length; l++) {
                                        plotInfo = strategy.cp.plotInfos[l];
                                        val = ohlcPoint[plotInfo.propertyKey];

                                        if (val) {
                                            minY = Math.min(minY, val);
                                            maxY = Math.max(maxY, val);
                                        }
                                    }
                                }
                            }

                            comp.properties.minY = minY;
                            comp.properties.maxY = maxY;
                        }
                    }

                    $.each(that.chartComponents, function (index, comp) {
                        if (comp.properties.minCustomY !== comp.properties.maxCustomY) {
                            comp.properties.minY = comp.properties.minCustomY;
                            comp.properties.maxY = comp.properties.maxCustomY;
                        }

                        if (comp.properties.minY > comp.properties.maxY) {
                            comp.properties.maxY = 1;
                            comp.properties.minY = -1;
                        } else if (comp.properties.minY === comp.properties.maxY) {
                            comp.properties.minY -= 1;
                            comp.properties.maxY += 1;
                        }
                    });
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculating min max bounds ' + e);
                }
            }
        }, {
            key: '_setYAxisWidth',
            value: function _setYAxisWidth() {
                var widthYaxis = _chartCoreConstants.default.YAxisWidth;
                var textGap = 5;

                try {
                    var formMax = _chartFormatters.default.formatToDecimal(this.chartComponents[0].properties.maxY, this.stageProperty.decimals); // Todo: [Ravindu] Consider all chart component max values
                    var maxTxtLen = new PIXI.Text(formMax, this.stageProperty.textStyle).width + textGap; // Support to identify y-axis width

                    widthYaxis = maxTxtLen > _chartCoreConstants.default.YAxisWidth ? maxTxtLen : _chartCoreConstants.default.YAxisWidth;
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Getting max value txt len ' + e);
                }

                try {
                    this.stageProperty.yAxisLeft = 0;
                    this.stageProperty.yAxisRight = 0;

                    switch (this.stageProperty.yAxisPosition) {
                        case _chartCoreConstants.default.YAxisPos.Left:
                            this.stageProperty.yAxisLeft = widthYaxis;
                            break;

                        case _chartCoreConstants.default.YAxisPos.Both:
                            this.stageProperty.yAxisLeft = widthYaxis;
                            this.stageProperty.yAxisRight = widthYaxis;
                            break;

                        default:
                            // Right Position
                            this.stageProperty.yAxisRight = widthYaxis;
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Setting Y Axis width ' + e);
                }
            }
        }, {
            key: '_calculateXYFactors',
            value: function _calculateXYFactors() {
                try {
                    if (this.calcDP.endIndex > this.calcDP.beginIndex) {
                        this.stageProperty.xScale = (this.stageProperty.drawingWd - 2 * this.stageProperty.xClearance) / (this.calcDP.endIndex - this.calcDP.beginIndex); // Containing pixel in 1 data point, getXClearance = to remove border areas
                    } else {
                        this.stageProperty.xScale = 1;
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] calculate x scale ' + e);
                }

                var winPanelHt = void 0;

                try {
                    $.each(this.chartComponents, function (index, comp) {
                        if (comp.properties.maxY > comp.properties.minY) {
                            winPanelHt = comp.properties.ht - _chartCoreConstants.default.DefTitleHeight - 2 * comp.properties.clearance;

                            if (winPanelHt < 2 && winPanelHt > -2 * comp.properties.clearance) {
                                winPanelHt = 2;
                            }

                            // Todo: [Ravindu] Semi-log y scaling

                            comp.properties.yFact = Math.max(winPanelHt / (comp.properties.maxY - comp.properties.minY), 0); // YFactor means how many pixel should be need to show 1 point
                        } else {
                            comp.properties.yFact = 1;
                        }
                    });
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Calculate y scale ' + e);
                }
            }
        }, {
            key: '_calculateMidNights',
            value: function _calculateMidNights(bIndex, eIndex, dataSource) {
                var beginMillis = this.calcDP.getTimeMilliSec(bIndex);
                var endMillis = this.calcDP.getTimeMilliSec(eIndex);
                var searchIndex = 0;

                if (!dataSource && dataSource.length < 0) {
                    return;
                }

                if (!this.calcDP.hasDailyRawData()) {
                    var noOfDays = (this._getMidNight(endMillis) - this._getMidNight(beginMillis)) / _chartCoreConstants.default.TicksPerDay + 1;

                    if (noOfDays > 0) {
                        this.midNights = [noOfDays];

                        var yesdyMidNit = this._getMidNight(beginMillis - _chartCoreConstants.default.TicksPerDay); // To get the yesterday midnigt
                        var timeMillisSlot = void 0;

                        for (var i = 0; i < noOfDays; i++) {
                            timeMillisSlot = yesdyMidNit + _chartCoreConstants.default.TicksPerDay * i; // Gradually increment time millis to begin time

                            try {
                                searchIndex = this.calcDP.indexOfElement(timeMillisSlot);
                            } catch (e) {
                                _utils.default.logger.logError('[pro Chart] Index of element ' + e);
                            }

                            if (searchIndex < 0) {
                                searchIndex = ~searchIndex; // -SearchIndex - 1
                            }

                            this.midNights[i] = searchIndex;
                        }
                    } else {
                        this.midNights = undefined;
                    }
                } else {
                    try {
                        var noOfYears = new Date(endMillis).getFullYear() - new Date(beginMillis).getFullYear() + 1;

                        if (noOfYears > 0) {
                            this.midNights = [noOfYears];

                            var dateOfLstYer = this._getMidNight(beginMillis) - _chartCoreConstants.default.DayBeyondYear * _chartCoreConstants.default.TicksPerDay; // To get a date of last year end (400 days back)
                            var lstYerMidNigt = void 0;

                            for (var j = 0; j < noOfYears; j++) {
                                lstYerMidNigt = this._getMidNight(dateOfLstYer); // To get last year last mid night

                                try {
                                    searchIndex = this.calcDP.indexOfElement(lstYerMidNigt);
                                } catch (e) {
                                    _utils.default.logger.logError('[pro Chart] Index of Element ' + e);
                                }

                                if (searchIndex < 0) {
                                    searchIndex = ~searchIndex; // -searchIndex - 1
                                }

                                this.midNights[j] = searchIndex;

                                dateOfLstYer = lstYerMidNigt + _chartCoreConstants.default.TenDays * _chartCoreConstants.default.TicksPerDay;
                            }
                        } else {
                            this.midNights = undefined;
                        }
                    } catch (e) {
                        _utils.default.logger.logError('[pro Chart] History MidNights ' + e);
                    }
                }
            }
        }, {
            key: '_getMidNight',
            value: function _getMidNight(timeMillis) {
                var date = new Date(timeMillis);

                // Todo: [Ravindu] Check if utc time gives any complications.

                if (this.calcDP.hasMinuteRawData()) {
                    // Minute Raw Data
                    return date.setUTCHours(24, 0, 0, 0); // Mid Night of Given time millis
                } else if (this.calcDP.hasDailyRawData()) {
                    var lstMidNigtYer = new Date();

                    lstMidNigtYer.setFullYear(date.getFullYear() + 1, 0, 1);
                    lstMidNigtYer.setUTCHours(0, 0, 0, 0);

                    return lstMidNigtYer.getTime(); // Return last mid night of year*/
                } else {
                        // Todo: [Ravindu] Tick Time
                    }
            }
        }, {
            key: '_drawAxisesLine',
            value: function _drawAxisesLine() {
                try {
                    if ( /* this.horizLine && */this.vertiLine) {
                        // this.horizLine.clear();
                        this.vertiLine.clear();

                        this.vertiLine.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 0.5, 0);
                        this.vertiLine.moveTo(this.stageProperty.drawingWd, this.stageProperty.yTopClearance);
                        this.vertiLine.lineTo(this.stageProperty.drawingWd, this.stageProperty.drawingHt); // 1 px is used to fill small gap between component bottom line and y axis

                        // this.horizLine.lineStyle(1, ChartUtils.colorToHex(ChartUtils.getStyleOfElement('chart-axis-color', 'color')), 1, 0);

                        // this.horizLine.moveTo(this.stageProperty.yAxisLeft, this.stageProperty.drawingHt);
                        // this.horizLine.lineTo(this.stageProperty.drawingWd, this.stageProperty.drawingHt);

                        // this.renderer.render(this.stage);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Draw Axis lines ' + e);
                }
            }
        }, {
            key: '_drawXAxis',
            value: function _drawXAxis() {
                try {
                    var bestTimePitch = this._getBestTimeInterval(this.calcDP.endIndex - this.calcDP.beginIndex, this.stageProperty.drawingWd - 2 * this.stageProperty.xClearance);
                    var xPointsTextStyle = JSON.parse(JSON.stringify(this.stageProperty.textStyle));

                    xPointsTextStyle.fontWeight = 'bold';
                    this.xAxis.clear();
                    this.verticalGrids.clear();

                    // this.stage.removeChild(this.xAxis); // TODO: [Ravindu] Do it in proper way
                    // this.stage.addChild(this.xAxis);

                    _chartUtils.default.removeParentChildren(this.xAxis);
                    this.xAxis.addChild(this.verticalGrids);

                    this.xAxis.beginFill(0, 0);
                    this.xAxis.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('line-4-color', 'color')), 1, 0);

                    this.verticalGrids.beginFill(0, 0);
                    this.verticalGrids.lineStyle(1, _chartUtils.default.colorToHex(_chartUtils.default.getStyleOfElement('chart-grid-color', 'color')), 0.1, 0); // Same line style for both major and minor points

                    try {
                        if (!this.chartParams.isTimesOnChart) {
                            var majorPoints = this._getMajorPointArray(bestTimePitch);

                            if (majorPoints && majorPoints.length > 0) {
                                var lblDate = new Date();
                                var txtLen = void 0;
                                var lblXpoint = 0;
                                var preX = 10000;
                                var xLbl = void 0;
                                var txt = void 0;
                                var xMajorPos = void 0;

                                for (var i = majorPoints.length - 1; i > -1; i--) {
                                    lblXpoint = Math.round((majorPoints[i] - this.calcDP.beginIndex) * this.stageProperty.xScale);

                                    lblDate.setTime(this.calcDP.getTimeMilliSec(majorPoints[i]));

                                    /* if (!this.calcDP.hasDailyRawData()) {
                                         txt = ChartFormatters.convertDateToHHMM(lblDate);
                                     } else {
                                         txt = ChartFormatters.convertDateTo_ddMMyyyy(lblDate);
                                     }*/

                                    // Todo: [Ravindu] Use meaningfull constants for below hardcoded value

                                    if (!this.calcDP.hasDailyRawData()) {
                                        txt = _chartFormatters.default.convertDateTo_ddMMyyyy(lblDate);
                                    } else {
                                        if (bestTimePitch < 30 && this.calcDP.interval !== _chartCoreConstants.default.HistoryInterval.Monthly) {
                                            txt = _chartFormatters.default.convertDateTo_MMMyyyy(lblDate);
                                        } else {
                                            txt = _chartFormatters.default.convertDateTo_yyyy(lblDate);
                                        }
                                    }

                                    xLbl = new PIXI.Text(txt, xPointsTextStyle);
                                    txtLen = xLbl.width;

                                    if (preX - txtLen > lblXpoint && lblXpoint > -1) {
                                        // Todo: [Ravindu] XLbl adjustment should be based on txt length
                                        this.xAxis.moveTo(lblXpoint, this.stageProperty.drawingHt);
                                        this.xAxis.lineTo(lblXpoint, this.stageProperty.drawingHt + 5);

                                        if (lblXpoint < txtLen / 2) {
                                            xMajorPos = 0;
                                        } else if (lblXpoint > this.stageProperty.drawingWd - txtLen / 2) {
                                            xMajorPos = this.stageProperty.drawingWd - txtLen;
                                        } else {
                                            xMajorPos = lblXpoint - txtLen / 2;
                                        }

                                        xLbl.position.set(xMajorPos, this.stageProperty.drawingHt + xLbl.height + 5);

                                        this.xAxis.addChild(xLbl);

                                        preX = lblXpoint;
                                    }

                                    this.verticalGrids.moveTo(lblXpoint, this.stageProperty.yTopClearance);
                                    this.verticalGrids.lineTo(lblXpoint, this.stageProperty.drawingHt);
                                }
                            }
                        }
                    } catch (e) {
                        _utils.default.logger.logError('[pro Chart] Draw X Axis major labels ' + e);
                    }

                    try {
                        var lastLabelLength = 0,
                            pixiXMinorLbl = void 0;

                        if (bestTimePitch > 0) {
                            var nextTime = this._calculateBeginTime(this.calcDP.getTimeMilliSec(Math.round(this.calcDP.beginIndex)), bestTimePitch);
                            var currTime = void 0;
                            var currPos = Math.round(this.calcDP.beginIndex);
                            var prevPixVal = Math.round((currPos - this.calcDP.beginIndex) * this.stageProperty.xScale) + this.stageProperty.xClearance - _chartCoreConstants.default.Thousand;
                            var currPixVal = void 0;
                            var date = new Date();
                            var timeLineYPos = void 0;
                            var xMinorPos = void 0;

                            while (currPos <= this.calcDP.endIndex) {
                                currTime = this.calcDP.getTimeMilliSec(currPos);

                                if (currTime >= nextTime) {
                                    nextTime = this._getNextPlottingTime(currTime, bestTimePitch);
                                    currPixVal = Math.round((currPos - this.calcDP.beginIndex) * this.stageProperty.xScale);

                                    if (currPixVal >= prevPixVal + lastLabelLength) {
                                        date.setTime(this.calcDP.hasTickRawData() ? currTime / _chartCoreConstants.default.TickMultiplier : currTime);

                                        pixiXMinorLbl = new PIXI.Text(_utils.default.moment(date).format(_chartFormatters.default.getFormatterForXMinor(bestTimePitch, this.calcDP.rawDataType, this.calcDP.interval)), xPointsTextStyle);
                                        lastLabelLength = pixiXMinorLbl.width;
                                        timeLineYPos = /* this.chartParams.isTimesOnChart ? (this.stageProperty.drawingHt - pixiXMinorLbl.height) :*/this.stageProperty.drawingHt;

                                        if (!this._isExceedingDateBoundary(currPixVal + lastLabelLength, currTime) || prevPixVal < 0) {
                                            // Display time of first-day point of Intraday chart
                                            this.xAxis.moveTo(currPixVal, timeLineYPos);
                                            this.xAxis.lineTo(currPixVal, timeLineYPos + 5);

                                            if (currPixVal < lastLabelLength / 2) {
                                                xMinorPos = 0;
                                            } else if (currPixVal > this.stageProperty.drawingWd - lastLabelLength / 2) {
                                                xMinorPos = this.stageProperty.drawingWd - lastLabelLength;
                                            } else {
                                                xMinorPos = currPixVal - lastLabelLength / 2;
                                            }

                                            pixiXMinorLbl.position.set(xMinorPos, timeLineYPos + 5);
                                            this.xAxis.addChild(pixiXMinorLbl);

                                            prevPixVal = currPixVal;

                                            this.verticalGrids.moveTo(currPixVal, this.stageProperty.yTopClearance);
                                            this.verticalGrids.lineTo(currPixVal, this.stageProperty.drawingHt);
                                        }
                                    }
                                }

                                currPos++;
                            }
                        }
                    } catch (e) {
                        _utils.default.logger.logError(' [pro chart] Draw X Axis minor labels ' + e);
                    }

                    this.verticalGrids.endFill();
                    this.xAxis.endFill();
                } catch (e) {
                    _utils.default.logger.logError(' [pro chart] Error in Draw X Axis ' + e);
                }
            }
        }, {
            key: '_getBestTimeInterval',
            value: function _getBestTimeInterval(beginEndDiff, viewWidthPx) {
                var dt = new Date();
                var label = void 0;

                if (!this.calcDP.hasDailyRawData()) {
                    label = _chartFormatters.default.convertDateToHHMM(dt);
                } else {
                    label = _chartFormatters.default.convertDateToDD(dt);
                }

                var bestPixelPitch = new PIXI.Text(label, this.stageProperty.textStyle).width + 2; // Twice label length to give good ux, 2 px for right gap
                var inchDpi = 2 * this.stageProperty.halfInchDpi;

                bestPixelPitch = inchDpi > bestPixelPitch ? inchDpi : bestPixelPitch;

                var pointsPerStrWdthAndIntvl = void 0; // This gives ohlc points count represented by pixel label width and candle consolidation.

                if (!this.calcDP.hasDailyRawData()) {
                    pointsPerStrWdthAndIntvl = beginEndDiff / viewWidthPx * bestPixelPitch * this.calcDP.interval / _chartCoreConstants.default.IntradayInterval.EveryMinute;
                } else {
                    pointsPerStrWdthAndIntvl = beginEndDiff / viewWidthPx * bestPixelPitch * this.calcDP.interval / _chartCoreConstants.default.HistoryInterval.Daily;
                }

                return this._getTheRoundedTimeValue(pointsPerStrWdthAndIntvl);
            }
        }, {
            key: '_getTheRoundedTimeValue',
            value: function _getTheRoundedTimeValue(points) {
                var pitch = 1;

                if (!this.calcDP.hasDailyRawData()) {
                    pitch = _chartCoreConstants.default.CurrentTimePitch[0];

                    for (var i = 0; i < _chartCoreConstants.default.CurrentTimePitch.length; i++) {
                        pitch = _chartCoreConstants.default.CurrentTimePitch[i];

                        if (points <= pitch) {
                            return pitch;
                        }
                    }

                    return pitch;
                } else {
                    pitch = _chartCoreConstants.default.HistoryTimePitch[0];

                    for (var j = 0; j < _chartCoreConstants.default.HistoryTimePitch.length; j++) {
                        pitch = _chartCoreConstants.default.HistoryTimePitch[j];

                        if (points <= pitch) {
                            return pitch;
                        }
                    }

                    return pitch;
                }
            }
        }, {
            key: '_getMajorPointArray',
            value: function _getMajorPointArray(bestTimePitch) {
                // Todo: [Ravindu] Use meaningful constants for below hardcoded value

                if (this.calcDP.hasDailyRawData()) {
                    if (bestTimePitch < 30) {
                        // Days in Month
                        return this._getMonthArray();
                    } else if (bestTimePitch < 360) {
                        // Days in Year
                        return this.midNights;
                    } else {
                        return undefined;
                    }
                }

                return this.midNights;
            }
        }, {
            key: '_getMonthArray',
            value: function _getMonthArray() {
                var recordsPerMillis = (this.calcDP.getTimeMilliSec(this.calcDP.endIndex) - this.calcDP.getTimeMilliSec(this.calcDP.beginIndex)) / _chartCoreConstants.default.TicksPerDay;

                if (recordsPerMillis <= 0) {
                    return undefined;
                }

                var tmp = [recordsPerMillis];
                var count = 0;
                var preMonth = -1;
                var currMonth = -1;
                var date = new Date();

                for (var i = this.calcDP.beginIndex; i <= this.calcDP.endIndex; i++) {
                    date.setTime(this.calcDP.getTimeMilliSec(i));
                    currMonth = _chartFormatters.default.convertDateToYYYYMM(date); // Gets it in the yyyyMM form (easy to compare)

                    if (currMonth > preMonth) {
                        tmp[count] = i;
                        count++;

                        if (count === recordsPerMillis) {
                            break;
                        }

                        preMonth = currMonth;
                    }
                }

                if (count > 0) {
                    var fullArr = [count];

                    for (var j = 0; j < count; j++) {
                        fullArr[j] = tmp[j];
                    }

                    return fullArr;
                }

                return undefined;
            }
        }, {
            key: '_calculateBeginTime',
            value: function _calculateBeginTime(beginIndexTStamp, bestPitch) {
                return Math.floor(beginIndexTStamp / (bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand)) * bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand;
            }
        }, {
            key: '_getNextPlottingTime',
            value: function _getNextPlottingTime(timeStamp, bestPitch) {
                if (!this.calcDP.hasDailyRawData()) {
                    return this._getImmediateRoundedTime(timeStamp, bestPitch) + bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand;
                } else {
                    if (bestPitch < 30) {
                        return this._getImmediateRoundedTime(timeStamp, bestPitch) + bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand;
                    } else if (bestPitch < 360) {
                        return this._getBeginingOfNextMonthsSet(timeStamp, bestPitch);
                    } else {
                        return this._getBeginingOfNextYearsSet(timeStamp, bestPitch);
                    }
                }
            }
        }, {
            key: '_getImmediateRoundedTime',
            value: function _getImmediateRoundedTime(timeStamp, bestPitch) {
                var tmp = timeStamp / (bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand);
                return tmp * bestPitch * this.calcDP.rawDataType * _chartCoreConstants.default.Thousand;
            }
        }, {
            key: '_getBeginingOfNextMonthsSet',
            value: function _getBeginingOfNextMonthsSet(timeStamp, bestPitch) {
                var date = new Date(timeStamp);
                var noOfMonthsInSet = _chartUtils.default.getNoOfPeriodsInSet(bestPitch);
                var adj = noOfMonthsInSet - date.getMonth() % noOfMonthsInSet;

                date.setFullYear(date.getFullYear(), date.getMonth() + adj, 1); // Next month first day of given time stamp's month

                return date.getTime();
            }
        }, {
            key: '_getBeginingOfNextYearsSet',
            value: function _getBeginingOfNextYearsSet(timeStamp, bestPitch) {
                var date = new Date(timeStamp);
                var noOfYearsInSet = _chartUtils.default.getNoOfPeriodsInSet(bestPitch);
                var adj = noOfYearsInSet - date.getFullYear() % noOfYearsInSet;

                date.setFullYear(date.getFullYear() + adj, 0, 1);
                date.setUTCHours(0, 0, 0, 0);

                return date.getTime();
            }
        }, {
            key: '_isExceedingDateBoundary',
            value: function _isExceedingDateBoundary(pixPos, currTime) {
                var searchIndex = 0;

                try {
                    searchIndex = this.calcDP.indexOfElement(this._getMidNight(currTime));
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Index of element ' + e);
                }

                if (searchIndex < 0) {
                    searchIndex = ~searchIndex; // -SearchIndex - 1
                }

                var nextPixVal = (searchIndex - this.calcDP.beginIndex) * this.stageProperty.xScale + this.stageProperty.xClearance;
                return nextPixVal < pixPos;
            }
        }, {
            key: '_loadChartComponents',
            value: function _loadChartComponents() {
                var that = this;
                _utils.default.logger.logInfo('[Drw Path] Started Loading chart components');

                $.each(this.chartComponents, function (index, comp) {
                    comp.loadCharts();
                });

                // Avoiding multiple onAdjustLayout's invocations
                var checkCalculated = void 0;

                var checkFunc = function checkFunc() {
                    var allCalculated = Object.keys(that.calcDP.calculatedStudies).length === 0;

                    $.each(that.calcDP.calculatedStudies, function (index, study) {
                        allCalculated = study.isCalculated;

                        if (!allCalculated) {
                            return allCalculated;
                        }
                    });

                    if (allCalculated) {
                        that.onAdjustLayoutForNewStudy();
                        clearInterval(checkCalculated);
                    }

                    return allCalculated;
                };

                if (!checkFunc()) {
                    // Before periodically checking all calculated status, check all are calculated
                    checkCalculated = setInterval(checkFunc, 20);
                }

                _utils.default.logger.logInfo('[Drw Path] Finished Loading chart components');
            }
        }, {
            key: '_drawChartComponents',
            value: function _drawChartComponents() {
                _utils.default.logger.logInfo('[Drw Path] Started Loading chart drawing');

                $.each(this.chartComponents, function (index, comp) {
                    comp.drawChartComponent();
                });

                _utils.default.logger.logInfo('[Drw Path] Finished Loading chart drawing');
            }
        }, {
            key: '_recalculateChartCompRectBounds',
            value: function _recalculateChartCompRectBounds() {
                var that = this;
                var h = void 0,
                    t = void 0;
                var l = 0; // Todo: [Ravindu] If there is left yaxis then use that value to calculate subwindow position -  widthYaxis_1 + borderWidth;

                $.each(that.chartComponents, function (index, comp) {
                    if (that.subWinSplitters.length <= index + 1) {
                        return false;
                    }

                    t = Math.round(that.subWinSplitters[index] * that.stageProperty.drawingHt) + that.stageProperty.legendHt;
                    h = Math.round((that.subWinSplitters[index + 1] - that.subWinSplitters[index]) * that.stageProperty.drawingHt);

                    comp.setBounds(l, t, that.stageProperty.drawingWd, h, _chartCoreConstants.default.DefTitleHeight);
                    comp.properties.clearance = Math.round(h * _chartCoreConstants.default.ClearancePercentage / 100); // Todo: [Ravindu] Use this clearance to calculate y axis drawing space
                });
            }
        }, {
            key: '_addNewSubWindow',
            value: function _addNewSubWindow(windowOnTop, window) {
                if (this.chartComponents.length < _chartCoreConstants.default.MaxNumOfPanels) {
                    if (this._getCurrIdForPanel(window) < 0) {
                        if (windowOnTop) {
                            window.index = 0;
                            this.chartComponents[0] = window; // Positioning given window on top and making large
                        } else {
                            window.index = this.chartComponents.push(window) - 1;
                        }

                        var newWinSplitters = new Array(this.subWinSplitters.length + 1);
                        var newWinH = 1 / (this.subWinSplitters.length + 2); // Calculate subwindow size by giving large portion to fist window (first subwindow = 1/4)
                        var newRatio = 1 - newWinH; // Large panel ratio, value used for calculating ratio change from prev state to current state
                        var adj = 0;

                        if (windowOnTop) {
                            adj = 1;
                        }

                        for (var i = 0; i < this.subWinSplitters.length; i++) {
                            newWinSplitters[i + adj] = this.subWinSplitters[i] * newRatio + newWinH * adj; // ration is used to calcualte new splitter from old splitter
                        }

                        newWinSplitters[0] = 0;
                        newWinSplitters[newWinSplitters.length - 1] = 1; // splitting is in 0 to 1

                        this.subWinSplitters = newWinSplitters;
                    }
                }

                return window;
            }
        }, {
            key: '_getCurrIdForPanel',
            value: function _getCurrIdForPanel(window) {
                var currWindow = void 0;

                for (var i = 0; i < this.chartComponents.length; i++) {
                    currWindow = this.chartComponents[i];

                    if (currWindow === window) {
                        return i;
                    }
                }

                return -1;
            }
        }, {
            key: '_deleteAddedPanel',
            value: function _deleteAddedPanel(index) {
                try {
                    if (this.subWinSplitters.length > 2) {
                        // splitter should has 2 values (begin - end) when only one chart is available.
                        var newWinSplitters = new Array(this.subWinSplitters.length - 1);
                        var recH = this.subWinSplitters[index + 1] - this.subWinSplitters[index];
                        var newRatio = 1 / (1 - recH);

                        for (var i = index; i < this.subWinSplitters.length - 1; i++) {
                            this.subWinSplitters[i] = this.subWinSplitters[i + 1] - recH;
                        }

                        for (var j = 0; j < newWinSplitters.length; j++) {
                            newWinSplitters[j] = this.subWinSplitters[j] * newRatio;
                        }

                        newWinSplitters[0] = 0;
                        newWinSplitters[newWinSplitters.length - 1] = 1;

                        this.subWinSplitters = newWinSplitters;

                        this.chartComponents.splice(index, 1);
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error -> delete sub windows ' + e);
                }
            }
        }, {
            key: '_getChartComponentStrategyPos',
            value: function _getChartComponentStrategyPos(id) {
                try {
                    var idArr = id.split('-');

                    if (idArr.length > 0) {
                        $.each(this.chartComponents, function (index, comp) {
                            if (comp.index === parseInt(idArr[0], 10)) {
                                idArr[0] = index;
                            }
                        });
                    }

                    return idArr;
                } catch (x) {
                    return [];
                }
            }
        }, {
            key: '_getChartStrategy',
            value: function _getChartStrategy(component, strategyId) {
                try {
                    var strategy = void 0;

                    $.each(component.chartStrategies, function (index, strat) {
                        if (strat.strategyId === strategyId) {
                            strategy = strat;
                            return true;
                        }
                    });

                    return strategy;
                } catch (x) {
                    return [];
                }
            }
        }, {
            key: '_mouseClickEventHandler',
            value: function _mouseClickEventHandler(ev) {
                var chartContainer = $(this.chartContainerClass)[0];
                this.yScaleMouse.mouseDown = ev.data.getLocalPosition(this.stage);

                if (this.selectedLineStudy && this.selectedLineStudy.isEnabled) {
                    try {
                        if (this.selectedLineStudy.isDrawing) {
                            if (chartContainer) {
                                chartContainer.style.cursor = 'default';
                            }

                            this.selectedLineStudy.isEnabled = false;

                            if (this.onFinishedDrawingChart && $.isFunction(this.onFinishedDrawingChart)) {
                                this.onFinishedDrawingChart(_chartCoreConstants.default.chartDrawCallbackTypes.LineStudy, { type: this.selectedLineStudy.cp.name });
                            }

                            this.selectedLineStudy = undefined; // If selectedLineStudy is available crosshair will draw selected line study
                            _utils.default.logger.logInfo('Line study drawing is finsihed.');
                        } else {
                            _utils.default.logger.logInfo('Line study drawing is begun.');
                            this.selectedLineStudy.mouse.startX = this.selectedLineStudy.mouse.x;
                            this.selectedLineStudy.mouse.startY = this.selectedLineStudy.mouse.y;
                            this.selectedLineStudy.isDrawing = true;

                            // this._getMainChartComponent().addStrategy(this.selectedLineStudy);
                            this._getComponentFromXY(this.selectedLineStudy.mouse.startX, this.selectedLineStudy.mouse.startY).addStrategy(this.selectedLineStudy);

                            if (!this.selectedLineStudy.isExpandable) {
                                try {
                                    this.selectedLineStudy.isDrawing = false;

                                    this.selectedLineStudy.setPositionDetails();
                                    this.selectedLineStudy.drawChart();
                                    this.stageProperty.renderer.render(this.stageProperty.stage);

                                    this.selectedLineStudy.isEnabled = false;

                                    if (this.onFinishedDrawingChart && $.isFunction(this.onFinishedDrawingChart)) {
                                        this.onFinishedDrawingChart(_chartCoreConstants.default.chartDrawCallbackTypes.LineStudy, { type: this.selectedLineStudy.cp.name });
                                    }

                                    this.selectedLineStudy = undefined; // If selectedLineStudy is available crosshair will draw selected line study
                                    _utils.default.logger.logInfo('Line study drawing is finsihed.');
                                } catch (e) {
                                    _utils.default.logger.logError('[Pro Chart] Error in non expandable line studies.');
                                }
                            } else if (chartContainer) {
                                chartContainer.style.cursor = 'crosshair';
                            }
                        }
                    } catch (e) {
                        _utils.default.logger.logError('[Pro Chart] Error in line studies.');
                    }
                }
            }
        }, {
            key: '_mouseReleasedEventHandler',
            value: function _mouseReleasedEventHandler(ev) {
                this.yScaleMouse.mouseUp = ev.data.getLocalPosition(this.stage);

                if (this.isYAxisRescaling) {
                    this.isYAxisRescaling = false;
                    this._rescaleYAxis();
                }
            }
        }, {
            key: '_rescaleYAxis',
            value: function _rescaleYAxis() {
                var x = this.yScaleMouse.mouseDown.x;
                var yDown = this.yScaleMouse.mouseDown.y;
                var yUp = this.yScaleMouse.mouseUp.y;
                var component = this._getComponentFromXY(x, yDown);

                if (component) {
                    var yCent = component.properties.y + (component.properties.ht + _chartCoreConstants.default.DefTitleHeight) / 2; // Determining center point
                    var compMin = component.properties.minY;
                    var compMax = component.properties.maxY;

                    try {
                        if (yDown > yCent) {
                            // Rescale section between y1 and top of the panel
                            // MaxY remains unchanged

                            var yMax = component.properties.y + _chartCoreConstants.default.DefTitleHeight;

                            yUp = yUp <= yMax ? yMax + 1 : yUp;

                            // Todo: [Ravindu] Semi Log

                            component.properties.minCustomY = compMax - (compMax - compMin) * (yDown - yMax) / (yUp - yMax);
                            component.properties.maxCustomY = compMax;
                        } else {
                            // Rescale section between y1 and bottom of the panel
                            // MinY remains unchanged

                            var yMin = component.properties.y + component.properties.ht;

                            yUp = yUp >= yMin ? yMin - 1 : yUp;

                            // Todo: [Ravindu] Semi Log

                            component.properties.maxCustomY = compMin + (compMax - compMin) * (yMin - yDown) / (yMin - yUp);
                            component.properties.minCustomY = compMin;
                        }

                        this.onRevalidateChart(true);
                    } catch (e) {
                        _utils.default.logger.logError('[Pro Chart] Error in rescale y axis', e);
                    }
                }
            }
        }, {
            key: '_getLocalizePosition',
            value: function _getLocalizePosition(target, event) {
                var correctionX = target.getBoundingClientRect().left;
                var correctionY = target.getBoundingClientRect().top;

                return { x: event.clientX - correctionX, y: event.clientY - correctionY };
            }
        }, {
            key: '_mouseMoveEventHandler',
            value: function _mouseMoveEventHandler(ev) {
                var event = void 0;
                var chartContainer = $(this.chartContainerClass)[0];

                if (this.chartParams.isMobile) {
                    event = this._getLocalizePosition(ev.target, ev.touches[0]);
                } else {
                    event = ev.data.getLocalPosition(this.stage);
                }

                if (chartContainer) {
                    chartContainer.style.cursor = this.crosshair && this.crosshair.isEnabled ? 'crosshair' : 'default';
                }

                this.isYAxisRescaling = false;

                // utils.logger.logInfo('[Drag] stage - move x - ' + event.x + ', y - ' + event.y);

                if (this.pointOnChartFN && $.isFunction(this.pointOnChartFN)) {
                    try {
                        // let mouseXIndex = Math.round(PixelConversion.getIndexForThePixel(event.x, this._getMainChartComponent().properties, this.stageProperty, this.calcDP));
                        // const dataSource = this.calcDP.dataSource;
                        var point = this.calcDP.dataSource[Math.round(_pixelConversion.default.getIndexForThePixel(event.x, this._getMainChartComponent().properties, this.stageProperty, this.calcDP))];

                        /* for (let i = mouseXIndex; i < dataSource.length; i++) {
                            point = dataSource[i];
                              if (point && point['Close']) {
                                break;
                            }
                              point = undefined;
                        }*/

                        if (!(point && point['Close'])) {
                            point = undefined;
                        }

                        this.pointOnChartFN(point);
                        /* if (point) {
                            this.pointOnChartFN(point);
                        }*/
                    } catch (e) {
                        _utils.default.logger.logError('Error in Point On Chart ' + e);
                    }
                }

                if (this.selectedLineStudy && this.selectedLineStudy.isEnabled || this.crosshair && this.crosshair.isEnabled) {
                    var studyArr = [this.selectedLineStudy, this.crosshair];

                    $.each(studyArr, function (index, study) {
                        if (study) {
                            study.mouse.x = event.x;
                            study.mouse.y = event.y;

                            if (study.isDrawing) {
                                study.setPositionDetails();
                                study.drawChart();
                            }
                        }
                    });
                }

                if (this._isOnYaxis(event.x, event.y)) {
                    this.isYAxisRescaling = true;

                    if (chartContainer) {
                        chartContainer.style.cursor = 'n-resize';
                    }
                }
            }
        }, {
            key: 'mouseWheelEventHandler',
            value: function mouseWheelEventHandler(e) {
                // Cross-browser wheel delta
                var event = window.event || e;
                var delta = Math.max(-1, Math.min(1, event.wheelDelta || -event.detail));
                var pixiPoint = this.renderer.plugins.interaction.mouse.global;

                if (delta > 0) {
                    this.applyZoomOut(pixiPoint.x, delta);
                } else {
                    this.applyZoomIn(pixiPoint.x, delta); // Zoom down
                }

                return false;
            }
        }, {
            key: 'applyZoomIn',
            value: function applyZoomIn(x, delta) {
                var dataSource = this.calcDP.dataSource;
                var adjAmount = Math.abs(delta / 3 * (this.calcDP.endIndex - this.calcDP.beginIndex));
                var mainChartComponent = this._getMainChartComponent();
                var drawingWd = this.stageProperty.drawingWd;
                var leftWdPX = x - mainChartComponent.properties.x;
                var rightWdPX = drawingWd - leftWdPX;

                this.calcDP.beginIndex = Math.min(this.calcDP.beginIndex + leftWdPX * adjAmount / drawingWd, dataSource.length - 1);
                this.calcDP.endIndex = Math.min(this.calcDP.endIndex - rightWdPX * adjAmount / drawingWd, dataSource.length - 1);
                this.calcDP.isZoomedDataArray = true;

                if (dataSource.length > 1 && this.calcDP.endIndex - this.calcDP.beginIndex < 1) {
                    this.calcDP.beginIndex = 0;
                    this.calcDP.endIndex = dataSource.length - 1;
                }

                this.calcDP.beginIndex = this.calcDP.beginIndex > 0 ? Math.floor(this.calcDP.beginIndex) : 0;
                this.calcDP.endIndex = Math.ceil(this.calcDP.endIndex);

                _utils.default.logger.logInfo('Zoom out - begin - ' + this.calcDP.beginIndex + ' - end - ' + this.calcDP.endIndex);

                if (this.calcDP.endIndex - this.calcDP.beginIndex > 1) {
                    this.onRevalidateChart(false);
                }
            }
        }, {
            key: 'applyZoomOut',
            value: function applyZoomOut(x, delta) {
                if (this.calcDP.isZoomedDataArray) {
                    var dataSource = this.calcDP.dataSource;
                    var adjAmount = Math.abs(delta / 3 * (this.calcDP.endIndex - this.calcDP.beginIndex));
                    var mainChartComponent = this._getMainChartComponent();
                    var drawingWd = this.stageProperty.drawingWd;
                    var leftWdPX = x - mainChartComponent.properties.x;
                    var rightWdPX = drawingWd - leftWdPX;

                    this.calcDP.beginIndex = Math.min(this.calcDP.beginIndex - rightWdPX * adjAmount / drawingWd, dataSource.length - 1);
                    this.calcDP.endIndex = Math.min(this.calcDP.endIndex + leftWdPX * adjAmount / drawingWd, dataSource.length - 1);

                    if (dataSource.length > 1 && this.calcDP.endIndex - this.calcDP.beginIndex < 1) {
                        this.calcDP.beginIndex = 0;
                        this.calcDP.endIndex = dataSource.length - 1;
                    }

                    this.calcDP.beginIndex = this.calcDP.beginIndex > 0 ? Math.floor(this.calcDP.beginIndex) : 0;
                    this.calcDP.endIndex = Math.ceil(this.calcDP.endIndex);

                    _utils.default.logger.logInfo('Zoom In - begin - ' + this.calcDP.beginIndex + ' - end - ' + this.calcDP.endIndex);

                    if (this.calcDP.beginIndex < 5 && dataSource.length - this.calcDP.endIndex < 5) {
                        this.calcDP.beginIndex = 0;
                        this.calcDP.endIndex = dataSource.length - 1;
                        this.calcDP.isZoomedDataArray = false;
                    }

                    this.onRevalidateChart(false);
                }
            }
        }, {
            key: 'onResetZoom',
            value: function onResetZoom() {
                var dataSource = this.calcDP.dataSource;

                this.calcDP.beginIndex = 0;
                this.calcDP.endIndex = dataSource.length - 1;
                this.calcDP.isZoomedDataArray = false; // Doesn't keeps applied zoom level

                _utils.default.logger.logInfo('Zoom Reset - begin - ' + this.calcDP.beginIndex + ' - end - ' + this.calcDP.endIndex);

                this.onResetYDragZoom();
                this.onRevalidateChart(true);
            }
        }, {
            key: 'onResetYDragZoom',
            value: function onResetYDragZoom() {
                $.each(this.chartComponents, function (index, comp) {
                    comp.properties.minCustomY = 0;
                    comp.properties.maxCustomY = 0;
                });
            }
        }, {
            key: 'onCenterZoom',
            value: function onCenterZoom(option) {
                try {
                    var midXPos = this._getMainChartComponent().properties.wd / 2;

                    switch (option) {
                        case _chartCoreConstants.default.ZoomOption.In:
                            this.applyZoomIn(midXPos, 1);
                            break;

                        case _chartCoreConstants.default.ZoomOption.Out:
                            this.applyZoomOut(midXPos, 1);
                            break;

                        default:
                            this.onResetZoom();
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error In On Center Zoom ' + e);
                }
            }
        }, {
            key: '_isOnYaxis',
            value: function _isOnYaxis(x, y) {
                var isOnYAxis = false;

                $.each(this.chartComponents, function (index, comp) {
                    if (comp.properties.y + _chartCoreConstants.default.DefTitleHeight <= y && comp.properties.y + comp.properties.ht >= y) {
                        // Checking left Y Axis

                        if (this.stageProperty.yAxisPosition === _chartCoreConstants.default.YAxisPos.Left || this.stageProperty.yAxisPosition === _chartCoreConstants.default.YAxisPos.Both) {
                            if (comp.properties.x - this.stageProperty.yAxisLeft <= x && comp.properties.x >= x) {
                                isOnYAxis = true;
                                return isOnYAxis;
                            }
                        }

                        // Checking right Y Axis

                        if (this.stageProperty.yAxisPosition === _chartCoreConstants.default.YAxisPos.Right || this.stageProperty.yAxisPosition === _chartCoreConstants.default.YAxisPos.Both) {
                            if (comp.properties.x + comp.properties.wd <= x && comp.properties.x + comp.properties.wd + this.stageProperty.yAxisRight >= x) {
                                isOnYAxis = true;
                                return isOnYAxis;
                            }
                        }
                    }
                });

                return isOnYAxis;
            }
        }, {
            key: '_getComponentFromXY',
            value: function _getComponentFromXY(x, y) {
                var component = void 0;

                $.each(this.chartComponents, function (index, comp) {
                    if (comp.properties.y <= y && comp.properties.y + comp.properties.ht > y) {
                        component = comp;
                        return true;
                    }
                });

                return component;
            }
        }]);

        return StockGraph;
    }();

    exports.default = StockGraph;
});
define('universal-app/controllers/chart/core/utils/chart-core-constants', ['exports'], function (exports) {
    'use strict';

    exports.default = {
        // Todo: [Ravindu] Remove unused and duplicate constants

        TicksPerDay: 86400000, // 3600 * 24 * 1000 - milliseconds per day
        LongMaxVal: 0x7fffffffffffffff,
        IntegerMaxVal: 0x7fffffff,
        Billion: 1000000000,
        Million: 1000000,
        Thousand: 1000,
        DaysInNormalYear: 365,
        DaysInNormalMonth: 30,
        DayBeyondYear: 400,
        TenDays: 10,
        MaxNumOfPanels: 10,
        MinDrawingWidth: 20,
        MinDrawingHeight: 20,
        ClearancePercentage: 4,
        VertiClearance: 6,
        DefTitleHeight: 14,
        YAxisWidth: 30,
        YAxisWdMaxAdjAtmpt: 2,
        // yAxisLblGap: 8
        ChartRefreshTimeInterval: 30000, // n * 1000 - n number of seconds
        ChartWaitInterval: 1000,
        TickMultiplier: 10000,
        PriceVolPitch: [1, 2, 2.5, 4, 5],
        StringConcat: '~',

        CurrentTimePitch: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60, // day by day - 13 nos
        90, 120, 180, 240, 300, 360, 480, 600, 1440, 2880, 4320, 5760, 7200],

        HistoryTimePitch: [1, 2, 3, 4, 5, 7, 30, 60, 90, 120, 365, 365 * 2, 365 * 4, 365 * 5, 365 * 10, 365 * 20], // day to year - 13 nos

        MonthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

        RawDataType: {
            Minute: 60,
            Daily: 86400, // 3600 * 24
            Tick: 1
        },

        IntradayInterval: {
            Every60Minutes: 60 * 60,
            Every30Minutes: 30 * 60,
            Every15Minutes: 15 * 60,
            Every10Minutes: 10 * 60,
            Every5Minutes: 5 * 60,
            EveryMinute: 60
        },

        HistoryInterval: {
            Yearly: 365 * 24 * 3600,
            Quarterly: 365 * 6 * 3600,
            Monthly: 30 * 24 * 3600,
            Weekly: 7 * 24 * 3600,
            Daily: 24 * 3600
        },

        TimeFormat: {
            ChartTimeLineTime: 'HH:mm'
        },

        DateFormat: {
            ChartTimeLineDate: 'dd'
        },

        YAxisPos: {
            Left: 0,
            Right: 1,
            Both: 2
        },

        OHLCPriority: {
            Open: 1,
            High: 2,
            Low: 3,
            Close: 4,
            Volume: 5,
            Turnover: 6
        },

        WeekBeginAdjustment: { // Todo: [Ravindu] Need to clarify this zero based index where does it come from.
            Adj_Monday: 4 * 24 * 3600,
            Adj_Tuesday: 5 * 24 * 3600,
            Adj_Wednesday: 6 * 24 * 3600,
            Adj_Thursday: 0, // 0 * 24 * 3600
            Adj_Friday: 24 * 3600, // 1 * 24 * 3600
            Adj_Saturday: 2 * 24 * 3600,
            Adj_Sunday: 3 * 24 * 3600
        },

        ChartStyle: {
            Area: {
                ID: 1,
                LanguageTag: 'chartArea',
                Icon: 'icon-area-chart',
                ChartType: 'area'
            },
            Candle: {
                ID: 2,
                LanguageTag: 'chartCandle',
                Icon: 'icon-candle-chart-fill',
                ChartType: 'candle'
            },
            Bar: {
                ID: 3,
                LanguageTag: 'chartBar',
                Icon: 'icon-bar-chart',
                ChartType: 'bar'
            },
            Line: {
                ID: 4,
                LanguageTag: 'chartLine',
                Icon: 'icon-line-chart-new',
                ChartType: 'line'
            },
            CandleWithTrend: {
                ID: 5,
                LanguageTag: 'chartCandleWithTrend',
                Icon: 'icon-candle-chart-trend',
                ChartType: 'hollow_candle'
            },
            Histogram: {
                ID: 6,
                LanguageTag: 'chartHisto',
                Icon: 'icon-bar-chart',
                ChartType: 'histo'
            },
            OHLC: {
                ID: 7,
                LanguageTag: 'chartOHLC',
                Icon: 'icon-ohlc',
                ChartType: 'ohlc'
            },
            Point: {
                ID: 7,
                LanguageTag: 'chartPoint',
                Icon: 'icon-ohlc',
                ChartType: 'point'
            }
        },

        ProChartViewStyle: ['Area', 'Candle', 'Line', 'CandleWithTrend', 'OHLC'],

        ChartCategory: {
            Intraday: {
                ID: 0,
                LanguageTag: 'chartIntraday',
                Icon: 'chart-graph-tb-intraday',
                DefaultChartViewPeriod: 'OneDay',
                RowTickFormat: 60,
                DefaultDataRequestDuration: 5 // five days
            },
            History: {
                ID: 1,
                LanguageTag: 'chartHistory',
                Icon: 'chart-graph-tb-history',
                DefaultChartViewPeriod: 'OneYear',
                RowTickFormat: 86400,
                DefaultDataRequestDuration: 20 // two years
            }
        },
        // Capacity of data request
        ChartDataLevel: {
            IntradayCurrentDay: 1,
            IntradayFiveDay: 2,
            IntradayOneMonth: 3,
            IntradayCustom: 4,
            HistoryTwoYear: 5,
            HistoryTenYear: 6,
            HistoryTwentyYear: 7,
            HistoryCustom: 8
        },

        ChartDataRequestMode: {
            Intraday5DayHistory: 1,
            IntradayActiveStock: 2,
            HistoryData: 3
        },

        ChartDefaultDataPeriod: {
            Year: 365,
            Month: 30,
            TwoDay: 2,
            FiveDay: 5,
            OneDay: 1,
            MilliSecondsPerDay: 86400000 // = 1000 * 60 * 60 * 24
        },

        ChartDataType: {
            Basic: 3,
            CorporateAction: 5
        },

        ChartViewInterval: {
            EveryMinutes: {
                LanguageTag: 'chartEveryMinute',
                ID: 1,
                Value: 1,
                PerSeconds: 60,
                IsHistory: false
            },
            EveryFiveMinutes: {
                LanguageTag: 'chartEvery5Minutes',
                ID: 2,
                Value: 5,
                PerSeconds: 5 * 60,
                IsHistory: false
            },
            EveryTenMinutes: {
                LanguageTag: 'chartEvery10Minutes',
                ID: 3,
                Value: 10,
                PerSeconds: 10 * 60,
                IsHistory: false
            },
            EveryFiftyMinutes: {
                LanguageTag: 'chartEvery15Minutes',
                ID: 4,
                Value: 15,
                PerSeconds: 15 * 60,
                IsHistory: false
            },
            EveryThirtyMinutes: {
                LanguageTag: 'chartEvery30Minutes',
                ID: 5,
                Value: 30,
                PerSeconds: 30 * 60,
                IsHistory: false
            },
            EverySixtyMinutes: {
                LanguageTag: 'chartEvery60Minutes',
                ID: 6,
                Value: 60,
                PerSeconds: 60 * 60,
                IsHistory: false
            },
            Daily: {
                LanguageTag: 'chartDaily',
                ID: 7,
                Value: 1,
                PerSeconds: 24 * 3600, // 1 * 24 * 3600
                IsHistory: true
            },
            Weekly: {
                LanguageTag: 'chartWeekly',
                ID: 8,
                Value: 7,
                PerSeconds: 7 * 24 * 3600,
                IsHistory: true
            },
            Monthly: {
                LanguageTag: 'chartMonthly',
                ID: 9,
                Value: 30,
                PerSeconds: 30 * 24 * 3600,
                IsHistory: true
            },
            Quarterly: {
                LanguageTag: 'chartQuarterly',
                ID: 4,
                Value: 90,
                PerSeconds: 365 * 6 * 3600,
                IsHistory: true
            },
            Yearly: {
                LanguageTag: 'chartYearly',
                ID: 10,
                Value: 365,
                PerSeconds: 365 * 24 * 3600,
                IsHistory: true
            }
        },

        ChartViewPeriod: {
            OneDay: {
                DisplayName: '1D',
                ID: 0,
                IsHistory: false,
                ChartDataLevel: 1,
                DefaultInterval: 'EveryMinutes', // ChartInterval.Intraday.EveryMinutes
                title: 'oneDay'
            },
            TwoDay: {
                DisplayName: '2D',
                ID: 1,
                IsHistory: false,
                ChartDataLevel: 2,
                DefaultInterval: 'EveryMinutes', // ChartInterval.Intraday.EveryMinutes
                title: 'twoDays'
            },
            FiveDay: {
                DisplayName: '5D',
                ID: 2,
                IsHistory: false,
                ChartDataLevel: 2,
                DefaultInterval: 'EveryMinutes', // ChartInterval.Intraday.EveryMinutes
                title: 'fiveDays'
            },
            OneMonth: {
                DisplayName: '1M',
                ID: 3,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'oneMonth'
            },
            ThreeMonth: {
                DisplayName: '3M',
                ID: 4,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'threeMonths'
            },
            SixMonth: {
                DisplayName: '6M',
                ID: 5,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'sixMonths'
            },
            YTD: {
                DisplayName: 'YTD',
                ID: 6,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'yearToDate'
            },
            OneYear: {
                DisplayName: '1Y',
                ID: 7,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'oneYear'
            },
            TwoYear: {
                DisplayName: '2Y',
                ID: 8,
                IsHistory: true,
                ChartDataLevel: 5,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'twoYears'
            },
            ThreeYear: {
                DisplayName: '3Y',
                ID: 9,
                IsHistory: true,
                ChartDataLevel: 6,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'threeYears'
            },
            FiveYear: {
                DisplayName: '5Y',
                ID: 10,
                IsHistory: true,
                ChartDataLevel: 6,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'fiveYears'
            },
            TenYear: {
                DisplayName: '10Y',
                ID: 11,
                IsHistory: true,
                ChartDataLevel: 6,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'tenYears'
            },
            All: {
                DisplayName: 'MAX',
                ID: 12,
                IsHistory: true,
                ChartDataLevel: 7,
                DefaultInterval: 'Daily', // ChartInterval.History.Daily
                title: 'maximum'
            },
            Custom: {
                DisplayName: '*',
                ID: 13,
                IsHistory: true,
                ChartDataLevel: 8,
                DefaultInterval: 'EveryMinutes', // ChartInterval.Intraday.EveryMinutes
                title: 'custom'
            }
        },

        // TODO: [Amila] Move below definition to a place where layout related configs are placed
        DetaiQuoteChartPeriodTab: {
            OneDay: true,
            TwoDay: true,
            FiveDay: false,
            OneMonth: true,
            ThreeMonth: true,
            SixMonth: true,
            YTD: false,
            OneYear: false,
            TwoYear: false,
            ThreeYear: false,
            FiveYear: false,
            TenYear: false,
            All: false,
            Custom: false
        },

        // TODO: [Amila] Move below definition to a place where layout related configs are placed
        ProChartPeriodTab: {
            OneDay: true,
            TwoDay: true,
            FiveDay: false,
            OneMonth: true,
            ThreeMonth: true,
            SixMonth: true,
            YTD: true,
            OneYear: true,
            TwoYear: true,
            ThreeYear: false,
            FiveYear: false,
            TenYear: true,
            All: true,
            Custom: false
        },

        MobileQuoteChartPeriodTab: {
            OneDay: true,
            TwoDay: true,
            FiveDay: false,
            OneMonth: true,
            ThreeMonth: false,
            SixMonth: true,
            YTD: false,
            OneYear: true,
            TwoYear: true,
            ThreeYear: false,
            FiveYear: false,
            TenYear: false,
            All: false,
            Custom: false
        },

        ProChartViewInterval: {
            EveryMinutes: true,
            EveryFiveMinutes: true,
            EveryTenMinutes: true,
            EveryFiftyMinutes: true,
            EveryThirtyMinutes: true,
            EverySixtyMinutes: true,
            Daily: true,
            Weekly: true,
            Monthly: true,
            Quarterly: true,
            Yearly: true
        },

        ProChartGridStyle: {
            Both: {
                ID: 0,
                LanguageTag: 'chartGridBoth',
                Icon: 'icon-chart-both'
            },
            None: {
                ID: 1,
                LanguageTag: 'chartGridNone',
                Icon: 'icon-chart-none'
            },
            Horizontal: {
                ID: 2,
                LanguageTag: 'chartGridHoriz',
                Icon: 'icon-chart-horizontal'
            },
            Vertical: {
                ID: 3,
                LanguageTag: 'chartGridVerti',
                Icon: 'icon-chart-vertical'
            }
        },

        ChartGAActions: {
            indAdded: 'indiacator-added',
            compare: 'compare'
        },

        ChartComponentType: {
            Main: 0,
            Sub: 1
        },

        ChartTimeFormat: {
            TimeHHMM: 'HH:mm',
            DateDD: 'DD',
            DateMMM: 'MMM',
            DateYYYY: 'YYYY',
            TimeTick: 'HH:mm:ss'
        },

        ChartStudyType: {
            Base: 0,
            Compare: 1,
            Indicator: 2,
            LineStudy: 3
        },

        OHLCFields: {
            Open: 'Open',
            High: 'High',
            Low: 'Low',
            Close: 'Close'
        },

        ZoomOption: {
            In: 'In',
            Out: 'Out'
        },

        LineStudyTypes: {
            Rectangle: 'rectangle',
            Ellipse: 'ellipse',
            Trend: 'trend',
            Horizontal: 'horizontal',
            Vertical: 'vertical',
            CrossHair: 'crosshair',
            LastValue: 'last-val',
            Point: 'Point'
        },

        chartDrawCallbackTypes: {
            LineStudy: 'lineStudyCallback'
        }
    };
});
define('universal-app/controllers/chart/core/utils/chart-formatters', ['exports', './chart-core-constants'], function (exports, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartFormatters = function () {
        function ChartFormatters() {
            _classCallCheck(this, ChartFormatters);
        }

        _createClass(ChartFormatters, null, [{
            key: 'convertDateToHHMM',
            value: function convertDateToHHMM(date) {
                if (!date) {
                    return undefined;
                }

                return [this._fillDateString(date.getHours()), ':', this._fillDateString(date.getMinutes())].join('');
            }
        }, {
            key: 'convertDateToDD',
            value: function convertDateToDD(date) {
                if (!date) {
                    return undefined;
                }

                return this._fillDateString(date.getDate());
            }
        }, {
            key: 'convertDateToYYYYMM',
            value: function convertDateToYYYYMM(date) {
                if (!date) {
                    return undefined;
                }

                return [this._fillDateString(date.getFullYear()), this._fillDateString(date.getMonth() + 1)].join('');
            }
        }, {
            key: 'convertDateTo_ddMMyyyy',
            value: function convertDateTo_ddMMyyyy(date) {
                if (!date) {
                    return undefined;
                }

                return [this._fillDateString(date.getDate()), this._fillDateString(date.getMonth() + 1), this._fillDateString(date.getFullYear())].join(' ');
            }
        }, {
            key: 'convertDateTo_yyyy',
            value: function convertDateTo_yyyy(date) {
                if (!date) {
                    return undefined;
                }

                return this._fillDateString(date.getFullYear());
            }
        }, {
            key: 'convertDateTo_MMMyyyy',
            value: function convertDateTo_MMMyyyy(date) {
                if (!date) {
                    return undefined;
                }

                return [_chartCoreConstants.default.MonthNames[date.getMonth()], date.getFullYear()].join(' ');
            }
        }, {
            key: '_fillDateString',
            value: function _fillDateString(value) {
                return (value < 10 ? '0' : '') + value;
            }
        }, {
            key: 'isLeapYear',
            value: function isLeapYear(year) {
                return new Date(year, 1, 29).getMonth() === 1;
            }
        }, {
            key: 'dayOfYear',
            value: function dayOfYear(date) {
                var start = new Date(date.getFullYear(), 0, 0);
                var diff = date - start;
                return Math.floor(diff / _chartCoreConstants.default.TicksPerDay);
            }
        }, {
            key: 'formatToDecimal',
            value: function formatToDecimal(val, decimal) {
                return parseFloat(Math.round(val * 100) / 100).toFixed(decimal);
            }
        }, {
            key: 'getDecimalFormatter',
            value: function getDecimalFormatter(allowedPitch) {
                var decimals = 9;
                var inputPitch = this.formatToDecimal(allowedPitch, decimals);

                while (inputPitch.lastIndexOf('0') === inputPitch.length - 1) {
                    inputPitch = inputPitch.substring(0, inputPitch.length - 1);
                    decimals--;
                }

                var finalDecimls = 0;

                if (decimals > 0) {
                    finalDecimls = 2; // Default price decimals

                    for (var i = 2; i < decimals; i++) {
                        finalDecimls++;
                    }
                }

                return finalDecimls;
            }
        }, {
            key: 'getFormatterForXMinor',
            value: function getFormatterForXMinor(bestXTimePitch, rawDataType, interval) {
                if (rawDataType === _chartCoreConstants.default.RawDataType.Minute) {
                    return _chartCoreConstants.default.ChartTimeFormat.TimeHHMM;
                } else if (rawDataType === _chartCoreConstants.default.RawDataType.Daily) {
                    if (bestXTimePitch < 30 && interval !== _chartCoreConstants.default.HistoryInterval.Monthly) {
                        return _chartCoreConstants.default.ChartTimeFormat.DateDD;
                    } else if (bestXTimePitch < 360) {
                        return _chartCoreConstants.default.ChartTimeFormat.DateMMM;
                    } else {
                        return _chartCoreConstants.default.ChartTimeFormat.DateYYYY;
                    }
                } else {
                    return _chartCoreConstants.default.ChartTimeFormat.TimeTick;
                }
            }
        }]);

        return ChartFormatters;
    }();

    exports.default = ChartFormatters;
});
define('universal-app/controllers/chart/core/utils/chart-studies', ['exports'], function (exports) {
    'use strict';

    exports.default = {
        Indicators: {
            MovingAverage: {
                ID: 1,
                LanguageTag: 'chartIndiMV',
                Category: 1,
                ChartIndID: 'MA'
            },
            TimeSeriesForecast: {
                ID: 2,
                LanguageTag: 'chartIndiTSF',
                Category: 1,
                ChartIndID: 'Time Fcst'
            },
            WildersSmoothing: {
                ID: 3,
                LanguageTag: 'chartIndiWS',
                Category: 1,
                ChartIndID: 'Wilders Smoothing'
            },
            BollingerBands: {
                ID: 4,
                LanguageTag: 'chartIndiBB',
                Category: 2,
                ChartIndID: 'BB'
            },
            AccumulationDistribution: {
                ID: 5,
                LanguageTag: 'chartIndiAcDe',
                Category: 3,
                ChartIndID: 'W Acc Dist'
            },
            AverageTrueRange: {
                ID: 6,
                LanguageTag: 'chartIndiATR',
                Category: 3,
                ChartIndID: 'ATR'
            },
            ChandeMomentumOscillator: {
                ID: 7,
                LanguageTag: 'chartIndiCMO',
                Category: 3,
                ChartIndID: 'Chande Mtm'
            },
            CommodityChannelIndex: {
                ID: 8,
                LanguageTag: 'chartIndiCCI',
                Category: 3,
                ChartIndID: 'CCI'
            },
            DirectionalMovementPlusDI: {
                ID: 9,
                LanguageTag: 'chartIndiDMPlusDI',
                Category: 3,
                ChartIndID: '+DI'
            },
            DirectionalMovementMinusDI: {
                ID: 10,
                LanguageTag: 'chartIndiDMMinDI',
                Category: 3,
                ChartIndID: '-DI'
            },
            DirectionalMovementADX: {
                ID: 11,
                LanguageTag: 'chartIndiDMA',
                Category: 3,
                ChartIndID: 'ADX'
            },
            DirectionalMovementADXR: {
                ID: 12,
                LanguageTag: 'chartIndiDMADXR',
                Category: 3,
                ChartIndID: 'ADXR'
            },
            DirectionalMovementDX: {
                ID: 13,
                LanguageTag: 'chartIndiDMDX',
                Category: 3,
                ChartIndID: 'DX'
            },
            MACD: {
                ID: 14,
                LanguageTag: 'chartIndiMACD',
                Category: 3,
                ChartIndID: 'MACD'
            },
            Momentum: {
                ID: 15,
                LanguageTag: 'chartIndiMomentum',
                Category: 3,
                ChartIndID: 'Momentum'
            },
            MoneyFlowIndex: {
                ID: 16,
                LanguageTag: 'chartIndiMFI',
                Category: 3,
                ChartIndID: 'M Flow'
            },
            RelativeStrengthIndex: {
                ID: 17,
                LanguageTag: 'chartIndiRSI',
                Category: 3,
                ChartIndID: 'RSI'
            },
            StochasticOscillator: {
                ID: 18,
                LanguageTag: 'chartIndiSO',
                Category: 3,
                ChartIndID: 'Stochastics'
            },
            WilliamsPerR: {
                ID: 19,
                LanguageTag: 'chartIndiWPerR',
                Category: 3,
                ChartIndID: 'Williams %R'
            },
            ChaikinMF: {
                ID: 20,
                LanguageTag: 'chartIndChaikinMF',
                Category: 3,
                ChartIndID: 'Chaikin MF'
            },
            PSAR: {
                ID: 21,
                LanguageTag: 'chartIndPSAR',
                Category: 3,
                ChartIndID: 'PSAR'
            },
            TRIX: {
                ID: 22,
                LanguageTag: 'chartIndTRIX',
                Category: 3,
                ChartIndID: 'TRIX'
            },
            VolOsc: {
                ID: 23,
                LanguageTag: 'chartIndVolOsc',
                Category: 3,
                ChartIndID: 'Vol Osc'
            },
            STD_DEV: {
                ID: 24,
                LanguageTag: 'chartIndStdDev',
                Category: 3,
                ChartIndID: 'std_dev'
            },
            Gen_Env: {
                ID: 25,
                LanguageTag: 'chartIndStdDev',
                Category: 3,
                ChartIndID: 'std_dev'
            },
            Vol: {
                ID: 26,
                LanguageTag: 'vchart',
                Category: 3,
                ChartIndID: 'vchart'
            },
            VolROC: {
                ID: 27,
                LanguageTag: 'chartIndVolROC',
                Category: 3,
                ChartIndID: 'vol_roc'
            },
            ExponentialMV: {
                ID: 28,
                LanguageTag: 'chartIndExpoMV',
                Category: 3,
                ChartIndID: 'expo_mv'
            },
            SignalMACD: { // Todo: [Ravindu] Indicator output should be handled in effective way. Otherwise every sub calculated lines should be included in here.
                ID: 29,
                LanguageTag: 'chartIndMACD',
                Category: 3,
                ChartIndID: 'signal_macd'
            },
            PER: {
                ID: 30,
                LanguageTag: 'chartPER',
                Category: 3,
                ChartIndID: 'chartPER'
            },
            PBR: {
                ID: 31,
                LanguageTag: 'chartPBR',
                Category: 3,
                ChartIndID: 'chartPBR'
            },
            MedianPrice: {
                ID: 32,
                LanguageTag: 'chartIndiMP',
                Category: 1,
                ChartIndID: 'MP'
            },
            onBalanceVolume: {
                ID: 33,
                LanguageTag: 'chartIndiOBV',
                Category: 3,
                ChartIndID: 'On Balance Volume'
            }
        },

        IndicatorCategories: {
            Averages: 1,
            Bands: 2,
            Others: 3
        },

        MVTypes: {
            // Todo: [Ravindu] Use numeric value instead of string
            Simple: 'simple',
            Exponential: 'exponential',
            TimeSeries: 'time_series',
            Triangular: 'triangular',
            Variable: 'variable',
            Weighted: 'weighted',
            WellesWilder: 'welles_wilder'
        },

        VolOscTypes: {
            Points: 'Points',
            Percentage: 'Percentage'
        }
    };
});
define('universal-app/controllers/chart/core/utils/chart-utils', ['exports', '../../../../utils/utils', './chart-core-constants'], function (exports, _utils, _chartCoreConstants) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ChartUtils = function () {
        function ChartUtils() {
            _classCallCheck(this, ChartUtils);
        }

        _createClass(ChartUtils, null, [{
            key: 'removeParentChildren',
            value: function removeParentChildren(parent) {
                try {
                    var children = parent.children;

                    for (var i = children.length - 1; i >= 0; i--) {
                        parent.removeChild(children[i]);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart-utils] Clear chart ' + e);
                }
            }
        }, {
            key: 'isFunction',
            value: function isFunction(checkObj) {
                return typeof checkObj === 'function';
            }
        }, {
            key: 'getNoOfPeriodsInSet',
            value: function getNoOfPeriodsInSet(bestTimePitch) {
                switch (bestTimePitch) {
                    case 30:
                        // Intraday
                        return 1;
                    case 60:
                        return 2;
                    case 90:
                        return 3;
                    case 120:
                        return 4;
                    case 365:
                        // History
                        return 1;
                    case 730:
                        // 365 * 2:
                        return 2;
                    case 1460:
                        // 365 * 4:
                        return 4;
                    case 1825:
                        // 365 * 5:
                        return 5;
                    case 3650:
                        // 365 * 10:
                        return 10;
                    case 7300:
                        // 365 * 20:
                        return 20;
                    default:
                        return 1;
                }
            }
        }, {
            key: 'indexOfElement',
            value: function indexOfElement(dataArray, key) {
                var lo = 0;

                if (dataArray) {
                    var hi = dataArray.length - 1,
                        mid = void 0,
                        element = void 0;

                    while (lo <= hi) {
                        mid = lo + hi >> 1;
                        element = dataArray[mid];

                        if (element.DT.getTime() < key) {
                            lo = mid + 1;
                        } else if (element.DT.getTime() > key) {
                            hi = mid - 1;
                        } else {
                            return mid;
                        }
                    }
                }

                // If not found, return lo and the period will be calculated from that element
                return lo;
            }
        }, {
            key: 'clearParent',
            value: function clearParent(parent) {
                var that = this;

                try {
                    if (parent) {
                        var child = void 0;

                        for (var i = parent.children.length - 1; i >= 0; i--) {
                            child = parent.children[i];

                            try {
                                if (ChartUtils.isFunction(child.clear)) {
                                    child.clear(); // PIXI.Graphic Obj

                                    if (child.children.length > 0) {
                                        that.clearParent(child);
                                    }
                                } else {
                                    parent.removeChild(child); // PIXI.Text
                                }
                            } catch (e) {
                                _utils.default.logger.logError('[pro Chart utils] Clear child parent ' + e);
                            }
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart utils] Clear chart ' + e);
                }
            }
        }, {
            key: 'getStyleOfElement',
            value: function getStyleOfElement(elementId, property) {
                var element = $('#' + elementId);

                if (!element || element.length === 0) {
                    var parentElement = $('#chart-styles');
                    var newElement = $('<div id = ' + elementId + ' > < /div>');

                    newElement.id = elementId;

                    parentElement.append(newElement);
                    element = newElement;
                }

                return element.css(property);
            }
        }, {
            key: 'colorToHex',
            value: function colorToHex(color) {
                var that = this;

                if (color.substr(0, 1) === '#') {
                    return color;
                }

                var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

                if (!digits) {
                    digits = /(.*?)rgba\((\d+), (\d+), (\d+),.*\)/.exec(color);
                }

                function toHex(color) {
                    var ta = $('#color_converter');

                    if (!ta) {
                        ta = document.createElement('textarea');
                        ta.id = 'color_converter';
                        ta.style.display = 'none';
                        document.body.appendChild(ta);
                    }

                    ta.style.color = '#000000'; // Reset;
                    ta.style.color = color;
                    var value = void 0;

                    if (!that.isIE8) {
                        value = getComputedStyle(ta).getPropertyValue('color');
                        digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(value);

                        if (digits) {
                            return that.colorToHex(value);
                        } else if (value.substr(0, 1) === '#') {
                            return value;
                        } else {
                            return color;
                        }
                    }

                    value = ta.createTextRange().queryCommandValue('ForeColor');
                    value = (value & 0x0000ff) << 16 | value & 0x00ff00 | (value & 0xff0000) >>> 16;
                    value = value.toString(16);

                    return '0x000000'.slice(0, 8 - value.length) + value;
                }

                if (!digits) {
                    return toHex(color);
                }

                var red = parseFloat(digits[2]);
                var green = parseFloat(digits[3]);
                var blue = parseFloat(digits[4]);

                var rgb = blue | green << 8 | red << 16;
                var hexValue = rgb.toString(16);
                var s = '0x000000'.slice(0, 8 - hexValue.length) + hexValue;
                return s.toUpperCase();
            }
        }, {
            key: 'hexToRgba',
            value: function hexToRgba(hexC, opacity) {
                var hex = hexC;

                if (hex.substr(0, 4) === 'rgba') {
                    return hex;
                } else if (hex.substr(0, 3) === 'rgb') {
                    hex = this.colorToHex(hex);
                }

                hex = hex.replace('#', '');

                var r = parseInt(hex.substring(0, 2), 16);
                var g = parseInt(hex.substring(2, 4), 16);
                var b = parseInt(hex.substring(4, 6), 16);

                if (opacity) {
                    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
                } else {
                    return 'rgb(' + r + ',' + g + ',' + b + ')';
                }
            }
        }, {
            key: 'lastNotNullVal',
            value: function lastNotNullVal(dataSource, field) {
                var dataObj = void 0;

                try {
                    if (dataSource && dataSource.length > 0) {
                        for (var i = dataSource.length - 1; i >= 0; i--) {
                            dataObj = dataSource[i];

                            if (dataObj[field]) {
                                return dataObj;
                            }
                        }
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart utils] Error in Find last not null ' + e);
                }

                return dataObj;
            }
        }, {
            key: 'clearNode',
            value: function clearNode(node) {
                if (node.hasChildNodes()) {
                    while (node.childNodes.length >= 1) {
                        node.removeChild(node.firstChild);
                    }
                }
            }
        }, {
            key: 'getSymbolKey',
            value: function getSymbolKey(exchange, symbol) {
                return [exchange, _chartCoreConstants.default.StringConcat, symbol].join('');
            }
        }, {
            key: 'drawDashLine',
            value: function drawDashLine(x0, y0, x1, y1, linewidth, lineColor, alpha) {
                var dashed = new PIXI.Graphics();

                dashed.lineStyle(1, lineColor, alpha ? alpha : 1, 0);
                dashed.moveTo(0, 0);
                dashed.lineTo(linewidth, 0);

                dashed.moveTo(linewidth * 3, 0);
                dashed.lineTo(linewidth * 4, 0);

                var dashedtexture = dashed.generateCanvasTexture(1, 1);
                var linelength = Math.pow(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2), 0.5);
                var tilingSprite = new PIXI.extras.TilingSprite(dashedtexture, linelength, linewidth);

                tilingSprite.x = x0;
                tilingSprite.y = y0;
                tilingSprite.rotation = angle(x0, y0, x1, y1) * Math.PI / 180;
                tilingSprite.pivot.set(linewidth, linewidth);
                return tilingSprite;

                function angle(x0, y0, x1, y1) {
                    var diff_x = Math.abs(x1 - x0),
                        diff_y = Math.abs(y1 - y0);
                    var cita = void 0;

                    if (x1 > x0) {
                        if (y1 > y0) {
                            cita = 360 * Math.atan(diff_y / diff_x) / (2 * Math.PI);
                        } else {
                            if (y1 < y0) {
                                cita = -360 * Math.atan(diff_y / diff_x) / (2 * Math.PI);
                            } else {
                                cita = 0;
                            }
                        }
                    } else {
                        if (x1 < x0) {
                            if (y1 > y0) {
                                cita = 180 - 360 * Math.atan(diff_y / diff_x) / (2 * Math.PI);
                            } else {
                                if (y1 < y0) {
                                    cita = 180 + 360 * Math.atan(diff_y / diff_x) / (2 * Math.PI);
                                } else {
                                    cita = 180;
                                }
                            }
                        } else {
                            if (y1 > y0) {
                                cita = 90;
                            } else {
                                if (y1 < y0) {
                                    cita = -90;
                                } else {
                                    cita = 0;
                                }
                            }
                        }
                    }

                    return cita;
                }
            }
        }, {
            key: 'capitalizeEachWord',
            value: function capitalizeEachWord(str) {
                return str.replace(/\w\S*/g, function (txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                });
            }
        }, {
            key: 'isANumber',
            value: function isANumber(str) {
                return (/^\d+$/.test(str)
                );
            }
        }]);

        return ChartUtils;
    }();

    exports.default = ChartUtils;


    ChartUtils.isIE8 = window.isIE8 || navigator.userAgent.indexOf('MSIE 8.0') > -1;
});
define('universal-app/controllers/chart/core/utils/pixel-conversion', ['exports', '../../../../utils/utils'], function (exports, _utils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var PixelConversion = function () {
        function PixelConversion() {
            _classCallCheck(this, PixelConversion);
        }

        _createClass(PixelConversion, null, [{
            key: 'getPixelForTheYValue',
            value: function getPixelForTheYValue(val, compProp) {
                var pixel = 0;

                try {
                    if ((val || val === 0) && compProp) {
                        pixel = compProp.y + compProp.ht - compProp.clearance - Math.round((val - compProp.minY) * compProp.yFact);
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Pixel for the Y Val ' + e);
                }

                return Math.round(pixel);
            }
        }, {
            key: 'getYValueFromPX',
            value: function getYValueFromPX(px, compProp) {
                var val = 0;

                try {
                    if (window) {
                        var winHtWithoutBtomClear = compProp.y + compProp.ht - compProp.clearance;
                        val = (winHtWithoutBtomClear - px) / compProp.yFact + compProp.minY;
                    }
                } catch (e) {
                    _utils.default.logger.logError('[pro Chart] Y Val for the PX ' + e);
                }

                return val;
            }
        }, {
            key: 'getIndexForThePixel',
            value: function getIndexForThePixel(pixel, properties, stageProperty, calcDP) {
                if (stageProperty.xScale > 0) {
                    return (pixel - properties.x) / stageProperty.xScale + calcDP.beginIndex;
                }

                return 0;
            }
        }, {
            key: 'getIndexOnViewForThePixel',
            value: function getIndexOnViewForThePixel(pixel, properties, stageProperty) {
                if (stageProperty.xScale > 0) {
                    return (pixel - properties.x) / stageProperty.xScale;
                }

                return 0;
            }
        }]);

        return PixelConversion;
    }();

    exports.default = PixelConversion;
});
define('universal-app/controllers/chart/core/utils/study-dialog', ['exports', '../utils/chart-studies', './chart-core-constants', '../../../../utils/utils', './chart-utils'], function (exports, _chartStudies, _chartCoreConstants, _utils, _chartUtils) {
    'use strict';

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var StudyDialog = function () {
        function StudyDialog() {
            _classCallCheck(this, StudyDialog);
        }

        _createClass(StudyDialog, null, [{
            key: 'extractDialog',
            value: function extractDialog(div) {
                try {
                    // Todo: [Ravindu] Stop dom reflow. Create separate div and add it after finished modification

                    var strategy = $('#chartStrategy').data('strategy');
                    var inputs = {};
                    var inputItems = div.querySelectorAll('.inputTemplate');
                    var i = void 0,
                        field = void 0,
                        inputDOM = void 0,
                        value = void 0;

                    if (strategy) {
                        for (i = 0; i < inputItems.length; i++) {
                            if (inputItems[i].style.display !== 'none') {
                                field = inputItems[i].querySelectorAll('.stx-heading')[0].fieldName;
                                inputDOM = inputItems[i].querySelectorAll('.stx-data')[0].childNodes[0];
                                value = inputDOM.value;

                                if (inputDOM.getAttribute('type') === 'checkbox') {
                                    inputs[field] = inputDOM.checked;
                                } else {
                                    inputs[field] = value;
                                }
                            }
                        }

                        strategy.cp.inputs = inputs; // Setting modified inputs

                        var outputItems = div.querySelectorAll('.outputTemplate');
                        var color = void 0,
                            info = void 0,
                            outputItemHead = void 0;

                        for (i = 0; i < outputItems.length; i++) {
                            if (outputItems[i].style.display !== 'none') {
                                outputItemHead = outputItems[i].querySelectorAll('.stx-heading')[0];

                                if (typeof outputItemHead.fieldName !== 'undefined') {
                                    info = this._getPlotInfoFromfield(outputItemHead.fieldName, strategy.cp.plotInfos);
                                    color = outputItems[i].querySelectorAll('.stx-color')[0].style.backgroundColor;

                                    if (!color) {
                                        color = _chartUtils.default.getStyleOfElement('line-2-color', 'color');
                                    }

                                    info[outputItemHead.property] = _chartUtils.default.colorToHex(color);
                                    info.innerPlots[0][outputItemHead.property] = _chartUtils.default.colorToHex(color);
                                }
                            }
                        }

                        return strategy;
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error in extract values' + e);
                }
            }
        }, {
            key: 'createStudyDialog',
            value: function createStudyDialog(strategy) {
                // Todo: [Ravindu] Stop dom reflow. Create separate div and add it after finished modification

                var that = this;
                var langObj = strategy.cp.stageProperty.langObj;

                if (!strategy && !strategy.cp) {
                    return false;
                }

                if (!strategy.cp.isOpenDialog) {
                    return false;
                }

                var cp = strategy.cp;
                var div = $('#studyDialog')[0];
                var divInputs = div.querySelectorAll('#inputs')[0];
                var inputItems = divInputs.querySelectorAll('.inputTemplate');

                if (divInputs.parentElement) {
                    var displayStyle;

                    if (Ember.$.isEmptyObject(cp.inputs)) {
                        displayStyle = 'none';
                    } else if (divInputs.parentElement.style.display === 'none') {
                        displayStyle = '';
                    }

                    divInputs.parentElement.style.display = displayStyle;
                }

                for (var i = 0; i < inputItems.length; i++) {
                    // Removing previous input content if there was
                    if (inputItems[i].style.display !== 'none') {
                        divInputs.removeChild(inputItems[i]);
                    }
                }

                var divOutputs = div.querySelectorAll('#outputs')[0];
                var outputItems = divOutputs.querySelectorAll('.outputTemplate');

                for (var _i = 0; _i < outputItems.length; _i++) {
                    // Removing previous output content if there was
                    if (outputItems[_i].style.display !== 'none') {
                        divOutputs.removeChild(outputItems[_i]);
                    }
                }

                // Title

                div.querySelectorAll('.title')[0].innerHTML = langObj.lang.labels[cp.name];
                $('#chartStrategy').data('strategy', strategy);

                // Input

                var newInput = void 0,
                    formField = void 0,
                    acceptedData = void 0,
                    defaultValue = void 0,
                    availableVolOscTypePosit = -1,
                    availableMAPosit = -1,
                    index = 0;

                for (var _i2 in cp.inputs) {
                    newInput = inputItems[0].cloneNode(true);
                    divInputs.appendChild(newInput);
                    newInput.style.display = 'block';
                    newInput.querySelectorAll('.stx-heading')[0].appendChild(document.createTextNode(langObj.lang.labels.chartLabels[_i2]));
                    newInput.querySelectorAll('.stx-heading')[0].fieldName = _i2;

                    formField = null;
                    acceptedData = cp.inputs[_i2];

                    // Todo: [Ravindu] Replace default value from customize data

                    defaultValue = acceptedData;

                    if (acceptedData.constructor === Number || _chartUtils.default.isANumber(acceptedData)) {
                        formField = document.createElement('input');
                        formField.setAttribute('type', 'number');
                        formField.value = defaultValue;
                    } else if (acceptedData.constructor === String) {
                        index = 0;
                        availableMAPosit = -1;
                        availableVolOscTypePosit = -1;

                        for (var pKey in _chartStudies.default.MVTypes) {
                            if (_chartStudies.default.MVTypes[pKey] === acceptedData) {
                                availableMAPosit = index;
                                break;
                            }

                            index++;
                        }

                        index = 0;

                        for (var _pKey in _chartStudies.default.VolOscTypes) {
                            if (_chartStudies.default.VolOscTypes[_pKey] === acceptedData) {
                                availableVolOscTypePosit = index;
                                break;
                            }

                            index++;
                        }

                        if (availableMAPosit !== -1) {
                            formField = that._createMATypeCombo(langObj);
                            formField.selectedIndex = availableMAPosit;
                        } else if (availableVolOscTypePosit !== -1) {
                            formField = that._createVolOscTypeCombo(langObj);
                            formField.selectedIndex = availableVolOscTypePosit;
                        } else if (_i2 === 'field') {
                            formField = that._createOHLCFieldCombo(langObj);
                            index = 0;

                            for (var _pKey2 in _chartCoreConstants.default.OHLCFields) {
                                if (_chartCoreConstants.default.OHLCFields[_pKey2] === acceptedData) {
                                    formField.selectedIndex = index;
                                    break;
                                }

                                index++;
                            }
                        } else {
                            formField = document.createElement('input');
                            formField.type = 'text';
                            formField.value = defaultValue;
                        }
                    } else if (acceptedData.constructor === Boolean) {
                        formField = document.createElement('input');
                        formField.setAttribute('type', 'checkbox');

                        if (defaultValue === true || defaultValue === 'true') {
                            formField.checked = true;
                        }

                        if (_i2 === 'Overlay') {
                            if (formField.checked) {
                                formField.disabled = true;
                            } else {
                                newInput.style.display = 'none';
                            }
                        }
                    } else if (acceptedData.constructor === Array) {
                        formField = document.createElement('select');

                        for (var ii = 0; ii < acceptedData.length; ii++) {
                            that._addOption(acceptedData[ii], acceptedData[ii], formField);
                        }

                        if (defaultValue.constructor !== Array) {
                            formField.value = defaultValue;
                        }
                    }

                    if (formField) {
                        newInput.querySelectorAll('.stx-data')[0].appendChild(formField);
                    }
                }

                // Output

                $.each(cp.plotInfos, function (index, info) {
                    that._createOutputItem({
                        outputItems: outputItems,
                        outputDiv: divOutputs,
                        parentDiv: div,
                        info: info,
                        langObj: langObj
                    });
                });

                return div;
            }
        }, {
            key: 'changeDialogLang',
            value: function changeDialogLang(div, langObj) {
                // Todo: [Ravindu] Improve code reusing

                try {
                    var that = this;
                    var strategy = $('#chartStrategy').data('strategy');

                    if (strategy) {
                        var cp = strategy.cp;
                        var divInputs = div.querySelectorAll('#inputs')[0];
                        var inputItems = divInputs.querySelectorAll('.inputTemplate');

                        for (var i = 0; i < inputItems.length; i++) {
                            // Removing previous input content if there was
                            if (inputItems[i].style.display !== 'none') {
                                divInputs.removeChild(inputItems[i]);
                            }
                        }

                        var divOutputs = div.querySelectorAll('#outputs')[0];
                        var outputItems = divOutputs.querySelectorAll('.outputTemplate');

                        for (var _i3 = 0; _i3 < outputItems.length; _i3++) {
                            // Removing previous output content if there was
                            if (outputItems[_i3].style.display !== 'none') {
                                divOutputs.removeChild(outputItems[_i3]);
                            }
                        }

                        // Title

                        div.querySelectorAll('.title')[0].innerHTML = langObj.lang.labels[cp.name];

                        // Input

                        var newInput = void 0,
                            formField = void 0,
                            acceptedData = void 0,
                            defaultValue = void 0,
                            availableMAPosit = -1,
                            availableVolOscTypePosit = -1,
                            index = 0;

                        for (var _i4 in cp.inputs) {
                            newInput = inputItems[0].cloneNode(true);
                            divInputs.appendChild(newInput);
                            newInput.style.display = 'block';
                            newInput.querySelectorAll('.stx-heading')[0].appendChild(document.createTextNode(langObj.lang.labels.chartLabels[_i4]));
                            newInput.querySelectorAll('.stx-heading')[0].fieldName = _i4;

                            formField = null;
                            acceptedData = cp.inputs[_i4];

                            // Todo: [Ravindu] Replace default value from customize data

                            defaultValue = acceptedData;

                            if (acceptedData.constructor === Number || _chartUtils.default.isANumber(acceptedData)) {
                                formField = document.createElement('input');
                                formField.setAttribute('type', 'number');
                                formField.value = defaultValue;
                            } else if (acceptedData.constructor === String) {
                                index = 0;
                                availableMAPosit = -1;
                                availableVolOscTypePosit = -1;

                                for (var pKey in _chartStudies.default.MVTypes) {
                                    if (_chartStudies.default.MVTypes[pKey] === acceptedData) {
                                        availableMAPosit = index;
                                        break;
                                    }

                                    index++;
                                }

                                index = 0;

                                for (var _pKey3 in _chartStudies.default.VolOscTypes) {
                                    if (_chartStudies.default.VolOscTypes[_pKey3] === acceptedData) {
                                        availableVolOscTypePosit = index;
                                        break;
                                    }

                                    index++;
                                }

                                if (availableMAPosit !== -1) {
                                    formField = that._createMATypeCombo(langObj);
                                    formField.selectedIndex = availableMAPosit;
                                } else if (availableVolOscTypePosit !== -1) {
                                    formField = that._createVolOscTypeCombo(langObj);
                                    formField.selectedIndex = availableVolOscTypePosit;
                                } else if (_i4 === 'field') {
                                    formField = that._createOHLCFieldCombo(langObj);
                                    index = 0;

                                    for (var _pKey4 in _chartCoreConstants.default.OHLCFields) {
                                        if (_chartCoreConstants.default.OHLCFields[_pKey4] === acceptedData) {
                                            formField.selectedIndex = index;
                                            break;
                                        }

                                        index++;
                                    }
                                } else {
                                    formField = document.createElement('input');
                                    formField.type = 'text';
                                    formField.value = defaultValue;
                                }
                            } else if (acceptedData.constructor === Boolean) {
                                formField = document.createElement('input');
                                formField.setAttribute('type', 'checkbox');

                                if (defaultValue === true || defaultValue === 'true') {
                                    formField.checked = true;
                                }

                                if (_i4 === 'Overlay') {
                                    if (formField.checked) {
                                        formField.disabled = true;
                                    } else {
                                        newInput.style.display = 'none';
                                    }
                                }
                            } else if (acceptedData.constructor === Array) {
                                formField = document.createElement('select');

                                for (var ii = 0; ii < acceptedData.length; ii++) {
                                    that._addOption(acceptedData[ii], acceptedData[ii], formField);
                                }

                                if (defaultValue.constructor !== Array) {
                                    formField.value = defaultValue;
                                }
                            }

                            if (formField) {
                                newInput.querySelectorAll('.stx-data')[0].appendChild(formField);
                            }
                        }

                        // Output

                        $.each(cp.plotInfos, function (index, info) {
                            that._createOutputItem({
                                outputItems: outputItems,
                                outputDiv: divOutputs,
                                parentDiv: div,
                                info: info,
                                langObj: langObj
                            });
                        });
                    }
                } catch (e) {
                    _utils.default.logger.logError('Error in change dialog lang' + e);
                }
            }
        }, {
            key: '_createOutputItem',
            value: function _createOutputItem(params) {
                var that = this;
                var newOutput = void 0,
                    colorClick = void 0,
                    value = void 0,
                    colorPropKey = void 0;

                $.each(params.info.innerPlots, function (key, innerPlot) {
                    newOutput = params.outputItems[0].cloneNode(true);
                    params.outputDiv.appendChild(newOutput);

                    newOutput.style.display = 'block';

                    colorPropKey = Object.keys(innerPlot)[1];

                    newOutput.querySelectorAll('.stx-heading')[0].appendChild(document.createTextNode(params.langObj.lang.labels.chartLabels[innerPlot.langKey]));
                    newOutput.querySelectorAll('.stx-heading')[0].fieldName = params.info.key;
                    newOutput.querySelectorAll('.stx-heading')[0].property = colorPropKey;

                    colorClick = newOutput.querySelectorAll('.stx-color')[0];
                    value = innerPlot[colorPropKey];

                    if (value) {
                        colorClick.style.backgroundColor = _chartUtils.default.hexToRgba(value.replace('0X', '#')); // 0Xfff
                        that._attachColorPicker(colorClick, params.parentDiv);
                    }
                });
            }
        }, {
            key: '_createMATypeCombo',
            value: function _createMATypeCombo(langObj) {
                var maCombo = document.createElement('select');

                $.each(_chartStudies.default.MVTypes, function (field) {
                    StudyDialog._addOption(_chartStudies.default.MVTypes[field], langObj.lang.labels.chartLabels[field], maCombo);
                });

                return maCombo;
            }
        }, {
            key: '_createVolOscTypeCombo',
            value: function _createVolOscTypeCombo(langObj) {
                var voCombo = document.createElement('select');

                $.each(_chartStudies.default.VolOscTypes, function (field) {
                    StudyDialog._addOption(_chartStudies.default.VolOscTypes[field], langObj.lang.labels.chartLabels[field], voCombo);
                });

                return voCombo;
            }
        }, {
            key: '_createOHLCFieldCombo',
            value: function _createOHLCFieldCombo(langObj) {
                var ohlcCombo = document.createElement('select');

                $.each(_chartCoreConstants.default.OHLCFields, function (field) {
                    StudyDialog._addOption(_chartCoreConstants.default.OHLCFields[field], langObj.lang.labels.chartLabels[field], ohlcCombo);
                });

                return ohlcCombo;
            }
        }, {
            key: '_addOption',
            value: function _addOption(value, text, formField) {
                var option = document.createElement('OPTION');

                option.value = value;
                option.text = text;
                formField.add(option, null);
            }
        }, {
            key: '_attachColorPicker',
            value: function _attachColorPicker(colorClick, cpHolder, cb) {
                var that = this;
                var backDrop = document.createElement('div');

                var closure = function closure(colorClick, cpHolder, cb) {
                    return function (color) {
                        if (cpHolder.colorPickerDiv) {
                            cpHolder.colorPickerDiv.style.display = 'none';
                            backDrop.remove();
                        }

                        colorClick.style.backgroundColor = '#' + color;

                        if (cb) {
                            cb(color);
                        }
                    };
                };

                colorClick.onclick = function (fc, cpHolder) {
                    return function () {
                        backDrop.style.position = 'fixed';
                        backDrop.style.width = '100%';
                        backDrop.style.height = '100%';
                        backDrop.style.zIndex = '100';
                        backDrop.onclick = closePicker();
                        document.body.appendChild(backDrop);

                        function closePicker() {
                            return function () {
                                cpHolder.colorPickerDiv.style.display = 'none';
                                backDrop.remove();
                            };
                        }

                        if (!cpHolder.colorPickerDiv) {
                            cpHolder.colorPickerDiv = document.createElement('DIV');
                            cpHolder.colorPickerDiv.className = 'ciqColorPicker';
                            document.body.appendChild(cpHolder.colorPickerDiv);
                        }

                        that._createColorPicker(cpHolder.colorPickerDiv, fc);

                        cpHolder.colorPickerDiv.style.display = 'block';

                        var xy = that._getPos(this);
                        var x = xy.x + this.clientWidth;

                        if (x + cpHolder.colorPickerDiv.offsetWidth > that._pageWidth()) {
                            x -= x + cpHolder.colorPickerDiv.offsetWidth - that._pageWidth() + 20;
                        }

                        cpHolder.colorPickerDiv.style.left = x + 'px';

                        var y = xy.y;

                        if (y + cpHolder.colorPickerDiv.clientHeight > that._pageHeight()) {
                            y -= y + cpHolder.colorPickerDiv.clientHeight - that._pageHeight();
                        }

                        cpHolder.colorPickerDiv.style.top = y + 'px';
                    };
                }(closure(colorClick, cpHolder, cb), cpHolder);
            }
        }, {
            key: '_createColorPicker',
            value: function _createColorPicker(div, fc) {
                var colors = StudyDialog.colorPickerColors;
                _chartUtils.default.clearNode(div);

                var ul = document.createElement('ul');

                ul.style.zIndex = '200';
                div.appendChild(ul);

                function clkFn(c) {
                    return function () {
                        fc(c);
                        return false;
                    };
                }

                var c = void 0,
                    li = void 0,
                    a = void 0;

                for (var i = 0; i < colors.length; i++) {
                    c = colors[i];
                    li = document.createElement('li');
                    a = document.createElement('a');

                    li.appendChild(a);

                    a.href = '#';
                    a.title = c;
                    a.style.background = '#' + c;
                    a.innerHTML = c;
                    ul.appendChild(li);
                    a.onclick = clkFn(c);
                }
            }
        }, {
            key: '_getPos',
            value: function _getPos(element) {
                var el = element;

                for (var lx = 0, ly = 0; el != null; lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent) {}
                return { x: lx, y: ly };
            }
        }, {
            key: '_pageHeight',
            value: function _pageHeight() {
                var h = window.innerHeight;

                if (top !== self) {
                    try {
                        if (h > parent.innerHeight) {
                            h = parent.innerHeight;
                        }
                    } catch (e) {
                        _utils.default.logger.logError('Error in page height' + e);
                    }
                }

                return h;
            }
        }, {
            key: '_pageWidth',
            value: function _pageWidth() {
                var w = window.innerWidth;

                if (top !== self) {
                    try {
                        if (w > parent.innerWidth) {
                            w = parent.innerWidth;
                        }
                    } catch (e) {
                        _utils.default.logger.logError('Error in page width' + e);
                    }
                }

                return w;
            }
        }, {
            key: '_getPlotInfoFromfield',
            value: function _getPlotInfoFromfield(field, plotInfos) {
                var result = void 0;

                $.each(plotInfos, function (index, info) {
                    if (info.key === field) {
                        result = info;
                        return false;
                    }
                });

                return result;
            }
        }]);

        return StudyDialog;
    }();

    exports.default = StudyDialog;


    /**
     * Predefined colors for the color picker that have been tested across multiple devices.
     * These color values may be changed if desired by assigning colorPickerColors to a different array of colors.
     */

    StudyDialog.colorPickerColors = ['ffffff', 'ffd0cf', 'ffd9bb', 'fff56c', 'eaeba3', 'd3e8ae', 'adf3ec', 'ccdcfa', 'd9c3eb', 'efefef', 'eb8b87', 'ffb679', 'ffe252', 'e2e485', 'c5e093', '9de3df', 'b1c9f8', 'c5a6e1', 'cccccc', 'e36460', 'ff9250', 'ffcd2b', 'dcdf67', 'b3d987', '66cac4', '97b8f7', 'b387d7', '9b9b9b', 'dd3e39', 'ff6a23', 'faaf3a', 'c9d641', '8bc176', '33b9b0', '7da6f5', '9f6ace', '656565', 'b82c0b', 'be501b', 'e99b54', '97a030', '699158', '00a99d', '5f7cb8', '784f9a', '343434', '892008', '803512', 'ab611f', '646c20', '46603a', '007e76', '3e527a', '503567', '000000', '5c1506', '401a08', '714114', '333610', '222f1d', '00544f', '1f2a3c', '281a33'];
});
define('universal-app/controllers/chart/data/chart-data-provider', ['exports', 'ember', '../../../models/shared/shared-service', '../core/utils/chart-core-constants', '../../../utils/utils', '../../../controllers/chart/core/utils/chart-utils'], function (exports, _ember, _sharedService, _chartCoreConstants, _utils, _chartUtils) {
    'use strict';

    exports.default = _ember.default.Object.extend({
        // Time Settings
        chartCategory: null,
        chartDataLevel: -1,
        chartViewPeriod: null,

        // Symbol Data
        chartSymbolArray: [],

        // Call backs
        onData: undefined,
        onDataChunk: undefined,
        onErrorFn: undefined,

        // Flag
        isDifferentPeriod: true, // query first time data
        wKey: undefined,

        init: function init() {
            this._super();
            this.priceService = _sharedService.default.getService('price');
            this.set('chartSymbolArray', []);
        },

        addChartSymbol: function addChartSymbol(exchange, symbol, isBaseSymbol) {
            var symbolArray = this.get('chartSymbolArray');
            var chartSymbolObj = {
                exg: exchange,
                sym: symbol,
                chartPointArray: [],
                isBaseSymbol: isBaseSymbol,
                indexFactor: 1.0
            };

            if (isBaseSymbol) {
                var existSymObj = this.getCharSymbol(exchange, symbol);

                if (existSymObj) {
                    symbolArray.splice(symbolArray.indexOf(existSymObj), 1);
                }
            }

            symbolArray.splice(0, 0, chartSymbolObj);
            return chartSymbolObj;
        },

        removeChartSymbol: function removeChartSymbol(exg, sym) {
            var symbolArray = this.get('chartSymbolArray');

            if (exg && sym) {
                var indexToRemove = -1;

                for (var a = 0; a < symbolArray.length; a++) {
                    var chartSymbolObj = symbolArray[a];

                    if (chartSymbolObj.exg === exg && chartSymbolObj.sym === sym) {
                        indexToRemove = a;
                        break;
                    }
                }

                if (indexToRemove > -1) {
                    symbolArray.splice(indexToRemove, 1);
                }
            } else {
                symbolArray.length = 0;
            }
        },

        getDataArray: function getDataArray(exg, sym) {
            var symbObj = this.getCharSymbol(exg, sym);

            if (symbObj) {
                return symbObj.chartPointArray;
            }

            return [];
        },

        getCharSymbol: function getCharSymbol(exg, sym) {
            var symbolArray = this.get('chartSymbolArray');

            if (exg && sym) {
                var chartSymbolObj;

                for (var a = 0; a < symbolArray.length; a++) {
                    chartSymbolObj = symbolArray[a];

                    if (chartSymbolObj.exg === exg && chartSymbolObj.sym === sym) {
                        return chartSymbolObj;
                    }
                }
            } else if (symbolArray.length > 0) {
                return this._getBaseSymObj();
            } else {
                return null;
            }
        },

        removeChartSymbols: function removeChartSymbols() {
            this.removeChartSymbol();
        },

        addChartDataSubscription: function addChartDataSubscription(symbolObj, begin) {
            var symbolArray = this.get('chartSymbolArray');

            if (symbolArray.length === 0) {
                return;
            }

            if (symbolObj) {
                this.addSubscription(symbolObj, begin);
            } else {
                for (var a = 0; a < symbolArray.length; a++) {
                    this.addSubscription(symbolArray[a], begin);
                }
            }
        },

        addSubscription: function addSubscription(chartSymbolObj, begin) {
            _utils.default.logger.logInfo('###################Data From Server##################################');
            _utils.default.logger.logInfo('Subscribing - Data From Server ' + chartSymbolObj.sym);

            if (this.get('chartCategory').ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                var ohlcSeries = this.priceService.ohlcDS.getOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.get('chartCategory'));

                ohlcSeries.registerForRealtimeData(this);
                // this.priceService.addSymbolRequest(chartSymbolObj.exg, chartSymbolObj.sym);
                this.priceService.addIntradayChartRequest(chartSymbolObj.exg, chartSymbolObj.sym);
            }

            this.downloadGraphData(chartSymbolObj, begin);
        },

        removeChartDataSubscription: function removeChartDataSubscription(symbolObj) {
            var symbolArray = this.get('chartSymbolArray');

            if (symbolArray.length === 0) {
                return;
            }

            if (symbolObj) {
                this.removeSubscription(symbolObj);
            } else {
                for (var a = 0; a < symbolArray.length; a++) {
                    this.removeSubscription(symbolArray[a]);
                }
            }
        },

        removeSubscription: function removeSubscription(chartSymbolObj) {
            if (this.get('chartCategory').ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                // this.priceService.removeSymbolRequest(chartSymbolObj.exg, chartSymbolObj.sym);
                this.priceService.removeIntradayChartRequest(chartSymbolObj.exg, chartSymbolObj.sym);
            }

            // remove all stores when un-subscription is invoked
            chartSymbolObj.chartPointArray.length = 0;
            this.priceService.ohlcDS.removeOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.get('chartCategory'));

            this.priceService.ohlcDS.unSubscribeChartDataReady(_utils.default.keyGenerator.getKey(chartSymbolObj.exg, chartSymbolObj.sym), this.wKey);
        },

        refineGraphData: function refineGraphData(params) {
            var symbolArray = this.get('chartSymbolArray');
            var chartSymbolObj;

            var prevChartCategory = this.chartCategory;

            this.set('chartDataLevel', params.chartDataLevel);
            this.set('chartViewPeriod', params.chartViewPeriod);
            this.set('chartCategory', params.chartCategory);

            for (var a = 0; a < symbolArray.length; a++) {
                chartSymbolObj = symbolArray[a];

                if (prevChartCategory.ID === _chartCoreConstants.default.ChartCategory.History.ID && params.chartCategory.ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                    this.priceService.addIntradayChartRequest(chartSymbolObj.exg, chartSymbolObj.sym);
                } else if (prevChartCategory.ID === _chartCoreConstants.default.ChartCategory.Intraday.ID && params.chartCategory.ID === _chartCoreConstants.default.ChartCategory.History.ID) {
                    this.priceService.removeIntradayChartRequest(chartSymbolObj.exg, chartSymbolObj.sym);
                }

                this.downloadGraphData(chartSymbolObj);
            }
        },

        downloadGraphData: function downloadGraphData(chartSymbolObj, begin) {
            _utils.default.logger.logInfo('Download Data - Data From Server ' + chartSymbolObj.sym);

            var ohlcSeries = this.priceService.ohlcDS.getOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.chartCategory);

            if (ohlcSeries.chartDataLevel < this.chartDataLevel) {
                ohlcSeries.set('chartDataLevel', this.chartDataLevel);

                if (this.chartCategory.ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                    this.priceService.ohlcDS.sendIntraDayOHLCDataRequest(this, chartSymbolObj);
                } else {
                    this.priceService.ohlcDS.sendHistoryOHLCDataRequest(this, chartSymbolObj, begin);
                }
            } else if (ohlcSeries && ohlcSeries.ohlcDataPoints.length > 0) {
                this.onDataDownloadedFromMix(this, chartSymbolObj);
            } else if (ohlcSeries) {
                var key = _utils.default.keyGenerator.getKey(chartSymbolObj.exg, chartSymbolObj.sym);
                this.priceService.ohlcDS.subscribeChartDataReady(this, chartSymbolObj, key, this.wKey);
            }
        },

        onDataDownloadedFromMix: function onDataDownloadedFromMix(cDP, chartSymbolObj) {
            _utils.default.logger.logInfo('Query Data - Data From Server ' + chartSymbolObj.sym);
            // First re-build the DataArray
            cDP.queryData(chartSymbolObj);

            this._calculateIndexingFactors();

            if (cDP.onDataChunk && _ember.default.$.isFunction(cDP.onDataChunk)) {
                _utils.default.logger.logInfo('Data From Server ' + chartSymbolObj.sym);

                cDP.onDataChunk(chartSymbolObj);
            }
        },

        onDataFromRealTime: function onDataFromRealTime(ohlcPoint, exg, sym) {
            try {
                if (this.onData && _ember.default.$.isFunction(this.onData)) {
                    var chartSymObj = this.getCharSymbol(exg, sym);

                    if (chartSymObj && this.chartCategory.ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                        var dataArray = chartSymObj.chartPointArray;

                        if (dataArray.length > 0) {
                            _utils.default.logger.logInfo('[ChartDataProvider] In realtime path ' + sym + ' RT 1 Min | Current Last Record Index : ' + (dataArray.length - 1) + ' | Record : ' + dataArray[dataArray.length - 1].DT);
                        }

                        if (dataArray.length === 0 || dataArray.length > 0 && ohlcPoint.DT.getTime() > dataArray[dataArray.length - 1].DT.getTime()) {
                            chartSymObj.chartPointArray = this.refineChartPointArray(dataArray, ohlcPoint); // Remodel chartPointArrayfor intraday periods
                            chartSymObj.chartPointArray.push(ohlcPoint);

                            _utils.default.logger.logInfo('[ChartDataProvider] In realtime path ' + sym + ' RT 1 Min | DT : ' + ohlcPoint.DT + ' - ' + ' | Vol : ' + ohlcPoint.Volume);

                            this.onData(ohlcPoint, exg, sym);
                        } else {
                            _utils.default.logger.logInfo('[OnDataFromRealtime] Late realtime point');
                        }
                    }
                }
            } catch (e) {
                _utils.default.logger.logError('Error in Realtime data adding : ' + e);
            }
        },

        refineChartPointArray: function refineChartPointArray(dataArray, ohlcPoint) {
            var firstDay = parseInt(dataArray[0].DT.getTime() / _chartCoreConstants.default.TicksPerDay, 10),
                newDay = parseInt(ohlcPoint.DT.getTime() / _chartCoreConstants.default.TicksPerDay, 10);

            try {
                if (this.chartViewPeriod === _chartCoreConstants.default.ChartViewPeriod.OneDay && newDay >= firstDay + 1) {
                    _utils.default.logger.logInfo('[ChartDataProvider] Oneday refining | new Day');
                    return [];
                } else if (this.chartViewPeriod === _chartCoreConstants.default.ChartViewPeriod.TwoDay && newDay >= firstDay + 2) {
                    var index = -1;

                    _utils.default.logger.logInfo('[ChartDataProvider] Two Days refining | new Day');

                    for (var i = dataArray.length - 1; i >= 0; i--) {
                        if (parseInt(dataArray[i].DT.getTime() / _chartCoreConstants.default.TicksPerDay, 10) <= newDay - 2) {
                            index = i;
                            break;
                        }
                    }

                    return dataArray.slice(index + 1, dataArray.length);
                }

                return dataArray;
            } catch (e) {
                _utils.default.logger.logError('Error in new day refining ChartPointArray : ' + e);
            }
        },

        queryData: function queryData(chartSymbolObj) {
            try {
                if (chartSymbolObj) {
                    var ohlcSeries = this.priceService.ohlcDS.getOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.chartCategory);

                    // Todo [Ravindu] this loads category max data. change it to load maximum history data.
                    if (_chartCoreConstants.default.ChartViewPeriod.All.ID === this.chartViewPeriod.ID) {
                        chartSymbolObj.chartPointArray = ohlcSeries.ohlcDataPoints.slice(); // It is important to get a copy as chart IQ use the same array as its master data array
                    } else if (ohlcSeries.ohlcDataPoints.length > 0) {
                        // var date = new Date();
                        var newestPoint = ohlcSeries.ohlcDataPoints[ohlcSeries.ohlcDataPoints.length - 1];
                        var date = new Date(newestPoint.DT.getTime());

                        date.setHours(0);
                        date.setMinutes(0);
                        date.setSeconds(0);

                        switch (this.chartViewPeriod.ID) {
                            case _chartCoreConstants.default.ChartViewPeriod.OneDay.ID:
                                // date.getTime() : relevant code line is set in below
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TwoDay.ID:
                                date.setDate(date.getDate() - _chartCoreConstants.default.ChartDefaultDataPeriod.TwoDay);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.FiveDay.ID:
                                date.setDate(date.getDate() - _chartCoreConstants.default.ChartDefaultDataPeriod.FiveDay);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.OneMonth.ID:
                                date.setMonth(date.getMonth() - 1);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.ThreeMonth.ID:
                                date.setMonth(date.getMonth() - 3);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.SixMonth.ID:
                                date.setMonth(date.getMonth() - 6);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.OneYear.ID:
                                date.setYear(date.getFullYear() - 1);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TwoYear.ID:
                                date.setYear(date.getFullYear() - 2);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.ThreeYear.ID:
                                date.setYear(date.getFullYear() - 3);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.FiveYear.ID:
                                date.setYear(date.getFullYear() - 5);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TenYear.ID:
                                date.setYear(date.getFullYear() - 10);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.YTD.ID:
                                date.setMonth(0);
                                date.setDate(1);
                                break;

                            default:
                                _utils.default.logger.logWarning('Unknown chart view period...!');
                        }

                        chartSymbolObj.chartPointArray = ohlcSeries.queryPointsForRange(date.getTime());
                    }
                }
            } catch (e) {
                _utils.default.logger.logError('Error in querying ohlc data : ' + e);
            }
        },

        _calculateIndexingFactors: function _calculateIndexingFactors() {
            var firstCommonNonZeroIndex = 0;
            var searchIndex = 0,
                chartPoint = void 0;

            if (this.chartSymbolArray.length > 1) {
                // Todo: [Ravindu] There might be a better solution to identify chart is in comparison mode
                firstCommonNonZeroIndex = this._getFirstCommonNonZeroTimeIndex();

                $.each(this.chartSymbolArray, function (index, chartSym) {
                    chartSym.indexFactor = 1.0;
                    searchIndex = _chartUtils.default.indexOfElement(chartSym.chartPointArray, firstCommonNonZeroIndex);

                    if (searchIndex >= 0) {
                        chartPoint = chartSym.chartPointArray[searchIndex];
                    }

                    if (chartPoint) {
                        chartSym.indexFactor = 100 / chartPoint.Close; // Todo: [Ravindu] Field will be changed after chart gives option to change ohlc field.
                    }
                });
            }
        },
        _getFirstCommonNonZeroTimeIndex: function _getFirstCommonNonZeroTimeIndex() {
            var that = this;
            var firstCommonNonZeroOHLCTime = 0; // Todo: [Ravindu] Check if firstCommonNonZeroOHLCTime is actually common. That means at common non zero index all sources should have data.

            $.each(this.chartSymbolArray, function (index, symObj) {
                firstCommonNonZeroOHLCTime = Math.max(firstCommonNonZeroOHLCTime, that._getFirstNonZeroIndex(symObj));
            });

            return firstCommonNonZeroOHLCTime;
        },
        _getFirstNonZeroIndex: function _getFirstNonZeroIndex(symObj) {
            try {
                if (symObj) {
                    var ohlc = void 0;

                    for (var i = 0; i < symObj.chartPointArray.length; i++) {
                        ohlc = symObj.chartPointArray[i];

                        if (ohlc) {
                            // Todo: [Ravindu] Field will be changed after chart gives option to change ohlc field.
                            return ohlc.DT.getTime();
                        }
                    }

                    return 0;
                }
            } catch (e) {
                _utils.default.logger.logError('Error in get first non zero index : ' + e);
            }
        },
        _getBaseSymObj: function _getBaseSymObj() {
            var symbolArray = this.get('chartSymbolArray');
            var chartSymbolObj = void 0;

            for (var a = 0; a < symbolArray.length; a++) {
                chartSymbolObj = symbolArray[a];

                if (chartSymbolObj.isBaseSymbol) {
                    return chartSymbolObj;
                }
            }
        }
    });
});
define('universal-app/controllers/chart/data/technical-score-data-provider', ['exports', 'ember', '../../../models/shared/shared-service', '../../../utils/utils', '../../../controllers/chart/data/chart-data-provider', '../../../controllers/chart/core/utils/chart-core-constants'], function (exports, _ember, _sharedService, _utils, _chartDataProvider, _chartCoreConstants) {
    'use strict';

    exports.default = _chartDataProvider.default.extend({
        addSubscription: function addSubscription(chartSymbolObj, begin) {
            this._super(chartSymbolObj, begin);

            if (this.get('chartCategory').ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                this.priceService.addIntradayTechScoreRequest(chartSymbolObj.exg, chartSymbolObj.sym);
                // TODO: [Chathuranga] Implement real time chart update notifications for technical score
            }

            this.downloadGraphData(chartSymbolObj, begin);
        },

        removeSubscription: function removeSubscription(chartSymbolObj) {
            this._super(chartSymbolObj);

            if (this.get('chartCategory').ID === _chartCoreConstants.default.ChartCategory.Intraday.ID) {
                this.priceService.removeIntradayTechScoreRequest(chartSymbolObj.exg, chartSymbolObj.sym);
            }

            // Remove all stores when un-subscription is invoked
            chartSymbolObj.chartPointArray.length = 0;
            this.priceService.technicalScoreDS.removeOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.get('chartCategory'));

            this.priceService.technicalScoreDS.unSubscribeChartDataReady(_utils.default.keyGenerator.getKey(chartSymbolObj.exg, chartSymbolObj.sym), this.wKey);
        },

        downloadGraphData: function downloadGraphData(chartSymbolObj, begin) {
            this._super(chartSymbolObj, begin);

            var key = _utils.default.keyGenerator.getKey(chartSymbolObj.exg, chartSymbolObj.sym);
            var techScoreSeries = this.priceService.technicalScoreDS.getTechnicalScoreSeries(chartSymbolObj.exg, chartSymbolObj.sym, this.chartCategory);

            if (techScoreSeries && techScoreSeries.dataPoints.length > 0) {
                this.onDataDownloadedFromMix(this, chartSymbolObj);
            } else if (techScoreSeries) {
                this.priceService.technicalScoreDS.sendTechnicalScoreDataRequest(this, chartSymbolObj, begin);
                this.priceService.technicalScoreDS.subscribeChartDataReady(this, chartSymbolObj, key, this.wKey);
            }
        },

        onDataDownloadedFromMix: function onDataDownloadedFromMix(cDP, chartSymbolObj) {
            this.queryData(chartSymbolObj);
            this._calculateIndexingFactors();

            if (cDP.onDataChunk && _ember.default.$.isFunction(cDP.onDataChunk)) {
                _utils.default.logger.logInfo('Data From Server ' + chartSymbolObj.sym);

                cDP.onDataChunk(chartSymbolObj);
            }
        },

        queryData: function queryData(chartSymbolObj) {
            try {
                if (chartSymbolObj) {
                    var that = this;
                    var ohlcSeries = _sharedService.default.getService('price').ohlcDS.getOHLCSeries(chartSymbolObj.exg, chartSymbolObj.sym, that.chartCategory);
                    var techScoreSeries = this.priceService.technicalScoreDS.getTechnicalScoreSeries(chartSymbolObj.exg, chartSymbolObj.sym, that.chartCategory);
                    var ohlcPointsArray = [];

                    if (ohlcSeries.ohlcDataPoints.length > 0) {
                        var date = new Date();

                        date.setHours(0);
                        date.setMinutes(0);
                        date.setSeconds(0);

                        switch (this.chartViewPeriod.ID) {
                            case _chartCoreConstants.default.ChartViewPeriod.OneDay.ID:
                                // date.getTime() : relevant code line is set in below
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TwoDay.ID:
                                date.setDate(date.getDate() - _chartCoreConstants.default.ChartDefaultDataPeriod.TwoDay);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.FiveDay.ID:
                                date.setDate(date.getDate() - _chartCoreConstants.default.ChartDefaultDataPeriod.FiveDay);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.OneMonth.ID:
                                date.setMonth(date.getMonth() - 1);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.ThreeMonth.ID:
                                date.setMonth(date.getMonth() - 3);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.SixMonth.ID:
                                date.setMonth(date.getMonth() - 6);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.OneYear.ID:
                                date.setYear(date.getFullYear() - 1);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TwoYear.ID:
                                date.setYear(date.getFullYear() - 2);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.ThreeYear.ID:
                                date.setYear(date.getFullYear() - 3);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.FiveYear.ID:
                                date.setYear(date.getFullYear() - 5);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.TenYear.ID:
                                date.setYear(date.getFullYear() - 10);
                                break;

                            case _chartCoreConstants.default.ChartViewPeriod.YTD.ID:
                                date.setMonth(0);
                                date.setDate(1);
                                break;

                            default:
                                _utils.default.logger.logWarning('Unknown chart view period...!');
                        }

                        ohlcPointsArray = ohlcSeries.queryPointsForRange(date.getTime());

                        if (techScoreSeries.dataPoints.length > 0) {
                            var techScoreSeriesIndex = 0,
                                ohlcSeriesIndex = 0;

                            while (ohlcPointsArray.length > ohlcSeriesIndex && techScoreSeries.dataPoints.length > techScoreSeriesIndex) {
                                if (ohlcPointsArray[ohlcSeriesIndex].DT > techScoreSeries.dataPoints[techScoreSeriesIndex].DT) {
                                    techScoreSeriesIndex++;
                                } else if (ohlcPointsArray[ohlcSeriesIndex].DT < techScoreSeries.dataPoints[techScoreSeriesIndex].DT) {
                                    ohlcSeriesIndex++;
                                } else {
                                    _ember.default.set(ohlcPointsArray[ohlcSeriesIndex], 'techScore', techScoreSeries.dataPoints[techScoreSeriesIndex].techScore);
                                    ohlcSeriesIndex++;
                                    techScoreSeriesIndex++;
                                }
                            }
                        }
                    }

                    chartSymbolObj.chartPointArray = ohlcPointsArray;
                }
            } catch (e) {
                _utils.default.logger.logError('Error in querying ohlc data : ' + e);
            }
        }
    });
});
define('universal-app/controllers/chart/pro-chart-tab', ['exports', '../base-controller'], function (exports, _baseController) {
  'use strict';

  exports.default = _baseController.default.extend({});
});
define('universal-app/controllers/chart/pro-chart', ['exports', 'ember', './core/utils/chart-core-constants', './core/utils/chart-studies', '../../components/global-search', '../../config/user-settings', '../../models/shared/language/language-data-store', './chart-base', '../controller-factory', '../../helpers/responsive-handler', '../../config/app-config', './core/utils/chart-utils', './core/utils/chart-formatters'], function (exports, _ember, _chartCoreConstants, _chartStudies, _globalSearch, _userSettings, _languageDataStore, _chartBase, _controllerFactory, _responsiveHandler, _appConfig, _chartUtils, _chartFormatters) {
    'use strict';

    exports.default = _chartBase.default.extend({
        dimensions: {
            w: 6,
            h: 36
        },

        app: _languageDataStore.default.getLanguageObj(),
        // Default settings
        gridSetting: _chartCoreConstants.default.ProChartGridStyle.Both,

        // Data label on Chart
        pointOpen: '',
        pointHigh: '',
        pointLow: '',
        pointClose: '',
        // pointVolume: '',

        // Drop down lists
        definedPeriodsMap: {},
        definedIntervalsMap: {},
        definedIndicatorsMap: {},
        techStudies: [],
        lineStudies: [],
        comparisonSyms: [],

        // Symbol label on Chart
        symbolLabel: '',

        // Tool bar settings
        crossHairEnabled: false,
        selectedLineStudy: '',

        // Observable for language changes
        currentLang: _languageDataStore.default.getChangeLanguageObj(), // Todo: [Ravindu] Use onLangChange()

        // Full Screen parameters
        previousParent: null,
        previousWatchListStyleAttribute: null,
        previousFullScreenContainerStyleAttribute: null,
        isFullScreenMode: false,

        // Tab Dropdown parameters
        isPeriodsDropdown: false,
        isChartRespDisabled: true,

        isZoomResetEnabled: false,

        isTablet: _appConfig.default.customisation.isTablet,
        showWidgetButtons: true,
        creatingNewInd: true,
        indexingBtnEnabled: true,

        searchSymbolKey: function () {
            return 'searchSym' + this.get('wkey');
        }.property(),

        compareSymbolKey: function () {
            return 'compareSym' + this.get('wkey');
        }.property(),

        chartCategories: function () {
            var arrCategories = _ember.default.A();
            var that = this;
            var category = null;
            // Display name is changed when changing a language
            var selectedCategory = that.get('chartCategory');

            _ember.default.set(selectedCategory, 'DisplayName', that.get('app').lang.labels[selectedCategory.LanguageTag]);

            _ember.default.$.each(_chartCoreConstants.default.ChartCategory, function (key) {
                category = _chartCoreConstants.default.ChartCategory[key];
                _ember.default.set(category, 'DisplayName', that.get('app').lang.labels[category.LanguageTag]);
                arrCategories.pushObject(category);
            });

            return arrCategories;
        }.property('currentLang.lang'),

        setTabletConfigs: function () {
            this.set('showWidgetButtons', !_appConfig.default.customisation.isTablet);
        }.on('init'),

        initializeResponsive: function initializeResponsive() {
            this.set('responsive', _responsiveHandler.default.create({
                controller: this,
                widgetId: 'proChartContainer-' + this.get('wkey'),
                callback: this.onResponsive
            }));

            this.responsive.addList('chart-right', [{ id: 'period-dropdown', width: 5 }, { id: 'chartCategories-dropdown', width: 5 }, { id: 'intervals-dropdown', width: 5 }, { id: 'chartStyles-dropdown', width: 5 }, { id: 'chart-search', width: 5 }, { id: 'chart-compare', width: 5 }, { id: 'chart-compare', width: 5 }]);

            this.responsive.initialize();
        },

        onResponsive: function onResponsive(responsiveArgs) {
            var controller = responsiveArgs.controller;
            var chartContainer = _ember.default.$('#proChartContainer-' + controller.get('wkey'));

            // Periods Dropdown
            var periodsDropdown = chartContainer.find('#periodsDropdown-' + controller.get('wkey'));
            var periodsDropdownResLocation = chartContainer.find('#periodsDropdownResLocation-' + controller.get('wkey'));
            var periodsDropdownContainer = chartContainer.find('#periodsDropdownContainer-' + controller.get('wkey'));

            // Chart Compare
            var chartCompare = chartContainer.find('#chartCompare-' + controller.get('wkey'));
            var chartCompareResLocation = chartContainer.find('#chartCompareResLocation-' + controller.get('wkey'));
            var chartCompareContainer = chartContainer.find('#chartCompareContainer-' + controller.get('wkey'));

            if (responsiveArgs.responsiveLevel >= 1) {
                controller.set('isPeriodsDropdown', true);
            } else {
                controller.set('isPeriodsDropdown', false);
            }

            if (responsiveArgs.responsiveLevel >= 7) {
                controller.set('isPeriodsDropdown', false);
                controller.set('isChartRespDisabled', false);
                periodsDropdown.appendTo(periodsDropdownResLocation);
                chartCompare.appendTo(chartCompareResLocation);
            } else {
                controller.set('isChartRespDisabled', true);
                periodsDropdown.appendTo(periodsDropdownContainer);
                chartCompare.appendTo(chartCompareContainer);
            }
        },

        periods: function () {
            var arrPeriods = _ember.default.A();
            var vid = this.get('app').lang.labels;

            _ember.default.$.each(_chartCoreConstants.default.ProChartPeriodTab, function (key, value) {
                if (value) {
                    var chartperiod = _chartCoreConstants.default.ChartViewPeriod[key];
                    _ember.default.set(chartperiod, 'chartperiodTitle', vid[chartperiod.title]);
                    arrPeriods.pushObject(chartperiod);
                }
            });

            return arrPeriods;
        }.property('currentLang.lang'),

        intervals: function () {
            var selectedArr = this.get('definedIntervalsMap')[this.get('chartCategory').ID];
            var that = this;
            var chartInterval = null;
            // Display name is changed when changing a language
            var selectedInterval = that.get('chartInterval');

            _ember.default.set(selectedInterval, 'DisplayName', that.get('app').lang.labels[selectedInterval.LanguageTag]);

            if (selectedArr) {
                selectedArr.forEach(function (item) {
                    chartInterval = item;
                    _ember.default.set(chartInterval, 'DisplayName', that.get('app').lang.labels[chartInterval.LanguageTag]);
                });
            }

            return selectedArr;
        }.property('chartCategory', 'currentLang.lang'),

        chartStyles: function () {
            var arrStyles = _ember.default.A();
            var that = this;
            var chartStyle = null;
            // Display name is changed when changing a language
            var selectedStyle = that.get('chartStyle');

            _ember.default.set(selectedStyle, 'DisplayName', that.get('app').lang.labels[selectedStyle.LanguageTag]);

            _ember.default.$.each(_chartCoreConstants.default.ProChartViewStyle, function (index, key) {
                chartStyle = _chartCoreConstants.default.ChartStyle[key];
                _ember.default.set(chartStyle, 'DisplayName', that.get('app').lang.labels[chartStyle.LanguageTag]);
                arrStyles.pushObject(chartStyle);
            });

            return arrStyles;
        }.property('currentLang.lang'),

        allIndicators: function () {
            var that = this;
            var arrIndicators = _ember.default.A();

            if (_appConfig.default.chartConfig && _appConfig.default.chartConfig.chartIndicators && _appConfig.default.chartConfig.chartIndicators.length > 0) {
                _ember.default.$.each(_appConfig.default.chartConfig.chartIndicators, function (key, value) {
                    var indicatorObj = _chartStudies.default.Indicators[value];
                    _ember.default.set(indicatorObj, 'DisplayName', that.get('app').lang.labels[indicatorObj.LanguageTag]);
                    arrIndicators.pushObject(indicatorObj);
                });
            }

            return arrIndicators;
        }.property('currentLang.lang'),

        averageIndicators: function () {
            var avgArr = this.get('definedIndicatorsMap')[_chartStudies.default.IndicatorCategories.Averages];
            var that = this;
            var avgIndi = null;

            if (avgArr) {
                avgArr.forEach(function (item) {
                    avgIndi = item;
                    _ember.default.set(avgIndi, 'DisplayName', that.get('app').lang.labels[avgIndi.LanguageTag]);
                });
            }

            return avgArr;
        }.property('currentLang.lang'),

        bandIndicators: function () {
            var bandArr = this.get('definedIndicatorsMap')[_chartStudies.default.IndicatorCategories.Bands];
            var that = this;
            var bandIndi = null;

            if (bandArr) {
                bandArr.forEach(function (item) {
                    bandIndi = item;
                    _ember.default.set(bandIndi, 'DisplayName', that.get('app').lang.labels[bandIndi.LanguageTag]);
                });
            }

            return bandArr;
        }.property('currentLang.lang'),

        otherIndicators: function () {
            var otherArr = this.get('definedIndicatorsMap')[_chartStudies.default.IndicatorCategories.Others];
            var that = this;
            var otherIndi = null;

            if (otherArr) {
                otherArr.forEach(function (item) {
                    otherIndi = item;
                    _ember.default.set(otherIndi, 'DisplayName', that.get('app').lang.labels[otherIndi.LanguageTag]);
                });
            }

            return otherArr;
        }.property('currentLang.lang'),

        gridTypes: function () {
            var arrGridTypes = _ember.default.A();
            var that = this;
            var grid = null;

            _ember.default.$.each(_chartCoreConstants.default.ProChartGridStyle, function (key) {
                grid = _chartCoreConstants.default.ProChartGridStyle[key];
                _ember.default.set(grid, 'DisplayName', that.get('app').lang.labels[grid.LanguageTag]);
                arrGridTypes.pushObject(grid);
            });

            return arrGridTypes;
        }.property('currentLang.lang'),

        // This is showing latest LTP price. but this will mismatch with current drawn data.
        symbolLTP: function () {
            if (this.get('symbolObj')) {
                return this.utils.formatters.formatNumber(this.get('symbolObj').ltp, this.get('symbolObj').deci);
            }

            return _userSettings.default.displayFormat.noValue;
        }.property('symbolObj.ltp'),

        symbolCHG: function () {
            if (this.get('symbolObj')) {
                return '(' + this.utils.formatters.formatNumber(this.get('symbolObj').chg, this.get('symbolObj').deci) + ')';
            }

            return _userSettings.default.displayFormat.noValue;
        }.property('symbolObj.chg'),

        symbolPCTCHG: function () {
            if (this.get('symbolObj')) {
                return this.utils.formatters.formatNumber(this.get('symbolObj').pctChg, this.get('symbolObj').deci) + '%';
            }

            return _userSettings.default.displayFormat.noValue;
        }.property('symbolObj.chg'),

        chgColorCSS: function () {
            var symbolObj = this.get('symbolObj');

            if (symbolObj) {
                return symbolObj.pctChg > 0 ? 'chg-up-labels' : symbolObj.pctChg === 0 ? 'chg-none-labels' : 'chg-down-labels';
            }

            return 'chg-up-labels';
        }.property('symbolObj.chg'),

        trendIconCSS: function () {
            var symbolObj = this.get('symbolObj');

            if (symbolObj) {
                return symbolObj.pctChg > 0 ? 'up-fore-color glyphicon-triangle-top' : symbolObj.pctChg < 0 ? 'down-fore-color glyphicon-triangle-bottom' : 'glyphicon-triangle-top';
            }

            return 'glyphicon-triangle-top';
        }.property('symbolObj.chg'),

        toggleZoomCss: function () {
            if (this.isZoomResetEnabled) {
                return 'fade-fore-color';
            } else {
                return 'light-bg-fore-color';
            }
        }.property('isZoomResetEnabled'),

        chartDisplayInterval: function () {
            if (this.get('chartInterval')) {
                return this.get('app').lang.labels[this.get('chartInterval').LanguageTag];
            }

            return _userSettings.default.displayFormat.noValue;
        }.property('chartInterval', 'currentLang.lang'),

        chartPeriod: function () {
            if (this.get('chartViewPeriod')) {
                return this.get('app').lang.labels[this.get('chartViewPeriod').title];
            }

            return _userSettings.default.displayFormat.noValue;
        }.property('chartViewPeriod', 'currentLang.lang'),

        // Base overrides
        onLoadWidget: function onLoadWidget() {
            this._super();

            // Initialize interval and indicator items for drop-downs

            this._loadChartIntervals();
            this._loadIndicators();

            this.set('collapseOverlay', _ember.default.$('#collapseOverlay'));
        },

        // Base overrides
        onUnloadWidget: function onUnloadWidget() {
            this._super();
            this.set('chartDrawings', null);
        },

        onClearData: function onClearData() {
            this._super();

            this._displayStudyValuesMouseOnChart({}, 0);
        },

        // Chart Base overrides
        onDataFromMix: function onDataFromMix(chartSymbolObj) {
            var baseChart = this.get('baseChart');

            this.hideDataErrorMessage();
            this.stopLoadingProgress();
            this.set('isDataAvailable', chartSymbolObj.chartPointArray.length !== 0);

            if (baseChart) {
                this.utils.logger.logInfo('Data From Server - Pro Chart ' + chartSymbolObj.sym);

                baseChart.onReceivedData(chartSymbolObj);
            } else {
                this.set('reloadChartData', chartSymbolObj);
            }
        },

        chartContainer: function () {
            return ['chartContainer pro-chart-container', this.get('wkey')].join('');
        }.property(),

        // Base overrides
        onAfterRender: function onAfterRender() {
            // All pro chart instances shared the same dom container since both use same class to fetch container.
            // It causes second loaded chart is painted on first loaded chart.
            var that = this;

            this.set('loadingTimer', _ember.default.run.later(function () {
                // var dpi = Ember.$('#dpi')[0].offsetWidth;
                var chartContainerCls = ['.', 'pro-chart-container', that.get('wkey')].join('');

                if (chartContainerCls) {
                    that.initChart({ chartContainerCls: chartContainerCls /* , dpi: dpi*/ });
                } else {
                    that.utils.logger.logError('Pro-chart container not found.');
                }
            }, 1000));

            this.bindMousetrap();
        },

        bindMousetrap: function bindMousetrap() {
            var that = this;
            var widgetId = this.get('wkey');

            Mousetrap.bind('esc', function () {
                that.dismissStudyDialog();
            }, widgetId);
        },

        // Chart Base overrides
        initChart: function initChart(params) {
            var that = this;

            try {
                this._super(params);

                // Select tab for initial view period
                this._setSelectedTab();
                that._addContainerEventListener();

                this.baseChart.pointOnChartFN = function (point) {
                    that._displayPointMouseOnChart(point);
                };
            } catch (e) {
                that.utils.logger.logError('Error in init from ProChart ' + e);
            }
        },

        onFinishDrawingLineStudy: function onFinishDrawingLineStudy(params) {
            _ember.default.$('#' + params.type).removeClass('active');
        },

        prependMouseOut: function prependMouseOut() {
            this.set('pointOpen', '');
            this.set('pointHigh', '');
            this.set('pointLow', '');
            this.set('pointClose', '');
            // this.set('pointVolume', '');
        },

        // Chart Base overrides
        onLoadLayout: function onLoadLayout() {
            var that = this;

            try {
                this.baseChart.setCrossHair(this.get('crossHairEnabled'));
                this.baseChart.setGridType(this.get('gridSetting'));
            } catch (e) {
                this.utils.logger.logError('Error in loading layout - Settings ' + e);
            }

            try {
                that.baseChart.addChartFromSDArray(this.get('techStudies'));
            } catch (e) {
                this.utils.logger.logError('Error in loading layout - Indicators ' + e);
            }

            try {
                _ember.default.$.each(this.get('lineStudies'), function (index, sd) {
                    that.baseChart.addLineStudyFromSD(sd);
                });
            } catch (e) {
                this.utils.logger.logError('Error in loading layout - Line Studies ' + e);
            }

            try {
                _ember.default.$.each(this.get('comparisonSyms'), function (index, params) {
                    that._onComparison(params);
                });
            } catch (e) {
                this.utils.logger.logError('Error in loading comparison symbols ' + e);
            }
        },

        // Chart Base overrides
        onAfterFinishedDrawingChart: function onAfterFinishedDrawingChart(callbackType, params) {
            this._onDisplayAddedStudies();
            this._setPositionZoomAndSymbolDesPanels();
            this._saveStudies();
            this.getSubMarket();

            switch (callbackType) {
                case _chartCoreConstants.default.chartDrawCallbackTypes.LineStudy:
                    this.onFinishDrawingLineStudy(params);
                    break;

                default:
                    return;
            }
        },

        _addContainerEventListener: function _addContainerEventListener() {
            var that = this;

            _ember.default.$(function () {
                var chartContainer = _ember.default.$('#chartContainer')[0];

                if (chartContainer.addEventListener) {
                    chartContainer.addEventListener('mousewheel', function (ev) {
                        that._mouseEvent(ev);
                    }, false); // IE9, Chrome, Safari, Opera

                    chartContainer.addEventListener('DOMMouseScroll', function (ev) {
                        that._mouseEvent(ev);
                    }, false); // Firefox
                } else {
                    chartContainer.attachEvent('onmousewheel', function (ev) {
                        that._mouseEvent(ev);
                    }); // IE 6/7/8
                }
            });
        },


        _mouseEvent: function _mouseEvent(ev) {
            if (this.baseChart) {
                this.baseChart.mouseWheelEventHandler(ev);
                this.set('isZoomResetEnabled', this.baseChart.calcDP.isZoomedDataArray);
            }
        },

        _onDisplayAddedStudies: function _onDisplayAddedStudies() {
            try {
                var baseChart = this.baseChart;

                if (baseChart) {
                    var that = this;
                    var chartDiv = _ember.default.$('#chartContainer')[0];
                    var studyViews = chartDiv.querySelectorAll('.dynamic-study-view');
                    var liEl = void 0,
                        keySpan = void 0,
                        settingSpan = void 0,
                        icon = void 0,
                        valDiv = void 0,
                        cp = void 0,
                        ulEl = void 0,
                        ulElComp = void 0,
                        padTop = void 0,
                        plotsVal = [],
                        valUl = void 0,
                        plotsValLi = void 0,
                        plotsValSpan = void 0,
                        deci = void 0,
                        pVal = void 0,
                        innerColor = void 0,
                        settingsButton = void 0,
                        compSymCloseSpan = void 0,
                        compareRect = void 0,
                        compareLbl = void 0,
                        compareCloseIcon = void 0,
                        compareRectColor = void 0,
                        plotInfo = void 0;

                    try {
                        for (var i = studyViews.length - 1; i >= 0; i--) {
                            chartDiv.removeChild(studyViews[i]); // Removing previous content if there was
                        }

                        _chartUtils.default.clearNode(_ember.default.$('#dynamic-study-view')[0]);
                    } catch (e) {
                        this.utils.logger.logError('Error in clear nodes ' + e);
                    }

                    var strategyFunc = function strategyFunc(index, strategy) {
                        if (strategy && baseChart.calcDP.dataSource && baseChart.calcDP.dataSource.length > 0) {
                            cp = strategy.cp;

                            if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Indicator) {
                                plotsVal = [];

                                for (var _i = 0; _i < cp.plotInfos.length; _i++) {
                                    plotInfo = cp.plotInfos[_i];

                                    if (plotInfo.innerPlots && plotInfo.innerPlots.length > 0) {
                                        pVal = _chartUtils.default.lastNotNullVal(baseChart.calcDP.dataSource, _chartCoreConstants.default.OHLCFields.Close)[plotInfo.propertyKey];
                                        deci = _chartFormatters.default.getDecimalFormatter(pVal);
                                        innerColor = plotInfo[Object.keys(plotInfo.innerPlots[0])[1]];

                                        plotsVal[_i] = {
                                            value: that.utils.formatters.formatNumber(pVal, deci),
                                            color: innerColor,
                                            propertyKey: plotInfo.propertyKey
                                        };
                                    }
                                }

                                liEl = document.createElement('li');
                                keySpan = document.createElement('span');
                                settingSpan = document.createElement('span');

                                liEl.className = 'pad-s-t fade-fore-color';
                                settingSpan.className = 'pad-s-lr';

                                icon = _ember.default.$('<i/>', {
                                    class: 'icon-fore-color icon-chart-settings-close cursor-pointer',
                                    on: {
                                        click: function click() {
                                            try {
                                                if (this.strategy.cp.propertyKey.toUpperCase() === 'VOLUME') {
                                                    that.set('volumeViewEnabled', false);
                                                    _ember.default.$('#volume-btn').removeClass('active');
                                                }

                                                baseChart.removeAddedChart(this.strategy.strategyId);
                                            } catch (e) {
                                                that.utils.logger.logError('Error in remove chart' + e);
                                            }
                                        }
                                    }
                                })[0];

                                settingsButton = _ember.default.$('<i/>', {
                                    class: 'icon-fore-color icon-chart-settings-set cursor-pointer pad-s-lr',
                                    on: {
                                        click: function click() {
                                            try {
                                                baseChart.openDialog(this.strategy.cp.studyKey, this.strategy);
                                                that.set('creatingNewInd', false);

                                                that.utils.analyticsService.trackEvent(that.get('gaKey'), _chartCoreConstants.default.ChartGAActions.indAdded, ['ind:', this.strategy.cp.name].join(''));
                                            } catch (e) {
                                                that.utils.logger.logError('Error in opening popup' + e);
                                            }
                                        }
                                    }
                                })[0];

                                icon.strategy = strategy;
                                settingsButton.strategy = strategy;

                                keySpan.className = 'font-m fade-fore-color ltr';
                                settingSpan.setAttribute('style', 'display:inline-block; vertical-align:middle');

                                valDiv = document.createElement('div');
                                valDiv.className = 'pad-s-lr';
                                valDiv.setAttribute('style', 'display:inline-block; vertical-align:middle');

                                valUl = document.createElement('ul');
                                valUl.className = 'hu left';
                                valUl.setAttribute('style', 'float: left');

                                keySpan.appendChild(document.createTextNode(cp.propertyKey));

                                for (var j = 0; j < plotsVal.length; j++) {
                                    plotsValLi = document.createElement('li');
                                    plotsValSpan = document.createElement('span');

                                    plotsValSpan.className = 'font-m fade-fore-color ' + plotsVal[j].propertyKey;
                                    plotsValSpan.style.color = plotsVal[j].color.replace('0X', '#');

                                    plotsValSpan.appendChild(document.createTextNode(plotsVal[j].value));

                                    plotsValLi.appendChild(plotsValSpan);
                                    valUl.appendChild(plotsValLi);
                                }

                                liEl.appendChild(keySpan);

                                if (cp.isOpenDialog === true) {
                                    settingSpan.appendChild(settingsButton);
                                }

                                settingSpan.appendChild(icon);
                                liEl.appendChild(settingSpan);
                                valDiv.appendChild(valUl);
                                liEl.appendChild(valDiv);
                                ulEl.appendChild(liEl);
                            } else if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Compare) {
                                liEl = document.createElement('li');
                                compSymCloseSpan = document.createElement('span');
                                compSymCloseSpan.setAttribute('style', 'display:inline-block; vertical-align:middle');

                                try {
                                    compareRect = _ember.default.$('<i/>', {
                                        class: 'glyphicon glyphicon-stop'
                                    })[0];

                                    compareRectColor = cp.plotInfos[0].lineColor.replace('0X', '#');
                                    compareRect.setAttribute('style', 'color: ' + compareRectColor);

                                    compareLbl = document.createElement('span');
                                    compareLbl.className = 'font-l pad-m-l';
                                    compareLbl.setAttribute('style', 'color: ' + compareRectColor);
                                    compareLbl.appendChild(document.createTextNode(cp.symObj.sym));

                                    compareCloseIcon = _ember.default.$('<i/>', {
                                        class: 'icon-fore-color icon-chart-settings-close cursor-pointer pad-m-l',
                                        on: {
                                            click: function click() {
                                                try {
                                                    baseChart.calcDP.removeCompareSymbol(this.strategy.cp);
                                                    baseChart.removeAddedChart(this.strategy.strategyId);
                                                } catch (e) {
                                                    that.utils.logger.logError('Error in remove chart');
                                                }
                                            }
                                        }
                                    })[0];

                                    compareCloseIcon.strategy = strategy;

                                    liEl.appendChild(compareRect);
                                    liEl.appendChild(compareLbl);
                                    compSymCloseSpan.appendChild(compareCloseIcon);
                                    liEl.appendChild(compSymCloseSpan);
                                    ulElComp.appendChild(liEl);
                                } catch (e) {
                                    that.utils.logger.logError('Error in ' + e);
                                }
                            }
                        }
                    };

                    _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                        if (component.chartStrategies.length > 0) {
                            ulEl = document.createElement('ul');
                            ulElComp = document.createElement('ul');

                            if (index > 0) {
                                padTop = component.properties.top - 10;

                                ulEl.className = 'stx-chart-summary-label dynamic-study-view ltr';
                                ulEl.setAttribute('style', 'margin-top: ' + padTop + 'px');

                                chartDiv.insertBefore(ulEl, chartDiv.querySelectorAll('#chartCanvas')[0]);
                            } else {
                                ulEl.setAttribute('style', 'list-style-type: none');
                                ulElComp.setAttribute('style', 'list-style-type: none');

                                _ember.default.$('#dynamic-study-view')[0].appendChild(ulElComp);
                                _ember.default.$('#dynamic-study-view')[0].appendChild(ulEl);
                            }

                            _ember.default.$.each(component.chartStrategies, strategyFunc);
                        }
                    });
                }
            } catch (e) {
                this.utils.logger.logError('Error in display studies' + e);
            }
        },

        _setPositionZoomAndSymbolDesPanels: function _setPositionZoomAndSymbolDesPanels() {
            try {
                var zoomPanel = _ember.default.$('.zoom-panel')[0];
                var symbolLDes = _ember.default.$('.chart-symbol-description-panel ')[0];
                var mainComponent = this.baseChart.chartComponents[0];
                var detailPanel = _ember.default.$('#detailPanelChart')[0];

                if (mainComponent) {
                    var properties = mainComponent.properties;

                    if (properties.ht > 0 && properties.wd > 0) {
                        var top = properties.y + properties.ht - properties.clearance; // (top - 23) : Zoom button height 20
                        var left = properties.x + properties.wd / 2 - 3 * 23 / 2; // Zoom button width 22

                        zoomPanel.setAttribute('style', 'top: ' + (top - 23) + 'px; left: ' + left + 'px; z-index: 100; position: absolute; float: left; display: visible');
                        symbolLDes.setAttribute('style', 'top: ' + (top - 10) + 'px; left: ' + properties.x + 'px; z-index: 100; position: absolute;display: visible;');
                        detailPanel.setAttribute('style', 'width: ' + properties.wd + 'px; height: ' + properties.ht + 'px; float: left; display: visible; top: 60px;');
                    }
                }
            } catch (e) {
                this.utils.logger.logError('Error in Set Position Zoom Panel' + e);
            }
        },

        _saveStudies: function _saveStudies() {
            try {
                var baseChart = this.baseChart;
                var cp = void 0;

                this.set('techStudies', []);
                this.set('lineStudies', []);
                this.set('comparisonSyms', []);

                var techStudies = this.get('techStudies');
                var lineStudies = this.get('lineStudies');
                var comparisonSyms = this.get('comparisonSyms');

                var strategyFunc = function strategyFunc(index, strategy) {
                    if (strategy) {
                        cp = strategy.cp;

                        if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Indicator) {
                            techStudies.push({
                                studyKey: cp.propertyKey.toUpperCase() === 'VOLUME' ? _chartStudies.default.Indicators.Vol.ChartIndID : cp.studyKey,
                                inputs: cp.inputs,
                                overlay: cp.overlay,
                                isOpenDialog: cp.isOpenDialog,
                                plotInfos: cp.plotInfos
                            });
                        } else if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.LineStudy) {
                            lineStudies.push({
                                key: cp.name, // Todo: [Ravindu] Use other field to keep line study id
                                point: strategy.mouse,
                                plotInfos: cp.plotInfos,
                                strategyId: strategy.strategyId
                            });
                        } else if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Compare) {
                            comparisonSyms.push({
                                symObj: cp.symObj,
                                colorIndex: strategy.randomColorIndex,
                                lineColor: cp.plotInfos[0].lineColor
                            });
                        }
                    }
                };

                if (baseChart) {
                    _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                        _ember.default.$.each(component.chartStrategies, strategyFunc);
                    });
                }

                this.saveWidget({
                    techStudies: techStudies,
                    lineStudies: lineStudies,
                    comparisonSyms: comparisonSyms
                });
            } catch (e) {
                this.utils.logger.logError('Error in save studies' + e);
            }
        },

        // Chart Base overrides
        onCheckVolumeChartEnabler: function onCheckVolumeChartEnabler() {
            if (!this.get('volumeViewEnabled') && !this.get('volumeStudyDescriptor')) {
                return true; // Chart fresh load - Volume is shown
            }

            // Chart load from save status - Volume was added onLoadLayout and agin volume adding is blocked here

            if ((!this.get('volumeViewEnabled') || this.get('volumeViewEnabled') === '') && this.get('volumeStudyDescriptor')) {
                this.set('volumeViewEnabled', true); // Volume is already added
                _ember.default.$('#volume-btn').toggleClass('active');
            } else {
                this.set('volumeViewEnabled', false); // Volume was removed
            }

            return false;
        },

        onDisplayVolume: function onDisplayVolume() {
            this._super();

            if (this.get('volumeViewEnabled')) {
                _ember.default.$('#volume-btn').addClass('active');
            } else {
                _ember.default.$('#volume-btn').removeClass('active');
            }
        },

        onPriceExchangeSummaryMetaReady: function onPriceExchangeSummaryMetaReady() {
            this.getSubMarket();
        },

        getSubMarket: function getSubMarket() {
            var that = this;
            var subMarketArray = this.get('exchange.subMarketArray');
            var subMarket;

            if (subMarketArray && subMarketArray.length > 0) {
                _ember.default.$.each(subMarketArray, function (key, value) {
                    if (value.marketId === that.get('symbolObj').subMkt) {
                        subMarket = value.lDes;
                    }
                });
            }

            this.set('subMarket', subMarket);
        },

        _displayPointMouseOnChart: function _displayPointMouseOnChart(point) {
            try {
                var baseChart = this.get('baseChart');
                this.prependMouseOut();

                if (this.collapseOverlay.css('display') !== 'block') {
                    if (baseChart && point) {
                        var deci = this.get('symbolObj').deci;
                        deci = deci === '-1' ? 2 : deci;

                        this.set('pointDate', this.utils.moment(point.DT).format(_userSettings.default.displayFormat.dateFormat));
                        this.set('pointOpen', this.utils.formatters.formatNumber(point.Open, deci));
                        this.set('pointHigh', this.utils.formatters.formatNumber(point.High, deci));
                        this.set('pointLow', this.utils.formatters.formatNumber(point.Low, deci));
                        this.set('pointClose', this.utils.formatters.formatNumber(point.Close, deci));
                        this.set('pointVolume', this.utils.formatters.formatNumber(point.Volume, 0));
                        this.set('pointTurnover', this.utils.formatters.formatNumber(point.Turnover, deci));

                        this._displayStudyValuesMouseOnChart(point, deci);
                    }
                }
            } catch (e) {
                this.utils.logger.logError('Error in prependHeadsUpHR of Pro Chart : ' + e);
            }
        },

        _displayStudyValuesMouseOnChart: function _displayStudyValuesMouseOnChart(point, deci) {
            var cp = void 0,
                valSpan = void 0,
                plotVal = void 0;
            var that = this;
            var baseChart = this.get('baseChart');

            var strategyFunc = function strategyFunc(index, strategy) {
                if (strategy) {
                    cp = strategy.cp;

                    if (cp.chartStudyType === _chartCoreConstants.default.ChartStudyType.Indicator) {
                        for (var i = 0; i < cp.plotInfos.length; i++) {
                            try {
                                valSpan = document.getElementsByClassName(cp.plotInfos[i].propertyKey)[0];

                                if (valSpan) {
                                    plotVal = point[cp.plotInfos[i].propertyKey];
                                    plotVal = plotVal ? plotVal : '';
                                    valSpan.innerHTML = that.utils.formatters.formatNumber(plotVal, cp.propertyKey.toUpperCase() === 'VOLUME' ? 0 : deci);
                                }
                            } catch (e) {
                                that.utils.logger.logError('Error in update studies point when mouse is over a point : ' + e);
                            }
                        }
                    }
                }
            };

            if (baseChart) {
                _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                    if (component.chartStrategies.length > 0) {
                        _ember.default.$.each(component.chartStrategies, strategyFunc);
                    }
                });
            }
        },

        _loadChartIntervals: function _loadChartIntervals() {
            var intraArray = _ember.default.A();
            var hisArray = _ember.default.A();
            var intervalsMap = this.get('definedIntervalsMap');
            var viewIntervalObj = null;

            intervalsMap[_chartCoreConstants.default.ChartCategory.Intraday.ID] = intraArray;
            intervalsMap[_chartCoreConstants.default.ChartCategory.History.ID] = hisArray;

            _ember.default.$.each(_chartCoreConstants.default.ProChartViewInterval, function (key, value) {
                if (value) {
                    viewIntervalObj = _chartCoreConstants.default.ChartViewInterval[key];

                    if (viewIntervalObj.IsHistory) {
                        hisArray.pushObject(viewIntervalObj);
                    } else {
                        intraArray.pushObject(viewIntervalObj);
                    }
                }
            });
        },

        _loadIndicators: function _loadIndicators() {
            var averagesArray = _ember.default.A();
            var bandsArray = _ember.default.A();
            var otherIndicator = _ember.default.A();
            var indicatorsMap = this.get('definedIndicatorsMap');

            indicatorsMap[_chartStudies.default.IndicatorCategories.Averages] = averagesArray;
            indicatorsMap[_chartStudies.default.IndicatorCategories.Bands] = bandsArray;
            indicatorsMap[_chartStudies.default.IndicatorCategories.Others] = otherIndicator;

            // Adding indicators
            if (_appConfig.default.chartConfig && _appConfig.default.chartConfig.chartIndicators && _appConfig.default.chartConfig.chartIndicators.length > 0) {
                _ember.default.$.each(_appConfig.default.chartConfig.chartIndicators, function (key, value) {
                    var indicatorObj = _chartStudies.default.Indicators[value];

                    switch (indicatorObj.Category) {
                        case _chartStudies.default.IndicatorCategories.Averages:
                            averagesArray.pushObject(indicatorObj);
                            break;

                        case _chartStudies.default.IndicatorCategories.Bands:
                            bandsArray.pushObject(indicatorObj);
                            break;

                        default:
                            otherIndicator.pushObject(indicatorObj);
                    }
                });
            }
        },

        _onChangeChartInterval: function () {
            var baseChart = this.get('baseChart');

            if (baseChart) {
                baseChart.setPeriodicity(this.get('chartCategory').RowTickFormat, this.get('chartInterval').PerSeconds);

                this.saveWidget({ chartInterval: this.get('chartInterval') });
            }
        }.observes('chartInterval'),

        _onChangeCategory: function _onChangeCategory(chartCategory) {
            try {
                var defaultPeriod = _chartCoreConstants.default.ChartViewPeriod[chartCategory.DefaultChartViewPeriod];
                var defaultInterval = _chartCoreConstants.default.ChartViewInterval[defaultPeriod.DefaultInterval];
                var previousViewPeriod = this.get('chartViewPeriod');
                var cDP = this.get('chartDataProvider');

                this.set('chartCategory', chartCategory);
                this.set('chartViewPeriod', defaultPeriod);
                this.set('chartInterval', defaultInterval);

                cDP.refineGraphData({
                    chartCategory: chartCategory,
                    chartDataLevel: defaultPeriod.ChartDataLevel,
                    chartViewPeriod: defaultPeriod
                });

                this.saveWidget({
                    chartCategory: chartCategory,
                    chartViewPeriod: defaultPeriod
                });

                this._setSelectedTab(previousViewPeriod);
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['mode:', chartCategory.LanguageTag].join(''));
            } catch (e) {
                this.utils.logger.logError('[pro Chart] setChartCategory() ' + e);
            }
        },

        _onChangePeriod: function _onChangePeriod(chartPeriod) {
            try {
                var isDifferentPeriod = this.get('chartViewPeriod').ID !== chartPeriod.ID;
                var baseChart = this.get('baseChart');

                if (baseChart && isDifferentPeriod) {
                    var cDP = this.get('chartDataProvider');
                    var differentCategory = this.get('chartViewPeriod').IsHistory !== chartPeriod.IsHistory;

                    this.set('chartViewPeriod', chartPeriod);

                    if (differentCategory) {
                        this.set('chartCategory', chartPeriod.IsHistory ? _chartCoreConstants.default.ChartCategory.History : _chartCoreConstants.default.ChartCategory.Intraday);
                        this.set('chartInterval', _chartCoreConstants.default.ChartViewInterval[chartPeriod.DefaultInterval]);
                    }

                    baseChart.clearChart();

                    cDP.refineGraphData({
                        chartCategory: this.get('chartCategory'),
                        chartDataLevel: chartPeriod.ChartDataLevel,
                        chartViewPeriod: chartPeriod
                    });

                    this.saveWidget({
                        chartCategory: this.get('chartCategory'),
                        chartViewPeriod: chartPeriod
                    });

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['period:', chartPeriod.DisplayName].join(''));
                }

                this.set('isZoomResetEnabled', false);
            } catch (e) {
                this.utils.logger.logError('[Pro Chart] setChartPeriod() ' + e);
            }
        },

        /* *
         * select relevance tab for selected period
         * @param previous view period : deselection
         */
        _setSelectedTab: function _setSelectedTab() {
            this.set('chartPeriodNewActive', this.get('chartViewPeriod'));
        },

        _enableCrossHair: function _enableCrossHair() {
            var baseChart = this.get('baseChart');

            if (baseChart) {
                if (!this.get('crossHairEnabled')) {
                    baseChart.setCrossHair(true);
                    this.set('crossHairEnabled', true);

                    this.saveWidget({ crossHairEnabled: true });

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, 'cross-hair:checked');
                } else {
                    baseChart.setCrossHair(false);
                    this.set('crossHairEnabled', false);

                    this.saveWidget({ crossHairEnabled: false });

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, 'cross-hair:unchecked');
                }
            }
        },

        toggleFullScreen: function toggleFullScreen() {
            this._super('proChartContainer-' + this.get('wkey'), this.get('wkey'));
        },

        setWidgetForScreenMode: function setWidgetForScreenMode() {
            var viewName = 'price/widgets/watch-list/index-watch-list';
            var watchListController = this.get('watchListController') || _controllerFactory.default.createController(this.container, 'controller:' + viewName);

            if (this.get('isFullScreenMode')) {
                watchListController.initializeWidget();
                var route = this.container.lookup('route:application');

                route.render(viewName, {
                    into: 'chart/pro-chart',
                    outlet: 'wlWidgetOutlet',
                    controller: watchListController
                });
            } else {
                watchListController.closeWidget();
            }
        },

        showSearchPopup: function showSearchPopup() {
            var modal = this.get(this.get('searchSymbolKey'));
            modal.send('showModalPopup');
        },

        showSearchComparePopup: function showSearchComparePopup() {
            var modal = this.get(this.get('compareSymbolKey'));
            modal.send('showModalPopup');
        },

        searchKeyDidChange: function () {
            var searchKey = this.get('searchKey');

            if (searchKey && searchKey.length) {
                _ember.default.run.debounce(this, this.showSearchPopup, 300);
            }
        }.observes('searchKey'),

        compareSearchKeyDidChange: function () {
            var searchKey = this.get('searchKeyCompare');

            if (searchKey && searchKey.length) {
                _ember.default.run.debounce(this, this.showSearchComparePopup, 300);
            }
        }.observes('searchKeyCompare'),

        dismissStudyDialog: function dismissStudyDialog() {
            var dialog = _ember.default.$('#studyDialog')[0];

            if (dialog) {
                dialog.style.display = 'none';
            }
        },

        _onComparison: function _onComparison(params) {
            var baseChart = this.get('baseChart');

            if (baseChart.sym !== params.symObj.sym) {
                baseChart.addCompareSymbol(params.symObj.exg, params.symObj.sym, params.lineColor, params.colorIndex);

                var cDP = this.get('chartDataProvider');
                var chartSymbol = cDP.addChartSymbol(params.symObj.exg, params.symObj.sym);

                cDP.addChartDataSubscription(chartSymbol);

                this.set('searchKeyCompare', '');
                this.utils.analyticsService.trackEvent(this.get('gaKey'), _chartCoreConstants.default.ChartGAActions.compare, ['sym:', params.symObj.sym, '~', params.symObj.exg].join(''));
            }
        },


        actions: {
            setChartCategory: function setChartCategory(chartCategory) {
                this._onChangeCategory(chartCategory);
            },

            setChartPeriod: function setChartPeriod(chartPeriod) {
                this._onChangePeriod(chartPeriod);
            },

            setChartInterval: function setChartInterval(option) {
                this.set('chartInterval', option);
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['interval:', option.LanguageTag].join(''));
            },

            setChartStyle: function setChartStyle(option) {
                var baseChart = this.get('baseChart');

                this.set('chartStyle', option);
                baseChart.setChartType(option);

                this.saveWidget({ chartStyle: option });

                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['style:', option.LanguageTag].join(''));
            },

            setChartGridStyle: function setChartGridStyle(option) {
                var baseChart = this.get('baseChart');

                if (baseChart) {
                    this.set('gridSetting', option);

                    this.saveWidget({ gridSetting: option });

                    baseChart.setGridType(option);
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['grid:', option.LanguageTag].join(''));
                }
            },

            createStudy: function createStudy() {
                try {
                    this.get('baseChart').modifyChartStrategy(_ember.default.$('#studyDialog')[0]);
                    this.dismissStudyDialog();
                } catch (e) {
                    this.utils.logger.logError('Error in create study');
                }
            },

            studyDialog: function studyDialog(option) {
                try {
                    this.get('baseChart').openDialog(option.ChartIndID);
                    this.set('creatingNewInd', true);

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), _chartCoreConstants.default.ChartGAActions.indAdded, ['ind:', option.LanguageTag].join(''));
                } catch (e) {
                    this.utils.logger.logError('Error in study dialog' + e);
                }
            },

            dismissStudyDialog: function dismissStudyDialog() {
                this.dismissStudyDialog();
            },

            showSearchPopup: function showSearchPopup() {
                this.showSearchPopup();
            },

            closeSearchPopup: function closeSearchPopup() {
                var modal = this.get(this.get('searchSymbolKey'));
                modal.send('closeModalPopup');
            },

            onSearchSymbolSelected: function onSearchSymbolSelected(item) {
                var symbolArgs = { sym: item.sym, exg: item.exg, inst: item.inst };

                this.saveWidget(symbolArgs);
                this.refreshWidget(symbolArgs);
                this.getSubMarket();

                this.set('searchKey', '');
            },

            showSearchComparePopup: function showSearchComparePopup() {
                this.showSearchComparePopup();
            },

            closeSearchComparePopup: function closeSearchComparePopup() {
                var modal = this.get(this.get('compareSymbolKey'));
                modal.send('closeModalPopup');
            },

            showComparePopup: function showComparePopup() {
                var modal = this.get('chartSymbolCompare');
                modal.send('showModalPopup');
            },

            closeComparePopup: function closeComparePopup() {
                var modal = this.get('chartSymbolCompare');
                modal.send('closeModalPopup');
            },

            onCompareSymbol: function onCompareSymbol(item) {
                this._onComparison({ symObj: item });
            },

            onToggleCrossHair: function onToggleCrossHair() {
                var baseChart = this.get('baseChart');

                if (baseChart) {
                    this._enableCrossHair();
                    // baseChart.changeOccurred('layout');
                }
            },

            onToggleVolume: function onToggleVolume() {
                this.onDisplayVolume();
            },

            setLineStudy: function setLineStudy(vector) {
                var baseChart = this.get('baseChart');

                // Todo: [Ravindu] Hot fix.
                if (baseChart) {
                    if (this.get('selectedLineStudy') !== vector) {
                        if (this.get('selectedLineStudy') !== '') {
                            _ember.default.$('#' + this.get('selectedLineStudy')).removeClass('active');
                            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, [this.get('selectedLineStudy'), ':unchecked'].join(''));
                        }

                        this.set('selectedLineStudy', vector);
                        _ember.default.$('#' + this.get('selectedLineStudy')).addClass('active');
                        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, [this.get('selectedLineStudy'), ':checked'].join(''));
                    } else {
                        _ember.default.$('#' + this.get('selectedLineStudy')).removeClass('active');
                        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, [this.get('selectedLineStudy'), ':unchecked'].join(''));
                        this.set('selectedLineStudy', '');
                    }

                    baseChart.quickAddLineStudy(vector);
                }
            },

            // Todo [Ravindu] move below method to outside of action : readability
            onToggleFullScreenMode: function onToggleFullScreenMode() {
                this.toggleFullScreen();
                this.get('baseChart').onRevalidateChart(true);
            },

            setLink: function setLink(option) {
                this.setWidgetLink(option);
            },

            onRemoveStudy: function onRemoveStudy(strategy) {
                this.get('baseChart').removeAddedChart(strategy.id);
            },

            onCenterZoomOut: function onCenterZoomOut() {
                this.get('baseChart').onCenterZoom(_chartCoreConstants.default.ZoomOption.Out);
                this.set('isZoomResetEnabled', this.baseChart.calcDP.isZoomedDataArray);
            },

            onCenterZoomIn: function onCenterZoomIn() {
                this.get('baseChart').onCenterZoom(_chartCoreConstants.default.ZoomOption.In);
                this.set('isZoomResetEnabled', this.baseChart.calcDP.isZoomedDataArray);
            },

            onResetZoom: function onResetZoom() {
                this.get('baseChart').onResetZoom();
                this.set('isZoomResetEnabled', this.baseChart.calcDP.isZoomedDataArray);
            },

            onToggleIndexing: function onToggleIndexing() {
                var baseChart = this.get('baseChart');

                if (baseChart) {
                    if (!this.get('indexingBtnEnabled')) {
                        this.set('indexingBtnEnabled', true);
                        _ember.default.$('#indexing-btn').addClass('active');

                        baseChart.setIndexing(true);
                    } else {
                        this.set('indexingBtnEnabled', false);
                        _ember.default.$('#indexing-btn').removeClass('active');

                        baseChart.setIndexing(false);
                    }
                }
            }
        }
    });


    _ember.default.Handlebars.helper('global-search', _globalSearch.default);
});
define('universal-app/controllers/chart/regular-chart', ['exports', 'ember', './core/utils/chart-core-constants', './chart-base', '../../config/app-config'], function (exports, _ember, _chartCoreConstants, _chartBase, _appConfig) {
    'use strict';

    exports.default = _chartBase.default.extend({
        dimensions: {
            w: 4,
            h: 24
        },

        // Full Screen parameters
        minHeightForVolumeStudy: 200,
        resizeHandler: null,
        activeTab: null,
        // Flag
        isShowTitle: true,
        curruntActiveTabClass: 'active',
        unactiveTabClass: '',
        showVolumeChart: true,
        isDisableChartControls: true,

        isTablet: _appConfig.default.customisation.isTablet,

        arrDisplayPeriods: function () {
            var arrTabs = _ember.default.A();
            var langObj = this.get('app').lang.labels;

            _ember.default.$.each(_chartCoreConstants.default.DetaiQuoteChartPeriodTab, function (key, value) {
                if (value) {
                    var regChartPeriod = _chartCoreConstants.default.ChartViewPeriod[key];
                    _ember.default.set(regChartPeriod, 'chartperiodTitle', langObj[regChartPeriod.title]);
                    arrTabs.pushObject(regChartPeriod);
                }
            });

            return arrTabs;
        }.property(),

        chartContainer: function () {
            return ['full-width dq_chart', this.get('wkey')].join('');
        }.property(),

        // Base overrides
        onAfterRender: function onAfterRender() {
            // Top panel chart and quote tab chart both are shared same dq_chart dom container since both use same class to fetch container.
            // It causes second loaded chart is painted on first loaded chart.

            var that = this;

            this.set('loadingTimer', _ember.default.run.later(function () {
                // var dpi = Ember.$('#dpi')[0].offsetWidth;
                try {
                    var containerClass = ['.', 'dq_chart', that.get('wkey')].join('');

                    that.initChart({ chartContainerCls: containerClass /* , dpi: dpi*/ });
                    that.setActive(that.get('chartViewPeriod'), that.curruntActiveTabClass);

                    // Listener on the window object that will be called when window resize
                    that.resizeHandler = _ember.default.$.proxy(that.get('_onChartResize'), that);
                    _ember.default.$(window).on('resize', that.resizeHandler);
                } catch (e) {
                    that.utils.logger.logError('Error in regular chart init ', e);
                }
            }, 1000));
        },

        // Base overrides
        onUnloadWidget: function onUnloadWidget() {
            this._super();

            _ember.default.$(window).off('resize', this.resizeHandler);
            // this.setActive(this.activeTab, this.unactiveTabClass);
        },

        // Chart Base overrides
        onCheckVolumeChartEnabler: function onCheckVolumeChartEnabler() {
            var containerHeight = _ember.default.$('#dq_chart').height();

            return containerHeight > this.minHeightForVolumeStudy && this.get('showVolumeChart');
        },

        _onChartResize: function _onChartResize() {
            var baseChart = this.baseChart;
            var alreadyVisible = this.get('volumeViewEnabled');

            if (!alreadyVisible && this.onCheckVolumeChartEnabler()) {
                this.set('volumeViewEnabled', false);
                this.onDisplayVolume();
            } else if (alreadyVisible && !this.onCheckVolumeChartEnabler()) {
                this.set('volumeViewEnabled', true);
                this.onDisplayVolume();
            }

            if (baseChart) {
                this.utils.logger.logInfo('[Chart Resize] Calling Chart Revalidation FN');
                baseChart.onRevalidateChart();
            }
        },

        setActive: function setActive(currentTab, active) {
            var tabArray = this.get('arrDisplayPeriods');

            _ember.default.$.each(tabArray, function (key, tabObj) {

                if (tabObj.ID === currentTab.ID) {
                    _ember.default.set(tabObj, 'css', active);
                } else {
                    _ember.default.set(tabObj, 'css', '');
                }
            });
        },

        _chartTypeSelected: function _chartTypeSelected(tabItem) {
            var cDP = this.get('chartDataProvider');
            var baseChart = this.get('baseChart');

            this.set('chartViewPeriod', tabItem);
            this.set('activeTab', tabItem);
            this.set('chartCategory', tabItem.IsHistory ? _chartCoreConstants.default.ChartCategory.History : _chartCoreConstants.default.ChartCategory.Intraday);

            baseChart.setPeriodicity(this.get('chartCategory').RowTickFormat, _chartCoreConstants.default.ChartViewInterval[tabItem.DefaultInterval].PerSeconds);

            this.saveWidget({ chartInterval: _chartCoreConstants.default.ChartViewInterval[tabItem.DefaultInterval] });

            if (cDP) {
                cDP.refineGraphData({
                    chartCategory: this.get('chartCategory'),
                    chartDataLevel: this.get('chartViewPeriod').ChartDataLevel,
                    chartViewPeriod: this.get('chartViewPeriod')
                });

                this.saveWidget({
                    chartCategory: this.get('chartCategory'),
                    chartViewPeriod: this.get('chartViewPeriod')
                });
            }

            this.setActive(tabItem, this.curruntActiveTabClass);
        },

        actions: {
            chartTypeSelected: function chartTypeSelected(tabItem) {
                this._chartTypeSelected(tabItem);
            },

            setLink: function setLink(option) {
                this.setWidgetLink(option);
            }
        }
    });
});
define('universal-app/controllers/chart/technical-score-chart', ['exports', 'jquery', './pro-chart', './core/utils/chart-core-constants', './core/utils/chart-studies', '../../app-events', './data/technical-score-data-provider', '../../models/shared/shared-service'], function (exports, _jquery, _proChart, _chartCoreConstants, _chartStudies, _appEvents, _technicalScoreDataProvider, _sharedService) {
    'use strict';

    exports.default = _proChart.default.extend({
        layoutName: 'technical-score-chart',
        chartViewPeriod: _chartCoreConstants.default.ChartViewPeriod.ThreeMonth,
        chartCategory: _chartCoreConstants.default.ChartCategory.History,
        chartInterval: _chartCoreConstants.default.ChartViewInterval.Daily,
        pointTurnover: '',
        isDisableChartControls: true,
        priceService: _sharedService.default.getService('price'),

        onLoadWidget: function onLoadWidget() {
            var that = this;
            var wkey = this.get('wkey');

            that.set('chartDataProvider', _technicalScoreDataProvider.default.create({
                chartCategory: that.chartCategory,
                chartDataLevel: that.chartViewPeriod.ChartDataLevel,
                chartViewPeriod: that.chartViewPeriod,
                wKey: wkey,

                onData: function onData(ohlcPoint, exg, sym) {
                    that.onDataFromRealtime(ohlcPoint, exg, sym);
                },

                onDataChunk: function onDataChunk(chartSymbolObj) {
                    that.onDataFromMix(chartSymbolObj);
                },

                onErrorFn: function onErrorFn(exg, sym) {
                    that.onDataErrorFromMix(exg, sym);
                }
            }));

            this.set('chartStyle', _chartCoreConstants.default.ChartStyle.Candle);
            this.set('collapseOverlay', (0, _jquery.default)('#collapseOverlay'));

            _appEvents.default.subscribeSymbolChanged(wkey, this, this.get('selectedLink'));
            _appEvents.default.subscribeWindowResize(this, wkey);
        },

        prependMouseOut: function prependMouseOut() {
            this._super();

            this.set('pointDate', '');
            this.set('pointTurnover', '');
            this.set('pointVolume', '');
        },

        onCheckTurnoverChartEnabler: function onCheckTurnoverChartEnabler() {
            if (!this.get('turnoverViewEnabled') && !this.get('turnoverStudyDescriptor')) {
                return true; // Chart fresh load - Turnover is shown
            }

            // Chart load from save status - Turnover was added onLoadLayout and again turnover adding is blocked here
            if ((!this.get('turnoverViewEnabled') || this.get('turnoverViewEnabled') === '') && this.get('turnoverStudyDescriptor')) {
                this.set('turnoverViewEnabled', true); // Turnover is already added
            } else {
                this.set('turnoverViewEnabled', false); // Volume was removed
            }

            return false;
        },

        onDisplayTurnover: function onDisplayTurnover() {
            var baseChart = this.get('baseChart');
            var vSD;

            if (baseChart) {
                if (!this.get('turnoverViewEnabled')) {
                    vSD = baseChart.quickAddStudy(_chartStudies.default.Indicators.TechScore.ChartIndID);

                    this.set('turnoverStudyDescriptor', vSD);
                    this.set('turnoverViewEnabled', true);

                    this.saveWidget({ turnoverStudyDescriptor: vSD, turnoverViewEnabled: false }); // Turnover view enables is set opposite condition to open in next reload
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['techScore', ':checked'].join(''));
                } else {
                    vSD = this.get('turnoverStudyDescriptor');

                    if (vSD) {
                        baseChart.removeAddedChart(vSD);
                    }

                    this.set('turnoverStudyDescriptor', undefined);
                    this.set('turnoverViewEnabled', false);

                    this.saveWidget({ turnoverStudyDescriptor: '', turnoverViewEnabled: true }); // Volume view enables is set opposite condition to open in next reload
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['techScore', ':unchecked'].join(''));
                }
            }
        }
    });
});
define('universal-app/controllers/price/widgets/mobile/chart/quote-chart', ['exports', 'ember', '../../../../chart/regular-chart', '../../../../../controllers/chart/core/utils/chart-core-constants', '../../../../../controllers/chart/core/utils/chart-studies', '../../../../../app-events', '../quote-summary/components/chart-status-panel', '../../../../../config/app-config', '../../../../../models/shared/shared-service', '../../../../../helpers/responsive-handler', '../../../../chart/core/utils/chart-core-constants', '../../../../chart/core/utils/chart-utils', '../../../../chart/core/utils/chart-formatters'], function (exports, _ember, _regularChart, _chartCoreConstants, _chartStudies, _appEvents, _chartStatusPanel, _appConfig, _sharedService, _responsiveHandler, _chartCoreConstants2, _chartUtils, _chartFormatters) {
    'use strict';

    exports.default = _regularChart.default.extend({
        DefaultChartStyle: _chartCoreConstants.default.ChartStyle.Area,
        DefaultChartPeriod: _chartCoreConstants.default.ChartViewPeriod.OneDay,
        tradeService: _sharedService.default.getService('trade'),
        VChartType: 'vchart',

        chartStudies: _ember.default.A(),
        chartContainer: '',
        pageContainer: '',
        searchKey: '',
        searchCss: 'search-close',
        chartHeightStyle: 'mobile-portrait-chart-height',
        compareSearchKey: '',
        compareSearchCss: 'search-close',

        isLandscapeMode: false,
        landScapeWinSize: 0,
        keyPadCloseFunc: undefined,
        isKeyPadOpened: false,

        // Chart Status panel properties
        dimensions: {
            w: 8,
            h: 6
        },

        options: {
            dragLockToAxis: true,
            dragBlockHorizontal: true
        },

        colorCSS: 'fore-color',
        fontColorCSS: 'fore-color',
        isAddedToCustomWatchList: false,
        panelContainer: '',

        // Data label on Chart
        pointOpen: '',
        pointHigh: '',
        pointLow: '',
        pointClose: '',
        // pointVolume: '',

        activePeriod: _chartCoreConstants.default.ChartViewPeriod.OneDay.DisplayName,
        isComparisonEnabled: _appConfig.default.chartConfig.isMobileComparisonEnabled,

        quoteSettings: {
            intZero: 0,
            emptyString: '',

            styles: {
                green: 'green',
                darkGreen: 'green-dark',
                red: 'red',
                darkRed: 'red-dark',
                white: 'white',
                upArrow: 'glyphicon-triangle-top glyphicon ',
                downArrow: 'glyphicon-triangle-bottom glyphicon '
            }
        },

        // Parameters related to custom watchlist
        customWatchListArray: _sharedService.default.getService('price').watchListDS.customWatchListArray,
        myFavouritesIndex: 0,
        myFavouritesKey: 'myFavourites',

        arrDisplayPeriods: function () {
            var arrTabs = _ember.default.A();

            _ember.default.$.each(_chartCoreConstants.default.MobileQuoteChartPeriodTab, function (key, value) {
                if (value) {
                    arrTabs.pushObject(_chartCoreConstants.default.ChartViewPeriod[key]);
                }
            });

            _ember.default.set(arrTabs[0], 'activeClass', 'active');
            this.set('activePeriod', arrTabs[0].DisplayName);
            return arrTabs;
        }.property(),

        chartStyles: function () {
            var that = this;
            var displayName = void 0;
            var chartStyle = null;
            var arrStyles = _ember.default.A();

            // Display name is changed when changing a language
            var selectedStyle = that.get('chartStyle');

            _ember.default.set(selectedStyle, 'DisplayName', that.get('app').lang.labels[selectedStyle.LanguageTag]);

            _ember.default.$.each(_chartCoreConstants.default.ProChartViewStyle, function (index, key) {
                chartStyle = _chartCoreConstants.default.ChartStyle[key];
                displayName = that.get('app').lang.labels[chartStyle.LanguageTag];

                if (displayName) {
                    _ember.default.set(chartStyle, 'DisplayName', displayName);
                    arrStyles.pushObject(chartStyle);
                }
            });

            return arrStyles;
        }.property('app.lang'),

        indicators: function () {
            var that = this;
            var indicators = _ember.default.A();
            var indicatorObj;
            var configIndicators = _appConfig.default.chartConfig.chartIndicators;

            if (configIndicators && configIndicators.length > 0) {
                _ember.default.$.each(configIndicators, function (key, value) {
                    indicatorObj = _chartStudies.default.Indicators[value];

                    if (indicatorObj) {
                        _ember.default.set(indicatorObj, 'DisplayName', that.get('app').lang.labels[indicatorObj.LanguageTag]);
                        indicators.pushObject(indicatorObj);
                    }
                });
            }

            return indicators;
        }.property('app.lang'),

        isTradingEnabled: function () {
            return _appConfig.default.customisation.isTradingEnabled && this.get('symbolObj.inst') !== this.utils.AssetTypes.Indices;
        }.property(),

        isLiquidateEnabled: function () {
            var isEnabled = false;
            var stock = this.get('symbolObj');

            if (this.get('isTradingEnabled') && stock && stock.sym) {
                var holdings = this.tradeService.holdingDS.getHoldingCollection();

                _ember.default.$.each(holdings, function (key, holding) {
                    if (stock.sym === holding.symbol && stock.exg === holding.exg) {
                        isEnabled = true;

                        return false;
                    }
                });
            }

            return isEnabled;
        }.property('symbolObj.sym', 'symbolObj.exg'),

        moreItems: function () {
            var that = this;

            var itemArray = _ember.default.A([{
                DisplayName: that.get('app').lang.labels.reset,
                Action: 'Reset'
            }]);

            if (!that.get('isShareIconDisabled')) {
                itemArray.pushObject({
                    DisplayName: that.get('app').lang.labels.screenShare,
                    Action: 'Share'
                });
            }

            itemArray.pushObject({
                DisplayName: that.get('app').lang.labels.addToWL,
                Action: 'AddToWL'
            });

            if (that.get('isAlertIconEnabled')) {
                itemArray.pushObject({
                    DisplayName: that.get('app').lang.labels.alert,
                    Action: 'Alert'
                });
            }

            return itemArray;
        }.property('app.lang'),

        updatePercentageChangeCss: function () {
            var stock = this.get('symbolObj');

            if (stock) {
                this.set('colorCSS', stock && stock.pctChg > 0 ? 'up-fore-color' : stock.pctChg === 0 ? 'fore-color' : 'down-fore-color');
                this.set('ltpIconCSS', stock && stock.pctChg > 0 ? 'glyphicon-triangle-top' : stock.pctChg < 0 ? 'glyphicon-triangle-bottom' : '');
            }
        }.observes('symbolObj.pctChg'),

        showOrderTicket: function showOrderTicket(side) {
            this._resetChartForOrderTicket(false);
            _sharedService.default.getService('tradeUI').showOrderTicket(this.container, side, this.get('symbolObj'));
        },

        _resetChartForOrderTicket: function _resetChartForOrderTicket(isLandscape) {
            var appttleHt = _ember.default.$('.appttl-height')[0];

            appttleHt.setAttribute('style', ' ');
            this.toggleFullScreen(isLandscape, this.get('pageContainer'), this.get('wkey'));
        },

        onLoadWidget: function onLoadWidget() {
            var wkey = this.get('wkey');

            this.set('chartContainer', ['chart-container', wkey].join('-'));
            this.set('pageContainer', ['mobileChartContainer', wkey].join('-'));

            this._super();
            this.prependMouseOut();

            _appEvents.default.subscribeOrientationChanged(wkey, this);
        },

        onAfterRender: function onAfterRender() {
            var that = this;
            var isMobile = _appConfig.default.customisation.isMobile;

            _ember.default.run.next(this, function () {
                // Top panel chart and quote tab chart both are shared same dq_chart dom container since both use same class to fetch container.
                // It causes second loaded chart is painted on first loaded chart.

                var dpi = _ember.default.$('#dpi')[0].offsetWidth;
                var containerClass = '.' + ['chart-container', that.get('wkey')].join('-');

                that.initChart({
                    chartContainerCls: containerClass,
                    dpi: dpi,
                    isMobile: isMobile,
                    isLandscape: this.get('isLandscapeMode')
                });

                var baseChart = that.get('baseChart');

                that.initializeZoom();
                that.onOrientationChanged(_ember.default.appGlobal.orientation.isLandscape);
                baseChart.setGridType(_chartCoreConstants2.default.ProChartGridStyle.None);
            });

            this.updatePercentageChangeCss();
            this._setActiveTab(this.get('arrDisplayPeriods')[0]);

            _sharedService.default.getService('price').watchListDS.initializeCustomWL();
            this.set('isAddedToCustomWatchList', _sharedService.default.getService('price').watchListDS.isSymbolAvailableInCustomWL(this.get('symbolObj')));
            _ember.default.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);
        },

        // Chart Base overrides
        onFinishedLoadingNewChart: function onFinishedLoadingNewChart() {},

        onOrientationChanged: function onOrientationChanged(isLandscape) {
            var that = this;
            var appttleHt = _ember.default.$('.appttl-height')[0]; // Notification panel is set at appttl-height. In new chart this title bar height is reduced to 35px

            if (isLandscape === this.get('isLandscapeMode')) {
                return;
            }

            this.set('isLandscapeMode', isLandscape);
            this.set('chartHeightStyle', isLandscape ? 'mobile-landscape-chart-height' : 'mobile-portrait-chart-height');
            this.set('isAddedToCustomWatchList', _sharedService.default.getService('price').watchListDS.isSymbolAvailableInCustomWL(this.get('symbolObj')));
            this.toggleFullScreen(isLandscape, this.get('pageContainer'), this.get('wkey'));

            var keyPadFN = function keyPadFN() {
                that._onKeyPadResizeFunc();
            };

            if (!isLandscape) {
                this._removeStudies([]);
                this._setChartStyle(this.DefaultChartStyle);
                this._setActiveTab(this.get('arrDisplayPeriods')[0]);
                this._chartTypeSelected(this.DefaultChartPeriod);

                this.get('baseChart').setGridType(_chartCoreConstants2.default.ProChartGridStyle.None);
                this.get('baseChart').chartParams.isTimesOnChart = true;
                this.get('baseChart').chartParams.isLandscape = false;
                this.get('baseChart').pointOnChartFN = undefined;
                this.get('baseChart').setCrossHair(false);
                appttleHt.setAttribute('style', ' ');

                this._clearResponsive();

                _ember.default.$(window).off('resize', keyPadFN);
            } else {
                // Ember.$(function () {
                //     that.set('landScapeWinSize', Ember.$(window).width() + Ember.$(window).height());
                // });

                this.get('baseChart').chartParams.isTimesOnChart = false;
                this.get('baseChart').chartParams.isLandscape = true;
                appttleHt.setAttribute('style', 'height: 35px');

                this.get('baseChart').setCrossHair(true);
                this.get('baseChart').setGridType(_chartCoreConstants2.default.ProChartGridStyle.Both);

                this.get('baseChart').pointOnChartFN = function (point) {
                    that._displayPointMouseOnChart(point);
                };

                this.set('searchCss', 'search-close');
                this.set('compareSearchCss', 'search-close');
                this.set('enableOverlay', false);
            }

            _ember.default.run.later(function () {
                that.get('baseChart').onRevalidateChart(true);
                that.get('hammerObj').get('pinch').set({ enable: isLandscape });
                that._toggleVolumeChart();

                if (isLandscape) {
                    that.set('landScapeWinSize', _ember.default.$(window).width() + _ember.default.$(window).height());
                    _ember.default.$(window).resize(keyPadFN);

                    that.initializeResponsive();
                    that._onDisplayAddedStudies();
                }
            }, 250);
        },

        initializeResponsive: function initializeResponsive() {
            this.set('responsive', _responsiveHandler.default.create({
                controller: this,
                widgetId: this.get('pageContainer'),
                callback: this.onResponsive,
                enabledElementResize: true
            }));

            this.responsive.addList('chart-free-space', [{ id: 'chartStyles-dropdown', width: 5 }, { id: 'period-dropdown', width: 5 }]);

            this.responsive.initialize();
        },

        _clearResponsive: function _clearResponsive() {
            var responsive = this.get('responsive');

            if (responsive) {
                responsive.onClear();
                this.set('responsive', undefined);
            }
        },

        initializeZoom: function initializeZoom() {
            var hammerObj = new Hammer(document.getElementsByClassName(this.get('chartContainer'))[0]);
            var counter = 1;

            hammerObj.get('pinch').set({ enable: false });
            this.set('hammerObj', hammerObj);

            hammerObj.on('pinchin pinchout', function (event) {
                if (counter > 10) {
                    counter = 1;

                    if (event.type === 'pinchout') {
                        this.get('baseChart').applyZoomIn(event.center.x, -1);
                        // console.error('pinchout -- ' + event.center.x + '=====' + event.deltaX);
                    } else if (event.type === 'pinchin') {
                        this.get('baseChart').applyZoomOut(event.center.x, 1);
                        // console.error('pinchin -- ' + event.center.x + '=====' + event.deltaX);
                    }
                } else {
                    counter++;
                }
            }.bind(this));
        },

        onUnloadWidget: function onUnloadWidget() {
            this._super();
            _appEvents.default.unSubscribeOrientationChanged(this.get('wkey'));
        },

        onCheckVolumeChartEnabler: function onCheckVolumeChartEnabler() {
            return false;
        },

        toggleFullScreen: function toggleFullScreen(isLandscapeMode, widgetContainerId, widgetId, fullViewHeight, regularViewHeight) {
            var fullScreenContainer = document.getElementById('fullScreenContainer');
            var widgetContainer = document.getElementById(widgetContainerId);
            var widget = document.getElementById(widgetId);
            var body = document.body;

            if (widgetContainer) {
                if (isLandscapeMode) {
                    this.set('previousParent', widgetContainer.parentElement);
                    this.set('previousWatchListStyleAttribute', widgetContainer.getAttribute('style'));
                    this.set('previousFullScreenContainerStyleAttribute', fullScreenContainer.getAttribute('style'));

                    fullScreenContainer.appendChild(widgetContainer);
                    widgetContainer.setAttribute('style', 'position: absolute; left: 0; top: 0; bottom: 0; right: 0;');
                    fullScreenContainer.setAttribute('style', 'z-index:300; position: absolute; left: 0; top: 0; bottom: 0; right: 0;');

                    var html = document.documentElement;
                    var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

                    if (widget) {
                        widget.setAttribute('style', 'height:' + fullViewHeight ? fullViewHeight : height + 'px;');
                    }

                    this.getSubMarket();
                } else if (!isLandscapeMode && this.get('previousParent')) {
                    this.get('previousParent').appendChild(widgetContainer);
                    widgetContainer.setAttribute('style', this.get('previousWatchListStyleAttribute'));
                    fullScreenContainer.setAttribute('style', this.get('previousFullScreenContainerStyleAttribute'));
                    this.set('previousParent', null);

                    if (regularViewHeight && widget) {
                        widget.setAttribute('style', 'height:' + regularViewHeight + 'px;');
                    }
                }
            }
        },

        _onKeyPadResizeFunc: function _onKeyPadResizeFunc() {
            var that = this;
            var keyPadCloseFN = that.get('keyPadCloseFunc');

            if (_ember.default.$(window).width() + _ember.default.$(window).height() !== that.get('landScapeWinSize')) {
                that.set('isKeyPadOpened', true);

                that.utils.logger.logInfo('Keypad is closing');
            } else {
                if (keyPadCloseFN && _ember.default.$.isFunction(keyPadCloseFN)) {
                    keyPadCloseFN();

                    that.utils.logger.logInfo('Keypad is opening');

                    that.set('keyPadCloseFunc', undefined);
                }

                that.set('isKeyPadOpened', false);
            }
        },

        _toggleVolumeChart: function _toggleVolumeChart() {
            var baseChart = this.get('baseChart');

            if (baseChart) {
                if (this.get('isLandscapeMode')) {
                    var vSD = baseChart.quickAddStudy(this.VChartType);

                    this.set('volumeStudyDescriptor', vSD);
                    this.chartStudies.pushObject(vSD);
                } else {
                    vSD = this.get('volumeStudyDescriptor');

                    if (vSD) {
                        baseChart.removeAddedChart(vSD);
                    }
                }
            }
        },

        _setChartStyle: function _setChartStyle(style) {
            var baseChart = this.get('baseChart');

            this.set('chartStyle', style);

            if (baseChart) {
                baseChart.setChartType(style);
            }
        },

        _clearChartStudies: function _clearChartStudies(isReset) {
            var that = this;
            var chartStudies = this.get('chartStudies');
            var baseChart = this.get('baseChart');

            if (baseChart && chartStudies && chartStudies.length > 0) {
                var allowedStudies = [];
                var len = chartStudies.length;

                for (var i = 0; i < len; ++i) {
                    var study = chartStudies.popObject();

                    if (!isReset || study && study.name !== that.VChartType) {
                        // baseChart.removeStudy(baseChart, study);
                    } else if (study) {
                        allowedStudies.pushObject(study);
                    }
                }

                this.set('chartStudies', allowedStudies);
            }
        },

        _removeStudies: function _removeStudies(excludeArr) {
            // 'excludeArr' contains id s of studies which should not be cleared
            var that = this;
            var chartStudies = that.get('chartStudies');
            var baseChart = that.get('baseChart');
            var cp = void 0;

            _ember.default.$.each(chartStudies, function (key, vSD) {
                try {
                    if (vSD && !excludeArr.includes(vSD)) {
                        baseChart.removeAddedChart(vSD);
                    }
                } catch (e) {
                    that.utils.logger.logError('Error in removing studies from Pro Chart : ' + e);
                }
            });

            that.set('chartStudies', _ember.default.A());

            // Todo: [Ravindu] Check if there is any problem implement removeStudies instead of using chart studies

            var strategyFunc = function strategyFunc(index, strategy) {
                if (strategy) {
                    try {
                        cp = strategy.cp;

                        if (cp.chartStudyType === _chartCoreConstants2.default.ChartStudyType.Compare) {
                            baseChart.calcDP.removeCompareSymbol(cp);
                            baseChart.removeAddedChart(strategy.strategyId);
                        }
                    } catch (e) {
                        that.utils.logger.logError('Error in removing compare symbols : ' + e);
                    }
                }
            };

            _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                _ember.default.$.each(component.chartStrategies, strategyFunc);
            });
        },

        _setActiveTab: function _setActiveTab(tabItem) {
            var that = this;
            var tabArray = this.get('arrDisplayPeriods');

            _ember.default.$.each(tabArray, function (key, tab) {
                _ember.default.set(tab, 'activeClass', '');

                if (tabItem.ID === tab.ID) {
                    _ember.default.set(tab, 'activeClass', 'active');
                    that.set('activePeriod', tab.DisplayName);
                }
            });
        },

        prependMouseOut: function prependMouseOut() {
            this.set('pointOpen', '');
            this.set('pointHigh', '');
            this.set('pointLow', '');
            this.set('pointClose', '');
            // this.set('pointVolume', '');
        },

        _displayPointMouseOnChart: function _displayPointMouseOnChart(point) {
            try {
                var baseChart = this.get('baseChart');
                this.prependMouseOut();

                if (baseChart && point) {
                    var deci = this.get('symbolObj').deci;
                    deci = deci === '-1' ? 2 : deci;

                    this.set('pointOpen', this.utils.formatters.formatNumber(point.Open, deci));
                    this.set('pointHigh', this.utils.formatters.formatNumber(point.High, deci));
                    this.set('pointLow', this.utils.formatters.formatNumber(point.Low, deci));
                    this.set('pointClose', this.utils.formatters.formatNumber(point.Close, deci));
                    // this.set('pointVolume', this.utils.formatters.formatNumber(point.Volume, 0));

                    this._displayStudyValuesMouseOnChart(point, deci);
                }
            } catch (e) {
                this.utils.logger.logError('Error in prependHeadsUpHR of Pro Chart : ' + e);
            }
        },

        _displayStudyValuesMouseOnChart: function _displayStudyValuesMouseOnChart(point, deci) {
            var cp = void 0,
                valSpan = void 0,
                plotVal = void 0;
            var that = this;
            var baseChart = this.get('baseChart');

            var strategyFunc = function strategyFunc(index, strategy) {
                if (strategy) {
                    cp = strategy.cp;

                    if (cp.chartStudyType === _chartCoreConstants2.default.ChartStudyType.Indicator) {
                        for (var i = 0; i < cp.plotInfos.length; i++) {
                            try {
                                valSpan = document.getElementsByClassName(cp.plotInfos[i].propertyKey)[0];

                                if (valSpan) {
                                    plotVal = point[cp.plotInfos[i].propertyKey];
                                    plotVal = plotVal ? plotVal : '';
                                    valSpan.innerHTML = that.utils.formatters.formatNumber(plotVal, cp.propertyKey.toUpperCase() === 'VOLUME' ? 0 : deci);
                                }
                            } catch (e) {
                                that.utils.logger.logError('Error in update studies point when mouse is over a point : ' + e);
                            }
                        }
                    }
                }
            };

            _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                if (component.chartStrategies.length > 0) {
                    _ember.default.$.each(component.chartStrategies, strategyFunc);
                }
            });
        },

        onAfterFinishedDrawingChart: function onAfterFinishedDrawingChart() {
            if (this.get('isLandscapeMode')) {
                this._onDisplayAddedStudies();
                this._setPositionBackgroundDetails();
            }
        },

        _onDisplayAddedStudies: function _onDisplayAddedStudies() {
            try {
                var baseChart = this.baseChart;

                if (baseChart) {
                    var that = this;
                    var chartDiv = _ember.default.$('#dq_chart')[0];
                    var studyViews = chartDiv.querySelectorAll('.dynamic-study-view');
                    var liEl = void 0,
                        keySpan = void 0,
                        settingSpan = void 0,
                        icon = void 0,
                        valDiv = void 0,
                        cp = void 0,
                        ulEl = void 0,
                        padTop = void 0,
                        plotsVal = [],
                        valUl = void 0,
                        plotsValLi = void 0,
                        plotsValSpan = void 0,
                        deci = void 0,
                        pVal = void 0,
                        innerColor = void 0,
                        indexToRemove = void 0,
                        compSymCloseSpan = void 0,
                        ulElComp = void 0,
                        compareRect = void 0,
                        compareLbl = void 0,
                        compareCloseIcon = void 0,
                        compareRectColor = void 0;

                    try {
                        for (var i = studyViews.length - 1; i >= 0; i--) {
                            chartDiv.removeChild(studyViews[i]); // Removing previous content if there was
                        }

                        _chartUtils.default.clearNode(_ember.default.$('#dynamic-study-view')[0]);
                    } catch (e) {
                        this.utils.logger.logError('Error in clear nodes ' + e);
                    }

                    var strategyFunc = function strategyFunc(index, strategy) {
                        if (strategy && baseChart.calcDP.dataSource && baseChart.calcDP.dataSource.length > 0) {
                            cp = strategy.cp;

                            if (cp.chartStudyType === _chartCoreConstants2.default.ChartStudyType.Indicator) {
                                plotsVal = [];

                                for (var _i = 0; _i < cp.plotInfos.length; _i++) {
                                    pVal = _chartUtils.default.lastNotNullVal(baseChart.calcDP.dataSource, _chartCoreConstants2.default.OHLCFields.Close)[cp.plotInfos[_i].propertyKey];
                                    deci = _chartFormatters.default.getDecimalFormatter(pVal);
                                    innerColor = cp.plotInfos[_i][Object.keys(cp.plotInfos[_i].innerPlots[0])[1]];

                                    plotsVal[_i] = {
                                        value: that.utils.formatters.formatNumber(pVal, deci),
                                        color: innerColor,
                                        propertyKey: cp.plotInfos[_i].propertyKey
                                    };
                                }

                                liEl = document.createElement('li');
                                keySpan = document.createElement('span');
                                settingSpan = document.createElement('span');

                                icon = _ember.default.$('<i/>', {
                                    class: 'font-m icon-fore-color icon-chart-settings-close',
                                    on: {
                                        click: function click() {
                                            try {
                                                if (this.strategy.cp.propertyKey.toUpperCase() === 'VOLUME') {
                                                    that.set('volumeViewEnabled', false);
                                                    _ember.default.$('#volume-btn').removeClass('active');
                                                }

                                                indexToRemove = that.get('chartStudies').indexOf(this.strategy.strategyId);

                                                if (indexToRemove !== -1) {
                                                    that.get('chartStudies').splice(indexToRemove, 1);
                                                }

                                                baseChart.removeAddedChart(this.strategy.strategyId);
                                            } catch (e) {
                                                that.utils.logger.logError('Error in remove chart' + e);
                                            }
                                        }
                                    }
                                })[0];

                                icon.strategy = strategy;
                                valDiv = document.createElement('div');
                                valUl = document.createElement('ul');

                                keySpan.className = 'font-l fade-fore-color';
                                settingSpan.className = 'pad-s-lr';
                                settingSpan.setAttribute('style', 'display:inline-block; vertical-align:middle;');
                                valDiv.setAttribute('style', 'display:inline-block; vertical-align:middle');

                                valUl.className = 'hu left';
                                valUl.setAttribute('style', 'float: left');

                                keySpan.appendChild(document.createTextNode(cp.propertyKey));

                                for (var j = 0; j < plotsVal.length; j++) {
                                    plotsValLi = document.createElement('li');
                                    plotsValSpan = document.createElement('span');

                                    plotsValSpan.className = 'font-xx-l fade-fore-color ' + plotsVal[j].propertyKey;
                                    plotsValSpan.style.color = plotsVal[j].color.replace('0X', '#');

                                    plotsValSpan.appendChild(document.createTextNode(plotsVal[j].value));

                                    plotsValLi.appendChild(plotsValSpan);
                                    valUl.appendChild(plotsValLi);
                                }

                                liEl.appendChild(keySpan);
                                settingSpan.appendChild(icon);
                                liEl.appendChild(settingSpan);
                                valDiv.appendChild(valUl);
                                liEl.appendChild(valDiv);
                                ulEl.appendChild(liEl);
                            } else if (cp.chartStudyType === _chartCoreConstants2.default.ChartStudyType.Compare) {
                                liEl = document.createElement('li');
                                compSymCloseSpan = document.createElement('span');
                                compSymCloseSpan.setAttribute('style', 'display:inline-block; vertical-align:middle');

                                try {
                                    compareRect = _ember.default.$('<i/>', {
                                        class: 'glyphicon glyphicon-stop'
                                    })[0];

                                    compareRectColor = cp.plotInfos[0].lineColor.replace('0X', '#');
                                    compareRect.setAttribute('style', 'color: ' + compareRectColor);

                                    compareLbl = document.createElement('span');
                                    compareLbl.className = 'font-l pad-m-l';
                                    compareLbl.setAttribute('style', 'color: ' + compareRectColor);
                                    compareLbl.appendChild(document.createTextNode(cp.symObj.sym));

                                    compareCloseIcon = _ember.default.$('<i/>', {
                                        class: 'font-m icon-fore-color icon-chart-settings-close pad-m-l',
                                        on: {
                                            click: function click() {
                                                try {
                                                    baseChart.calcDP.removeCompareSymbol(this.strategy.cp);
                                                    baseChart.removeAddedChart(this.strategy.strategyId);
                                                } catch (e) {
                                                    that.utils.logger.logError('Error in remove chart');
                                                }
                                            }
                                        }
                                    })[0];

                                    compareCloseIcon.strategy = strategy;

                                    liEl.appendChild(compareRect);
                                    liEl.appendChild(compareLbl);
                                    compSymCloseSpan.appendChild(compareCloseIcon);
                                    liEl.appendChild(compSymCloseSpan);
                                    ulElComp.appendChild(liEl);
                                } catch (e) {
                                    that.utils.logger.logError('Error in display compare symbols' + e);
                                }
                            }
                        }
                    };

                    _ember.default.$.each(baseChart.chartComponents, function (index, component) {
                        if (component.chartStrategies.length > 0) {
                            ulEl = document.createElement('ul');
                            ulElComp = document.createElement('ul');

                            if (index > 0) {
                                padTop = component.properties.top - 10;

                                ulEl.className = 'stx-chart-summary-label dynamic-study-view';
                                ulEl.setAttribute('style', 'margin-top: ' + padTop + 'px; margin-left: 0;');

                                chartDiv.insertBefore(ulEl, chartDiv.querySelectorAll('#chartCanvas')[0]);
                            } else {
                                ulEl.setAttribute('style', 'list-style-type: none');
                                ulElComp.setAttribute('style', 'list-style-type: none');

                                _ember.default.$('#dynamic-study-view')[0].appendChild(ulElComp);
                                _ember.default.$('#dynamic-study-view')[0].appendChild(ulEl);
                            }

                            _ember.default.$.each(component.chartStrategies, strategyFunc);
                        }
                    });
                }
            } catch (e) {
                this.utils.logger.logError('Error in display studies' + e);
            }
        },

        _setPositionBackgroundDetails: function _setPositionBackgroundDetails() {
            try {
                var detailPanel = _ember.default.$('#detailPanelChart')[0];
                var mainComponent = this.baseChart.chartComponents[0];

                if (mainComponent) {
                    var properties = mainComponent.properties;
                    var height = properties.ht;
                    var width = properties.wd;

                    detailPanel.setAttribute('style', 'width: ' + width + 'px; height: ' + height + 'px; float: left; display: visible; top: 40px; left: 10px');
                }
            } catch (e) {
                this.utils.logger.logError('Error in Set Position detail Panel' + e);
            }
        },

        _toggleSearch: function _toggleSearch() {
            var searchCss = this.get('searchCss');
            this._onCloseOpenedSearchPopUps(); // If comparison search popup is opened, it should be closed before open search popup

            if (searchCss === 'search-open') {
                this._closeSearchPopup();
            } else {
                this._showSearchPopup();
            }
        },

        _showSearchPopup: function _showSearchPopup() {
            var modal = this.get('chartPanelSearchPopup');
            this.set('searchCss', 'search-open');
            this.set('enableOverlay', true);

            _ember.default.$('#chartPanelSearch')[0].focus();
            modal.send('showModalPopup');
        },

        _closeSearchPopup: function _closeSearchPopup() {
            var modal = this.get('chartPanelSearchPopup');
            this.set('searchCss', 'search-close');
            this.set('enableOverlay', false);

            if (modal) {
                modal.send('closeModalPopup');
            }

            this.set('searchKey', '');
        },

        _toggleCompareSearch: function _toggleCompareSearch() {
            var cSearchCss = this.get('compareSearchCss');
            this._onCloseOpenedSearchPopUps(); // If search popup is opened, it should be closed before open comparison search popup

            if (cSearchCss === 'search-open') {
                this._closeCompareSearchPopup();
            } else {
                this._showCompareSearchPopup();
            }
        },

        _showCompareSearchPopup: function _showCompareSearchPopup() {
            var modal = this.get('compareChartPanelSearchPopup');
            this.set('compareSearchCss', 'search-open');
            this.set('enableOverlay', true);

            modal.send('showModalPopup');
        },

        _closeCompareSearchPopup: function _closeCompareSearchPopup() {
            this.set('compareSearchCss', 'search-close');
            this.set('enableOverlay', false);
            var modal = this.get('compareChartPanelSearchPopup');

            if (modal) {
                modal.send('closeModalPopup');
            }

            this.set('compareSearchKey', '');
        },

        _onComparison: function _onComparison(params) {
            var baseChart = this.get('baseChart');

            if (baseChart.sym !== params.symObj.sym) {
                baseChart.addCompareSymbol(params.symObj.exg, params.symObj.sym, params.lineColor, params.colorIndex);

                var cDP = this.get('chartDataProvider');
                var chartSymbol = cDP.addChartSymbol(params.symObj.exg, params.symObj.sym);

                cDP.addChartDataSubscription(chartSymbol);

                this.set('compareSearchKey', '');
            }
        },

        getSubMarket: function getSubMarket() {
            var that = this;
            var exchange = this.priceService.exchangeDS.getExchange(this.get('exg'));
            var subMarketArray = exchange.subMarketArray;
            var subMarket;

            if (subMarketArray && subMarketArray.length > 0) {
                _ember.default.$.each(subMarketArray, function (key, value) {
                    if (value.marketId === that.get('symbolObj').subMkt) {
                        subMarket = value.lDes;
                    }
                });
            }

            this.set('subMarket', subMarket);
        },

        _onResetChart: function _onResetChart() {
            this.get('baseChart').onResetZoom();
            this._removeStudies([this.get('volumeStudyDescriptor')]);
        },

        _onAddStocksToCustomWL: function _onAddStocksToCustomWL() {
            var stock = this.get('symbolObj');
            var myFavoriteCustomWL = 0;

            _sharedService.default.getService('price').watchListDS.addStocksToCustomWL(stock, myFavoriteCustomWL);
            this.set('isAddedToCustomWatchList', true);
        },

        _onScreenShare: function _onScreenShare() {
            _sharedService.default.getService('priceUI').shareScreenshot([this.get('symbolObj.sDes'), ' ', '#', this.get('symbolObj.sym')].join(''));
        },

        _onCloseOpenedSearchPopUps: function _onCloseOpenedSearchPopUps() {
            var searchCss = this.get('searchCss');
            var cSearchCss = this.get('compareSearchCss');

            if (searchCss === 'search-open') {
                this._closeSearchPopup();
            }

            if (cSearchCss === 'search-open') {
                this._closeCompareSearchPopup();
            }
        },

        _onSymbolSelected: function _onSymbolSelected(stock) {
            try {
                var that = this;
                var refreshFN = function refreshFN() {
                    that._toggleSearch();

                    that.refreshWidget({ exg: stock.exg, sym: stock.sym, inst: stock.inst });
                    that.getSubMarket();

                    that.utils.logger.logInfo('Refresh widget is invoked by Symbol popup selection');
                };

                _ember.default.$('#chartPanelSearch')[0].blur();

                // Randomly chart is drawing before close key pad and it is causing chart is drawing on keypad doesn't cover area (Shrinking chart).

                if (!that.get('isKeyPadOpened')) {
                    refreshFN();
                } else {
                    that.set('keyPadCloseFunc', refreshFN);
                }

                this.set('isAddedToCustomWatchList', _sharedService.default.getService('price').watchListDS.isSymbolAvailableInCustomWL(this.get('symbolObj')));
            } catch (e) {
                this.utils.logger.logError('Error in symbol selected : ' + e);
            }
        },

        actions: {
            toggleSearch: function toggleSearch() {
                this._toggleSearch();
            },

            toggleCompareSearch: function toggleCompareSearch() {
                this._toggleCompareSearch();
            },

            chartTypeSelected: function chartTypeSelected(tabItem) {
                this._setActiveTab(tabItem);
                this._super(tabItem);
            },

            setChartStyle: function setChartStyle(option) {
                this._setChartStyle(option);
            },

            onCreateStudy: function onCreateStudy(option) {
                var vSD = this.get('baseChart').quickAddStudy(option.ChartIndID);
                this.chartStudies.pushObject(vSD);
            },

            onOrientationChanged: function onOrientationChanged(isLandscape) {
                this.onOrientationChanged(isLandscape);
            },

            onResetChart: function onResetChart() {
                this._onResetChart();
            },

            addStocksToCustomWL: function addStocksToCustomWL() {
                this._onAddStocksToCustomWL();
            },

            buy: function buy() {
                this.showOrderTicket(false);
            },

            onBuyMore: function onBuyMore() {
                this.showOrderTicket(false);
            },

            onLiquidate: function onLiquidate() {
                this.showOrderTicket(true);
            },

            onShareScreen: function onShareScreen() {
                this._onScreenShare();
            },

            onSearchSymbolSelected: function onSearchSymbolSelected(stock) {
                this._onSymbolSelected(stock);
            },

            showSearchPopup: function showSearchPopup() {
                // this._showSearchPopup();
            },

            closeSearchPopup: function closeSearchPopup() {
                // this._closeSearchPopup();
            },

            onCompareSearchSymbolSelected: function onCompareSearchSymbolSelected(stock) {
                _ember.default.$('#compareChartPanelSearch')[0].blur();

                this._toggleCompareSearch();
                this._onComparison({ symObj: stock });
            },

            showCompareSearchPopup: function showCompareSearchPopup() {
                this._showCompareSearchPopup();
            },

            closeCompareSearchPopup: function closeCompareSearchPopup() {
                this._closeCompareSearchPopup();
            },

            onItemSelection: function onItemSelection(option) {
                switch (option.Action) {
                    case 'Reset':
                        this._onResetChart();
                        break;

                    case 'Share':
                        this._onScreenShare();
                        break;

                    case 'AddToWL':
                        this._onAddStocksToCustomWL();
                        break;

                    default:
                        return;
                }
            },

            onSymbolPopupFocusLost: function onSymbolPopupFocusLost() {
                this._onCloseOpenedSearchPopUps();
            }
        }
    });


    _ember.default.Handlebars.helper('chart-status-panel', _chartStatusPanel.default);
});
define("universal-app/templates/chart/pro-chart-tab", ["exports"], function (exports) {
  "use strict";

  exports.default = Ember.HTMLBars.template(function () {
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "full-width col-xs-12 full-height");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "col-xs-12 widget-outlet");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks,
            inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [0, 1]), 1, 1);
        inline(env, morph0, context, "outlet", ["w1"], {});
        return fragment;
      }
    };
  }());
});
define("universal-app/templates/chart/pro-chart", ["exports"], function (exports) {
  "use strict";

  exports.default = Ember.HTMLBars.template(function () {
    var child0 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment, 1, 1, contextualElement);
          inline(env, morph0, context, "global-search", [], { "enableContentSettings": false, "searchKey": get(env, context, "searchKey"), "showWidgetButtons": get(env, context, "showWidgetButtons"), "closePopup": "closeSearchPopup", "openPopup": "showSearchPopup", "stopGlobalNotification": true, "clickAction": "onSearchSymbolSelected", "analyticsKey": get(env, context, "gaKey"), "wkey": get(env, context, "searchSymbolKey") });
          return fragment;
        }
      };
    }();
    var child1 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("li");
          var el2 = dom.createElement("a");
          var el3 = dom.createElement("i");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("span");
          dom.setAttribute(el3, "class", "v-middle pad-s-l");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              element = hooks.element,
              concat = hooks.concat,
              attribute = hooks.attribute,
              content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element3 = dom.childAt(fragment, [1, 0]);
          var element4 = dom.childAt(element3, [0]);
          var attrMorph0 = dom.createAttrMorph(element4, 'class');
          var morph0 = dom.createMorphAt(dom.childAt(element3, [1]), 0, 0);
          element(env, element3, context, "action", ["setChartStyle", get(env, context, "item")], {});
          attribute(env, attrMorph0, element4, "class", concat(env, ["chart-btn-icon chart-icon-dropdown v-middle pad-s-r ", get(env, context, "item.Icon")]));
          content(env, morph0, context, "item.DisplayName");
          return fragment;
        }
      };
    }();
    var child2 = function () {
      var child0 = function () {
        return {
          isHTMLBars: true,
          revision: "Ember@1.11.1",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("                                ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("li");
            var el2 = dom.createElement("a");
            var el3 = dom.createComment("");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks,
                get = hooks.get,
                element = hooks.element,
                content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element2 = dom.childAt(fragment, [1, 0]);
            var morph0 = dom.createMorphAt(element2, 0, 0);
            element(env, element2, context, "action", ["studyDialog", get(env, context, "item")], {});
            content(env, morph0, context, "item.DisplayName");
            return fragment;
          }
        };
      }();
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment, 0, 0, contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "each", [get(env, context, "allIndicators")], { "keyword": "item" }, child0, null);
          return fragment;
        }
      };
    }();
    var child3 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("li");
          var el2 = dom.createElement("a");
          var el3 = dom.createElement("i");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("span");
          dom.setAttribute(el3, "class", "pad-s-l v-middle");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              element = hooks.element,
              concat = hooks.concat,
              attribute = hooks.attribute,
              content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1, 0]);
          var element1 = dom.childAt(element0, [0]);
          var attrMorph0 = dom.createAttrMorph(element1, 'class');
          var morph0 = dom.createMorphAt(dom.childAt(element0, [1]), 0, 0);
          element(env, element0, context, "action", ["setChartGridStyle", get(env, context, "item")], {});
          attribute(env, attrMorph0, element1, "class", concat(env, ["chart-btn-icon chart-icon-dropdown pad-s-r ", get(env, context, "item.Icon"), " v-middle"]));
          content(env, morph0, context, "item.DisplayName");
          return fragment;
        }
      };
    }();
    var child4 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "class", "layout-col border-right pad-l-l");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }();
    var child5 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment, 1, 1, contextualElement);
          inline(env, morph0, context, "global-search", [], { "enableContentSettings": false, "searchKey": get(env, context, "searchKeyCompare"), "showWidgetButtons": get(env, context, "showWidgetButtons"), "stopGlobalNotification": true, "clickAction": "onCompareSymbol", "closePopup": "closeSearchComparePopup", "openPopup": "showSearchComparePopup", "analyticsKey": get(env, context, "gaKey"), "wkey": get(env, context, "compareSymbolKey") });
          return fragment;
        }
      };
    }();
    var child6 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                            ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("li");
          dom.setAttribute(el1, "class", "pad-s-lr chart-detailpanel-border-right");
          dom.setAttribute(el1, "style", "margin-right: 0;");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]), 0, 0);
          content(env, morph0, context, "subMarket");
          return fragment;
        }
      };
    }();
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "widget_new full-height chart-dropdown");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "full-height widget-container-new");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" Watermark ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "id", "detailPanelChart");
        dom.setAttribute(el3, "class", "layout-container full-height full-width pos-abs");
        dom.setAttribute(el3, "style", "z-index: 0");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "layout-col h-middle v-middle");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5, "class", "chart-watermark");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" Chart tool-bar ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "layout-container full-width font-m pro-chart-ctrl-panel pos-rel pad-widget-top pad-widget-bottom pad-widget-left pad-widget-right border-bottom");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "layout-container");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("  =========  Search Box - 01 =============  ");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "data-id", "chart-search");
        dom.setAttribute(el6, "class", "input-group pro-chart-search-width");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "input-group-btn pos-abs top-zero");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("button");
        dom.setAttribute(el8, "class", "btn search-ctrl-btn");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("i");
        dom.setAttribute(el9, "class", "glyphicon glyphicon-search");
        dom.setAttribute(el9, "aria-hidden", "true");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("  =========  /Search Box - 01 =============  ");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "modal-symbol chart-search-popup-position");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col border-right pad-l-l");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "data-id", "period-dropdown");
        dom.setAttribute(el5, "class", "layout-col");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", ":layout-col :overflow-visible pad-l-l");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col border-right pad-m-l");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col pad-l-l");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("<div data-id=\"chartCategories-dropdown\" class=\"layout-col dropdown overflow-visible pad-l-l\">");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("</div>");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "data-id", "intervals-dropdown");
        dom.setAttribute(el5, "class", "layout-col pad-l-r dropdown overflow-visible");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "data-id", "chartStyles-dropdown");
        dom.setAttribute(el5, "class", "layout-col dropdown overflow-visible");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "class", "hint--bottom hint--rounded hint--bounce btn btn-default dropdown-toggle background-color-none dropdown-solid-back-color");
        dom.setAttribute(el6, "type", "button");
        dom.setAttribute(el6, "id", "dropdownMenu1");
        dom.setAttribute(el6, "data-toggle", "dropdown");
        dom.setAttribute(el6, "aria-haspopup", "true");
        dom.setAttribute(el6, "aria-expanded", "true");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7, "class", "layout-col pad-s-l font-m");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7, "class", "layout-col icon-angle-down pad-m-l h-right font-m");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "dropdown-menu");
        dom.setAttribute(el6, "aria-labelledby", "dropdownMenu1");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col border-right pad-l-l");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col pad-l-l");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col dropdown overflow-visible");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "class", "btn btn-default dropdown-toggle background-color-none dropdown-solid-back-color");
        dom.setAttribute(el6, "type", "button");
        dom.setAttribute(el6, "data-toggle", "dropdown");
        dom.setAttribute(el6, "id", "dropdownMenu1");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "layout-container full-width");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "layout-col");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "layout-col icon-angle-down h-right pad-m-l");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "dropdown dropdown-menu y-scroll diplay-block dropdown-menu-height");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col overflow-visible pad-s-lr hint--bottom hint--rounded hint--bounce");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "id", "volume-btn");
        dom.setAttribute(el6, "class", "chart-btn-icon");
        dom.setAttribute(el6, "type", "button");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7, "class", "icon-chart-volume h-middle");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col overflow-visible pad-s-r hint--bottom hint--rounded hint--bounce");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "id", "indexing-btn");
        dom.setAttribute(el6, "class", "chart-btn-icon active");
        dom.setAttribute(el6, "type", "button");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7, "class", "icon-info-circle1 h-middle");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col overflow-visible hint--bottom hint--rounded hint--bounce");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "id", "crosshair-btn");
        dom.setAttribute(el6, "class", "chart-btn-icon");
        dom.setAttribute(el6, "type", "button");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.setAttribute(el7, "class", "icon-chart-cross-hair h-middle");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col dropdown chart-icon-btn pad-s-l overflow-visible");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("button");
        dom.setAttribute(el6, "class", "hint--bottom hint--rounded hint--bounce btn btn-default dropdown-toggle background-color-none dropdown-chart-grid dropdown-solid-back-color");
        dom.setAttribute(el6, "type", "button");
        dom.setAttribute(el6, "id", "dropdownMenu1");
        dom.setAttribute(el6, "data-toggle", "dropdown");
        dom.setAttribute(el6, "aria-haspopup", "true");
        dom.setAttribute(el6, "aria-expanded", "true");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("i");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("span");
        dom.setAttribute(el7, "class", "layout-col icon-angle-down pad-s-l font-m");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "dropdown-menu");
        dom.setAttribute(el6, "aria-labelledby", "dropdownMenu1");
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("  =========  Search Box - 02 =============  ");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "data-id", "chart-compare");
        dom.setAttribute(el5, "class", "layout-col");
        var el6 = dom.createTextNode("\n");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "layout-col pad-l-l");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "input-group pro-chart-compare-width pos-rel");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9, "class", "input-group-btn pos-abs top-zero");
        var el10 = dom.createTextNode("\n                                    ");
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("button");
        dom.setAttribute(el10, "class", "btn search-ctrl-btn");
        var el11 = dom.createTextNode("\n                                        ");
        dom.appendChild(el10, el11);
        var el11 = dom.createElement("i");
        dom.setAttribute(el11, "class", "glyphicon glyphicon-search");
        dom.setAttribute(el11, "aria-hidden", "true");
        dom.appendChild(el10, el11);
        var el11 = dom.createTextNode("\n                                    ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createTextNode("\n                                ");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "layout-col modal-symbol prochart-symbol-fix overflow-visible chart-search-popup-position");
        var el8 = dom.createTextNode("\n");
        dom.appendChild(el7, el8);
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("  =========  /Search Box - 02 =============  ");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "data-id", "chart-right");
        dom.setAttribute(el5, "class", "layout-col-24 ");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment(" Expand Button ");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("div class=\"layout-col v-top overflow-visible\">\n                    <div class=\"hint--bottom-left hint--bounce hint--rounded\" data-hint=\"{{fullScreenToggleTitle}}\"><a class=\"cursor-pointer\"><i class=\"icon-maximize\" {{action 'onToggleFullScreenMode'}} style=\"font-size: 16px\"></i></a></div>\n                </div");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment(" End Expand Button ");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col v-top overflow-visible");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col v-top overflow-visible");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-col-24");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" End Chart tool-bar ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" Chart Body ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "style", "margin: 0px; float: left; width: 100%;");
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment(" Chart Line Studies ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "prochart-line-studies-back ltr chart-line-studies-list");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("ul");
        dom.setAttribute(el5, "class", "pos-abs");
        dom.setAttribute(el5, "style", "list-style-type: none; margin: 0px;");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("li");
        dom.setAttribute(el6, "class", "pad-s-b");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("button");
        dom.setAttribute(el7, "id", "trend");
        dom.setAttribute(el7, "class", "pad-s-r pad-m-l pad-s-t hint--right hint--rounded hint--bounce chart-btn-icon chart-tab-icon");
        dom.setAttribute(el7, "type", "button");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-trend");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("li");
        dom.setAttribute(el6, "class", "pad-s-b");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("button");
        dom.setAttribute(el7, "id", "horizontal");
        dom.setAttribute(el7, "class", "pad-s-r pad-m-l pad-s-t hint--right hint--rounded hint--bounce chart-btn-icon chart-tab-icon");
        dom.setAttribute(el7, "type", "button");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-horizontal");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("li");
        dom.setAttribute(el6, "class", "pad-s-b");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("button");
        dom.setAttribute(el7, "id", "vertical");
        dom.setAttribute(el7, "class", "pad-s-r pad-m-l pad-s-t hint--right hint--rounded hint--bounce chart-btn-icon chart-tab-icon");
        dom.setAttribute(el7, "type", "button");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-vertical");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("li");
        dom.setAttribute(el6, "class", "pad-s-b");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("button");
        dom.setAttribute(el7, "id", "rectangle");
        dom.setAttribute(el7, "class", "pad-s-r pad-m-l pad-s-t hint--right hint--rounded hint--bounce chart-btn-icon chart-tab-icon");
        dom.setAttribute(el7, "type", "button");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-rectangle");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("li");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("button");
        dom.setAttribute(el7, "id", "ellipse");
        dom.setAttribute(el7, "class", "pad-s-r pad-m-l pad-s-t hint--right hint--rounded hint--bounce chart-btn-icon chart-tab-icon");
        dom.setAttribute(el7, "type", "button");
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-circle-2");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode(" ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment(" End Chart Line Studies ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment(" Chart Container ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "pad-widget-top");
        dom.setAttribute(el4, "style", "display: inline-block; margin: 0; float: right; height: 100%; width: calc(100% - 55px);");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "id", "chartContainer");
        dom.setAttribute(el5, "style", "height: 100%; width: 100%; position: relative");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "stx-chart-summary-label Z-index-zero");
        dom.setAttribute(el6, "style", "margin-top: 5px");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "layout-container full-width");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "stx-panel-symbol ltr");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "chart-trend-icon");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("i");
        dom.setAttribute(el9, "aria-hidden", "true");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "stx-panel-ltp");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("ul");
        dom.setAttribute(el8, "class", "hu left ltr font-m fade-fore-color");
        dom.setAttribute(el8, "style", "margin-left: 20px; margin-top: 6px; float: left");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createElement("span");
        var el11 = dom.createTextNode("O ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        dom.setAttribute(el10, "id", "huOpen");
        dom.setAttribute(el10, "style", "font-weight: bold");
        var el11 = dom.createComment("");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createElement("span");
        var el11 = dom.createTextNode("H ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        dom.setAttribute(el10, "id", "huHigh");
        dom.setAttribute(el10, "style", "font-weight: bold");
        var el11 = dom.createComment("");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createElement("span");
        var el11 = dom.createTextNode("L ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        dom.setAttribute(el10, "id", "huLow");
        dom.setAttribute(el10, "style", "font-weight: bold");
        var el11 = dom.createComment("");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("li");
        var el10 = dom.createElement("span");
        var el11 = dom.createTextNode("C ");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        var el10 = dom.createElement("span");
        dom.setAttribute(el10, "id", "huClose");
        dom.setAttribute(el10, "style", "font-weight: bold");
        var el11 = dom.createComment("");
        dom.appendChild(el10, el11);
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createComment(" <li><span class=\"font-s header-colour\">V: </span><span id=\"huVolume\" class=\"font-s colour-normal\" style=\"font-weight: bold\">{{pointVolume}}</span></li>");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                      ");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("  <li>\n                            <div class=\"chart-data-view\">\n                                <span class=\"font-s header-colour\">D: </span><span id=\"huDate\" class=\"font-s colour-normal\" style=\"font-weight: bold\">{{pointDate}}</span>\n                            </div>\n                        </li>");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "id", "dynamic-study-view");
        dom.setAttribute(el8, "class", "chart-data-view ltr");
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("ul class=\"hu left stx-panel-description\" style=\"display: none\">{{symbolObj.lDes}}</ul");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "hu chart-symbol-description-panel ltr font-m");
        dom.setAttribute(el6, "style", "display: none");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el7, "style", "margin-right: 0;");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el7, "style", "margin-right: 0;");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n");
        dom.appendChild(el6, el7);
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el7, "style", "margin-right: 0;");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "pad-s-lr");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "hu left zoom-panel");
        dom.setAttribute(el6, "style", "display: none");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn h-middle");
        var el8 = dom.createElement("i");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn h-middle");
        var el8 = dom.createElement("i");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        dom.setAttribute(el7, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn zoom-in h-middle");
        var el8 = dom.createElement("i");
        dom.setAttribute(el8, "class", "icon-plus-large font-xx-l");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                   ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment(" <img class=\"stx-loader\" src=\"assets/images/chartIQ/stx-loading.gif\" style=\"display:none; z-index:100\">");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment(" End Chart Container ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" End Chart Body ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" Dialog Container ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "stx-dialog-container");
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment(" The studyDialog is a general purpose dialog for entering the parameters for studies. It may be customized so long\n            as the id an class names remain the same. Note that it contains templates which are replicated dynamically ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "id", "studyDialog");
        dom.setAttribute(el4, "style", "display:none; height: auto; width: 520px;");
        dom.setAttribute(el4, "class", "pos-rel h-left stx-dialog");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-container full-width pad-widget-left pad-widget-right pad-m-tb wdgttl");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col");
        var el7 = dom.createElement("span");
        dom.setAttribute(el7, "class", "title font-l");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col-24");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col cursor-pointer");
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "icon-close-round");
        dom.setAttribute(el7, "style", "float: right");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-container full-width pad-widget-right pad-widget-left pad-m-b");
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "id", "chartStrategy");
        dom.setAttribute(el6, "style", "display: none");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-container full-width pad-m-b");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col widget-vline padding-input-section-chart v-top");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "id", "inputs");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "inputTemplate");
        dom.setAttribute(el8, "style", "display:none");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9, "class", "stx-data");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9, "class", "stx-heading font-m");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col padding-input-section-chart v-top");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "id", "outputs");
        var el8 = dom.createTextNode("\n                            ");
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("div");
        dom.setAttribute(el8, "class", "outputTemplate");
        dom.setAttribute(el8, "style", "display:none");
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9, "class", "stx-color");
        var el10 = dom.createElement("span");
        dom.appendChild(el9, el10);
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                                ");
        dom.appendChild(el8, el9);
        var el9 = dom.createElement("div");
        dom.setAttribute(el9, "class", "stx-heading font-m");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode("\n                            ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createTextNode("\n                        ");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "id", "parameters");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-container full-width pad-m-b font-l");
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("div class=\"layout-col h-left padding-input-section-chart\">\n                        <div class=\"btn-chart layout-inline\">{{app.lang.labels.reset}}</div>\n                        <div class=\"btn-chart layout-inline\">{{app.lang.labels.chartLabels.saveToDefault}}</div>\n                    </div");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "class", "layout-col h-right padding-input-section-chart");
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "btn btn-default layout-inline");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("div");
        dom.setAttribute(el7, "class", "btn btn-default layout-inline");
        var el8 = dom.createComment("");
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                    ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" End Dialog Container ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "dpi");
        dom.setAttribute(el1, "style", "height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "chart-styles");
        dom.setAttribute(el1, "style", "display: none");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks,
            get = hooks.get,
            concat = hooks.concat,
            attribute = hooks.attribute,
            inline = hooks.inline,
            content = hooks.content,
            element = hooks.element,
            block = hooks.block,
            subexpr = hooks.subexpr;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element5 = dom.childAt(fragment, [0]);
        var element6 = dom.childAt(element5, [3]);
        var element7 = dom.childAt(element6, [7]);
        var element8 = dom.childAt(element7, [1]);
        var element9 = dom.childAt(element8, [1]);
        var element10 = dom.childAt(element9, [3]);
        var element11 = dom.childAt(element10, [3, 1]);
        var element12 = dom.childAt(element8, [5]);
        var element13 = dom.childAt(element12, [1]);
        var element14 = dom.childAt(element8, [19]);
        var element15 = dom.childAt(element14, [1]);
        var element16 = dom.childAt(element15, [1]);
        var element17 = dom.childAt(element8, [25]);
        var element18 = dom.childAt(element8, [27]);
        var element19 = dom.childAt(element18, [1]);
        var element20 = dom.childAt(element8, [29]);
        var element21 = dom.childAt(element20, [1]);
        var element22 = dom.childAt(element8, [31]);
        var element23 = dom.childAt(element22, [1]);
        var element24 = dom.childAt(element8, [33]);
        var element25 = dom.childAt(element24, [1]);
        var element26 = dom.childAt(element25, [1]);
        var element27 = dom.childAt(element8, [37]);
        var element28 = dom.childAt(element27, [3]);
        var element29 = dom.childAt(element28, [1, 1]);
        var element30 = dom.childAt(element29, [3, 1]);
        var element31 = dom.childAt(element7, [3]);
        var element32 = dom.childAt(element31, [1]);
        var element33 = dom.childAt(element31, [3]);
        var element34 = dom.childAt(element6, [13]);
        var element35 = dom.childAt(element34, [3, 1]);
        var element36 = dom.childAt(element35, [1, 1]);
        var element37 = dom.childAt(element35, [3, 1]);
        var element38 = dom.childAt(element35, [5, 1]);
        var element39 = dom.childAt(element35, [7, 1]);
        var element40 = dom.childAt(element35, [9, 1]);
        var element41 = dom.childAt(element34, [13, 1]);
        var element42 = dom.childAt(element41, [1, 1]);
        var element43 = dom.childAt(element42, [3, 1]);
        var element44 = dom.childAt(element42, [7]);
        var element45 = dom.childAt(element42, [9]);
        var element46 = dom.childAt(element42, [11]);
        var element47 = dom.childAt(element41, [5]);
        var element48 = dom.childAt(element41, [7]);
        var element49 = dom.childAt(element48, [1]);
        var element50 = dom.childAt(element49, [0]);
        var element51 = dom.childAt(element48, [3]);
        var element52 = dom.childAt(element51, [0]);
        var element53 = dom.childAt(element48, [5]);
        var element54 = dom.childAt(element6, [19, 3]);
        var element55 = dom.childAt(element54, [1, 5, 0]);
        var element56 = dom.childAt(element54, [9, 3]);
        var element57 = dom.childAt(element56, [1]);
        var element58 = dom.childAt(element56, [3]);
        var morph0 = dom.createMorphAt(element5, 1, 1);
        var attrMorph0 = dom.createAttrMorph(element5, 'id');
        var morph1 = dom.createMorphAt(dom.childAt(element6, [3, 1, 1]), 0, 0);
        var morph2 = dom.createMorphAt(element10, 1, 1);
        var morph3 = dom.createMorphAt(dom.childAt(element9, [7]), 1, 1);
        var attrMorph1 = dom.createAttrMorph(element12, 'id');
        var morph4 = dom.createMorphAt(element13, 1, 1);
        var attrMorph2 = dom.createAttrMorph(element13, 'id');
        var morph5 = dom.createMorphAt(dom.childAt(element8, [17]), 1, 1);
        var attrMorph3 = dom.createAttrMorph(element15, 'data-hint');
        var attrMorph4 = dom.createAttrMorph(element16, 'class');
        var morph6 = dom.createMorphAt(dom.childAt(element15, [3]), 0, 0);
        var morph7 = dom.createMorphAt(dom.childAt(element14, [3]), 1, 1);
        var morph8 = dom.createMorphAt(dom.childAt(element17, [1, 1, 1]), 0, 0);
        var morph9 = dom.createMorphAt(dom.childAt(element17, [3]), 1, 1);
        var attrMorph5 = dom.createAttrMorph(element18, 'data-hint');
        var attrMorph6 = dom.createAttrMorph(element20, 'data-hint');
        var attrMorph7 = dom.createAttrMorph(element22, 'data-hint');
        var attrMorph8 = dom.createAttrMorph(element25, 'data-hint');
        var attrMorph9 = dom.createAttrMorph(element26, 'class');
        var morph10 = dom.createMorphAt(dom.childAt(element24, [3]), 1, 1);
        var morph11 = dom.createMorphAt(element27, 1, 1);
        var attrMorph10 = dom.createAttrMorph(element27, 'id');
        var attrMorph11 = dom.createAttrMorph(element28, 'id');
        var morph12 = dom.createMorphAt(element29, 1, 1);
        var morph13 = dom.createMorphAt(dom.childAt(element28, [3]), 1, 1);
        var attrMorph12 = dom.createAttrMorph(element32, 'id');
        var attrMorph13 = dom.createAttrMorph(element33, 'id');
        var attrMorph14 = dom.createAttrMorph(element36, 'data-hint');
        var attrMorph15 = dom.createAttrMorph(element37, 'data-hint');
        var attrMorph16 = dom.createAttrMorph(element38, 'data-hint');
        var attrMorph17 = dom.createAttrMorph(element39, 'data-hint');
        var attrMorph18 = dom.createAttrMorph(element40, 'data-hint');
        var morph14 = dom.createMorphAt(element34, 7, 7);
        var morph15 = dom.createMorphAt(element34, 9, 9);
        var attrMorph19 = dom.createAttrMorph(element41, 'class');
        var morph16 = dom.createMorphAt(dom.childAt(element42, [1]), 0, 0);
        var attrMorph20 = dom.createAttrMorph(element43, 'class');
        var morph17 = dom.createMorphAt(dom.childAt(element42, [5]), 0, 0);
        var morph18 = dom.createMorphAt(element44, 0, 0);
        var attrMorph21 = dom.createAttrMorph(element44, 'class');
        var morph19 = dom.createMorphAt(element45, 0, 0);
        var attrMorph22 = dom.createAttrMorph(element45, 'class');
        var morph20 = dom.createMorphAt(dom.childAt(element46, [1, 1]), 0, 0);
        var morph21 = dom.createMorphAt(dom.childAt(element46, [3, 1]), 0, 0);
        var morph22 = dom.createMorphAt(dom.childAt(element46, [5, 1]), 0, 0);
        var morph23 = dom.createMorphAt(dom.childAt(element46, [7, 1]), 0, 0);
        var morph24 = dom.createMorphAt(dom.childAt(element47, [1]), 0, 0);
        var morph25 = dom.createMorphAt(dom.childAt(element47, [3]), 0, 0);
        var morph26 = dom.createMorphAt(element47, 5, 5);
        var morph27 = dom.createMorphAt(dom.childAt(element47, [7]), 0, 0);
        var morph28 = dom.createMorphAt(dom.childAt(element47, [9]), 0, 0);
        var attrMorph23 = dom.createAttrMorph(element49, 'data-hint');
        var attrMorph24 = dom.createAttrMorph(element50, 'class');
        var attrMorph25 = dom.createAttrMorph(element51, 'data-hint');
        var attrMorph26 = dom.createAttrMorph(element52, 'class');
        var attrMorph27 = dom.createAttrMorph(element53, 'data-hint');
        var morph29 = dom.createMorphAt(element57, 0, 0);
        var morph30 = dom.createMorphAt(element58, 0, 0);
        attribute(env, attrMorph0, element5, "id", concat(env, ["proChartContainer-", get(env, context, "wkey")]));
        inline(env, morph0, context, "widget-header", [], { "linkOptions": get(env, context, "links"), "defaultSelectedLink": get(env, context, "defaultLink"), "selectedLink": get(env, context, "selectedLink"), "setLink": "setLink", "widgetTitle": get(env, context, "app.lang.labels.proChartTitle"), "innerWidgets": get(env, context, "innerWidgets"), "innerWidgetAction": "renderInnerWidgetItems", "isResizeAvailable": true, "resizeAction": "onToggleFullScreenMode", "fullScreenToggleTitle": get(env, context, "fullScreenToggleTitle"), "isWidgetCloseAvailable": get(env, context, "isWidgetCloseAvailable"), "closeWidgetAction": "closeWidgetAction", "closeActionTarget": get(env, context, "controller"), "cursorMoveCss": get(env, context, "cursorMoveCss"), "app": get(env, context, "app") });
        content(env, morph1, context, "symbolObj.dispProp1");
        inline(env, morph2, context, "input-field-text", [], { "type": "text", "value": get(env, context, "searchKey"), "action": "showSearchPopup", "onKeyPress": "showSearchPopup", "class": "search-query search-ctrl form-control mousetrap", "placeholder": get(env, context, "app.lang.labels.chartBaseSymbol") });
        element(env, element11, context, "action", ["showSearchPopup"], {});
        block(env, morph3, context, "modal-popup", [], { "isEnabled": false, "id": get(env, context, "searchSymbolKey") }, child0, null);
        attribute(env, attrMorph1, element12, "id", concat(env, ["periodsDropdownContainer-", get(env, context, "wkey")]));
        attribute(env, attrMorph2, element13, "id", concat(env, ["periodsDropdown-", get(env, context, "wkey")]));
        inline(env, morph4, context, "tab-dropdown", [], { "isDropdown": get(env, context, "isPeriodsDropdown"), "displayList": get(env, context, "periods"), "newActive": get(env, context, "chartPeriodNewActive"), "tabTooltipLabel": "chartperiodTitle", "defaultSelect": get(env, context, "chartPeriod"), "labelKey": "DisplayName", "actionName": "setChartPeriod", "tabPanelClass": "widget-tab-panel", "tabItemClass": "layout-inline mgn-s-r widget-tab-item", "tabLinkClass": "layout-inline" });
        inline(env, morph5, context, "bootstrap-dropdown-select", [], { "options": get(env, context, "intervals"), "value": get(env, context, "chartInterval.DisplayName"), "valueKey": "DisplayName", "labelKey": "DisplayName", "selectAction": "setChartInterval", "lblClass": "ltr", "toolTip": get(env, context, "app.lang.labels.chartIntvTitle"), "responsiveIcon": subexpr(env, context, "onResponsive", [get(env, context, "responsive.trigger"), get(env, context, "responsive"), "chart-right", 3], {}), "iconClass": "icon-graph1" });
        attribute(env, attrMorph3, element15, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartStyleTitle")]));
        attribute(env, attrMorph4, element16, "class", concat(env, ["layout-col ", get(env, context, "chartStyle.Icon")]));
        content(env, morph6, context, "chartStyle.DisplayName");
        block(env, morph7, context, "each", [get(env, context, "chartStyles")], { "keyword": "item" }, child1, null);
        content(env, morph8, context, "app.lang.labels.chartIndicator");
        block(env, morph9, context, "if", [get(env, context, "allIndicators")], {}, child2, null);
        attribute(env, attrMorph5, element18, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartShowVol")]));
        element(env, element19, context, "action", ["onToggleVolume"], {});
        attribute(env, attrMorph6, element20, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartOnIndexing")]));
        element(env, element21, context, "action", ["onToggleIndexing"], {});
        attribute(env, attrMorph7, element22, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartShowCrosH")]));
        element(env, element23, context, "action", ["onToggleCrossHair"], {});
        attribute(env, attrMorph8, element25, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartGridTitle")]));
        attribute(env, attrMorph9, element26, "class", concat(env, ["layout-col ", get(env, context, "gridSetting.Icon")]));
        block(env, morph10, context, "each", [get(env, context, "gridTypes")], { "keyword": "item" }, child3, null);
        attribute(env, attrMorph10, element27, "id", concat(env, ["chartCompareContainer-", get(env, context, "wkey")]));
        block(env, morph11, context, "if", [get(env, context, "isChartRespDisabled")], {}, child4, null);
        attribute(env, attrMorph11, element28, "id", concat(env, ["chartCompare-", get(env, context, "wkey")]));
        inline(env, morph12, context, "input-field-text", [], { "type": "text", "value": get(env, context, "searchKeyCompare"), "action": "showSearchComparePopup", "onKeyPress": "showSearchComparePopup", "class": "search-query search-ctrl form-control mousetrap", "placeholder": get(env, context, "app.lang.labels.chartCompareSymbol") });
        element(env, element30, context, "action", ["showSearchComparePopup"], {});
        block(env, morph13, context, "modal-popup", [], { "isEnabled": false, "id": get(env, context, "compareSymbolKey") }, child5, null);
        element(env, element31, context, "bind-attr", [], { "class": ":layout-container :full-width :font-m :pos-rel isChartRespDisabled:padding-zero:pad-m-t" });
        attribute(env, attrMorph12, element32, "id", concat(env, ["periodsDropdownResLocation-", get(env, context, "wkey")]));
        attribute(env, attrMorph13, element33, "id", concat(env, ["chartCompareResLocation-", get(env, context, "wkey")]));
        element(env, element34, context, "bind-attr", [], { "class": ":full-width :pos-rel isChartRespDisabled:pro-chart-content:pro-chart-content-responsive" });
        attribute(env, attrMorph14, element36, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartLineSTrend")]));
        element(env, element36, context, "action", ["setLineStudy", "trend"], {});
        attribute(env, attrMorph15, element37, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartLineSHorizontal")]));
        element(env, element37, context, "action", ["setLineStudy", "horizontal"], {});
        attribute(env, attrMorph16, element38, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartLineSVertical")]));
        element(env, element38, context, "action", ["setLineStudy", "vertical"], {});
        attribute(env, attrMorph17, element39, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartLineSRec")]));
        element(env, element39, context, "action", ["setLineStudy", "rectangle"], {});
        attribute(env, attrMorph18, element40, "data-hint", concat(env, [get(env, context, "app.lang.labels.chartLineSEllipse")]));
        element(env, element40, context, "action", ["setLineStudy", "ellipse"], {});
        inline(env, morph14, context, "loading-indicator", [], { "isLoading": get(env, context, "isLoading") });
        inline(env, morph15, context, "single-message-viewer", [], { "message": get(env, context, "app.lang.messages.dataNotAvailable"), "showMessage": get(env, context, "showError"), "messageCss": "appttl-light-bg-fore-color", "backgroundCss": "h-middle pos-abs full-width mgn-l-t pad-l-t" });
        attribute(env, attrMorph19, element41, "class", concat(env, [get(env, context, "chartContainer")]));
        content(env, morph16, context, "symbolObj.dispProp1");
        attribute(env, attrMorph20, element43, "class", concat(env, ["glyphicon ", get(env, context, "trendIconCSS")]));
        content(env, morph17, context, "symbolLTP");
        attribute(env, attrMorph21, element44, "class", concat(env, [get(env, context, "chgColorCSS"), " ltr font-m pad-s-l"]));
        content(env, morph18, context, "symbolPCTCHG");
        attribute(env, attrMorph22, element45, "class", concat(env, [get(env, context, "chgColorCSS"), " ltr font-m pad-s-l"]));
        content(env, morph19, context, "symbolCHG");
        content(env, morph20, context, "pointOpen");
        content(env, morph21, context, "pointHigh");
        content(env, morph22, context, "pointLow");
        content(env, morph23, context, "pointClose");
        content(env, morph24, context, "symbolObj.lDes");
        content(env, morph25, context, "symbolObj.exg");
        block(env, morph26, context, "if", [get(env, context, "subMarket")], {}, child6, null);
        content(env, morph27, context, "chartPeriod");
        content(env, morph28, context, "chartDisplayInterval");
        attribute(env, attrMorph23, element49, "data-hint", concat(env, [get(env, context, "app.lang.labels.zoomOut")]));
        element(env, element49, context, "action", ["onCenterZoomOut"], {});
        attribute(env, attrMorph24, element50, "class", concat(env, [get(env, context, "toggleZoomCss"), " icon-minus-center font-xx-l"]));
        attribute(env, attrMorph25, element51, "data-hint", concat(env, [get(env, context, "app.lang.labels.reset")]));
        element(env, element51, context, "action", ["onResetZoom"], {});
        attribute(env, attrMorph26, element52, "class", concat(env, [get(env, context, "toggleZoomCss"), " icon-android-expand font-xx-l"]));
        attribute(env, attrMorph27, element53, "data-hint", concat(env, [get(env, context, "app.lang.labels.zoomIn")]));
        element(env, element53, context, "action", ["onCenterZoomIn"], {});
        element(env, element55, context, "action", ["dismissStudyDialog"], {});
        element(env, element57, context, "action", ["createStudy"], {});
        inline(env, morph29, context, "if", [get(env, context, "creatingNewInd"), get(env, context, "app.lang.labels.create"), get(env, context, "app.lang.labels.update")], {});
        element(env, element58, context, "action", ["dismissStudyDialog"], {});
        content(env, morph30, context, "app.lang.labels.cancel");
        return fragment;
      }
    };
  }());
});
define("universal-app/templates/chart/regular-chart", ["exports"], function (exports) {
  "use strict";

  exports.default = Ember.HTMLBars.template(function () {
    var child0 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              get = hooks.get,
              inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment, 1, 1, contextualElement);
          inline(env, morph0, context, "widget-header", [], { "widgetTitle": get(env, context, "app.lang.labels.chart"), "symbol": get(env, context, "symbolObj.dispProp1"), "hideWidgetLink": get(env, context, "hideWidgetLink"), "isTabAvailable": true, "titleTabs": get(env, context, "arrDisplayPeriods"), "tabClass": "nav-tabs-dq-charts", "tabAction": "chartTypeSelected", "linkOptions": get(env, context, "links"), "defaultSelectedLink": get(env, context, "defaultLink"), "selectedLink": get(env, context, "selectedLink"), "setLink": "setLink", "hideSymbol": get(env, context, "hideSymbol"), "searchedSymbol": get(env, context, "symbolObj.dispProp1"), "innerWidgets": get(env, context, "innerWidgets"), "innerWidgetAction": "renderInnerWidgetItems", "isWidgetCloseAvailable": get(env, context, "isWidgetCloseAvailable"), "closeWidgetAction": "closeWidgetAction", "closeActionTarget": get(env, context, "controller"), "isSearchAvailable": get(env, context, "isSearchAvailable"), "searchID": get(env, context, "searchID"), "clickAction": "changeSymbol", "cursorMoveCss": get(env, context, "cursorMoveCss"), "app": get(env, context, "app") });
          return fragment;
        }
      };
    }();
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "widget_new full-height pad-s-b");
        var el2 = dom.createTextNode("\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "style", "height:calc(100% - 0px);");
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "left full-width full-height");
        var el4 = dom.createTextNode("\n\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "widget-container-new pad-widget-left pad-widget-right pad-widget-top pad-s-b");
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "role", "tabpanel");
        dom.setAttribute(el5, "id", "dq_chart");
        dom.setAttribute(el5, "style", "height:calc(100% - 0px); position:relative;");
        var el6 = dom.createTextNode("\n                ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n            ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n        ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "dpi");
        dom.setAttribute(el1, "style", "height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "chart-styles");
        dom.setAttribute(el1, "style", "display: none");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks,
            get = hooks.get,
            block = hooks.block,
            subexpr = hooks.subexpr,
            concat = hooks.concat,
            attribute = hooks.attribute,
            element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0, 1, 1]);
        var element1 = dom.childAt(element0, [3]);
        var element2 = dom.childAt(element1, [1]);
        var morph0 = dom.createMorphAt(element0, 1, 1);
        var attrMorph0 = dom.createAttrMorph(element1, 'style');
        block(env, morph0, context, "unless", [get(env, context, "isTitleDisabled")], {}, child0, null);
        attribute(env, attrMorph0, element1, "style", concat(env, ["height:calc(100% - ", subexpr(env, context, "if", [get(env, context, "isTablet"), "28px", "19px"], {}), ");"]));
        element(env, element2, context, "bind-attr", [], { "class": ":regular-chart-container :dq_chart :full-width chartContainer" });
        return fragment;
      }
    };
  }());
});
define("universal-app/templates/chart/technical-score-chart", ["exports"], function (exports) {
  "use strict";

  exports.default = Ember.HTMLBars.template(function () {
    var child0 = function () {
      return {
        isHTMLBars: true,
        revision: "Ember@1.11.1",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("                        ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("li");
          dom.setAttribute(el1, "class", "pad-s-lr chart-detailpanel-border-right");
          dom.setAttribute(el1, "style", "margin-right: 0;");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks,
              content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(dom.childAt(fragment, [1]), 0, 0);
          content(env, morph0, context, "subMarket");
          return fragment;
        }
      };
    }();
    return {
      isHTMLBars: true,
      revision: "Ember@1.11.1",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "full-height");
        var el2 = dom.createTextNode("\n        ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment(" Watermark ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n        ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "id", "detailPanelChart");
        dom.setAttribute(el2, "class", "layout-container full-height full-width pos-abs");
        dom.setAttribute(el2, "style", "z-index: 0");
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "layout-col h-middle v-middle");
        var el4 = dom.createTextNode("\n                ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        dom.setAttribute(el4, "class", "chart-watermark");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n        ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment(" Chart Body ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n        ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "full-height pad-widget-left pad-widget-right pad-widget-top pad-s-b");
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" Chart Container ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "id", "chartContainer");
        dom.setAttribute(el3, "style", "position: relative");
        var el4 = dom.createTextNode("\n                ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "stx-chart-summary-label Z-index-zero");
        dom.setAttribute(el4, "style", "margin-top: 5px");
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        dom.setAttribute(el5, "class", "layout-container full-width");
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("ul");
        dom.setAttribute(el6, "class", "hu left ltr font-m fade-fore-color");
        dom.setAttribute(el6, "style", "margin-left: 20px; margin-top: 6px; float: left");
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "class", "font-s header-colour");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huDateTime");
        dom.setAttribute(el8, "class", "font-s colour-normal pad-s-l");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        var el9 = dom.createTextNode("O ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huOpen");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        var el9 = dom.createTextNode("H ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huHigh");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        var el9 = dom.createTextNode("L ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huLow");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        var el9 = dom.createTextNode("C ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huClose");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "class", "font-s header-colour");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode(" ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huHigh");
        dom.setAttribute(el8, "class", "font-s colour-normal");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                            ");
        dom.appendChild(el6, el7);
        var el7 = dom.createElement("li");
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "class", "font-s header-colour");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        var el9 = dom.createTextNode(" ");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        var el8 = dom.createElement("span");
        dom.setAttribute(el8, "id", "huHigh");
        dom.setAttribute(el8, "class", "font-s colour-normal");
        dom.setAttribute(el8, "style", "font-weight: bold");
        var el9 = dom.createComment("");
        dom.appendChild(el8, el9);
        dom.appendChild(el7, el8);
        dom.appendChild(el6, el7);
        var el7 = dom.createTextNode("\n                        ");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        var el6 = dom.createTextNode("\n                        ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("div");
        dom.setAttribute(el6, "id", "dynamic-study-view");
        dom.setAttribute(el6, "class", "chart-data-view ltr");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n                    ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n                ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("ul");
        dom.setAttribute(el4, "class", "hu chart-symbol-description-panel ltr font-m");
        dom.setAttribute(el4, "style", "display: none");
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el5, "style", "margin-right: 0;");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el5, "style", "margin-right: 0;");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "pad-s-lr chart-detailpanel-border-right");
        dom.setAttribute(el5, "style", "margin-right: 0;");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "pad-s-lr");
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n                ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("ul");
        dom.setAttribute(el4, "class", "hu left zoom-panel");
        dom.setAttribute(el4, "style", "display: none");
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn h-middle");
        var el6 = dom.createElement("i");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn h-middle");
        var el6 = dom.createElement("i");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                    ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("li");
        dom.setAttribute(el5, "class", "hint--bottom hint--rounded hint--bounce margin-right-zero zoom-panel-btn zoom-in h-middle");
        var el6 = dom.createElement("i");
        dom.setAttribute(el6, "class", "icon-plus-large font-xx-l");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n                ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n            ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n            ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment(" End Chart Container ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n        ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "dpi");
        dom.setAttribute(el1, "style", "height: 1in; width: 1in; left: 100%; position: fixed; top: 100%;");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "chart-styles");
        dom.setAttribute(el1, "style", "display: none");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks,
            content = hooks.content,
            get = hooks.get,
            inline = hooks.inline,
            concat = hooks.concat,
            attribute = hooks.attribute,
            block = hooks.block,
            element = hooks.element;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [7]);
        var element2 = dom.childAt(element1, [7]);
        var element3 = dom.childAt(element2, [1, 1, 1]);
        var element4 = dom.childAt(element3, [1]);
        var element5 = dom.childAt(element3, [11]);
        var element6 = dom.childAt(element3, [13]);
        var element7 = dom.childAt(element2, [3]);
        var element8 = dom.childAt(element2, [5]);
        var element9 = dom.childAt(element8, [1]);
        var element10 = dom.childAt(element9, [0]);
        var element11 = dom.childAt(element8, [3]);
        var element12 = dom.childAt(element11, [0]);
        var element13 = dom.childAt(element8, [5]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [3, 1, 1]), 0, 0);
        var morph1 = dom.createMorphAt(element1, 1, 1);
        var morph2 = dom.createMorphAt(element1, 3, 3);
        var attrMorph0 = dom.createAttrMorph(element2, 'class');
        var morph3 = dom.createMorphAt(dom.childAt(element4, [0]), 0, 0);
        var morph4 = dom.createMorphAt(dom.childAt(element4, [1]), 0, 0);
        var morph5 = dom.createMorphAt(dom.childAt(element3, [3, 1]), 0, 0);
        var morph6 = dom.createMorphAt(dom.childAt(element3, [5, 1]), 0, 0);
        var morph7 = dom.createMorphAt(dom.childAt(element3, [7, 1]), 0, 0);
        var morph8 = dom.createMorphAt(dom.childAt(element3, [9, 1]), 0, 0);
        var morph9 = dom.createMorphAt(dom.childAt(element5, [0]), 0, 0);
        var morph10 = dom.createMorphAt(dom.childAt(element5, [1]), 0, 0);
        var morph11 = dom.createMorphAt(dom.childAt(element6, [0]), 0, 0);
        var morph12 = dom.createMorphAt(dom.childAt(element6, [1]), 0, 0);
        var morph13 = dom.createMorphAt(dom.childAt(element7, [1]), 0, 0);
        var morph14 = dom.createMorphAt(dom.childAt(element7, [3]), 0, 0);
        var morph15 = dom.createMorphAt(element7, 5, 5);
        var morph16 = dom.createMorphAt(dom.childAt(element7, [7]), 0, 0);
        var morph17 = dom.createMorphAt(dom.childAt(element7, [9]), 0, 0);
        var attrMorph1 = dom.createAttrMorph(element9, 'data-hint');
        var attrMorph2 = dom.createAttrMorph(element10, 'class');
        var attrMorph3 = dom.createAttrMorph(element11, 'data-hint');
        var attrMorph4 = dom.createAttrMorph(element12, 'class');
        var attrMorph5 = dom.createAttrMorph(element13, 'data-hint');
        content(env, morph0, context, "symbolObj.dispProp1");
        inline(env, morph1, context, "loading-indicator", [], { "isLoading": get(env, context, "isLoading") });
        inline(env, morph2, context, "single-message-viewer", [], { "message": get(env, context, "app.lang.messages.dataNotAvailable"), "showMessage": get(env, context, "showError"), "messageCss": "appttl-light-bg-fore-color", "backgroundCss": "h-middle pos-abs full-width mgn-l-t pad-l-t" });
        attribute(env, attrMorph0, element2, "class", concat(env, [get(env, context, "chartContainer"), " full-height full-width pos-rel"]));
        content(env, morph3, context, "app.lang.labels.date");
        content(env, morph4, context, "pointDate");
        content(env, morph5, context, "pointOpen");
        content(env, morph6, context, "pointHigh");
        content(env, morph7, context, "pointLow");
        content(env, morph8, context, "pointClose");
        content(env, morph9, context, "app.lang.labels.volume");
        content(env, morph10, context, "pointVolume");
        content(env, morph11, context, "app.lang.labels.turnover");
        content(env, morph12, context, "pointTurnover");
        content(env, morph13, context, "symbolObj.lDes");
        content(env, morph14, context, "symbolObj.exg");
        block(env, morph15, context, "if", [get(env, context, "subMarket")], {}, child0, null);
        content(env, morph16, context, "chartPeriod");
        content(env, morph17, context, "chartDisplayInterval");
        attribute(env, attrMorph1, element9, "data-hint", concat(env, [get(env, context, "app.lang.labels.zoomOut")]));
        element(env, element9, context, "action", ["onCenterZoomOut"], {});
        attribute(env, attrMorph2, element10, "class", concat(env, [get(env, context, "toggleZoomCss"), " icon-minus-center font-xx-l"]));
        attribute(env, attrMorph3, element11, "data-hint", concat(env, [get(env, context, "app.lang.labels.reset")]));
        element(env, element11, context, "action", ["onResetZoom"], {});
        attribute(env, attrMorph4, element12, "class", concat(env, [get(env, context, "toggleZoomCss"), " icon-android-expand font-xx-l"]));
        attribute(env, attrMorph5, element13, "data-hint", concat(env, [get(env, context, "app.lang.labels.zoomIn")]));
        element(env, element13, context, "action", ["onCenterZoomIn"], {});
        return fragment;
      }
    };
  }());
});//# sourceMappingURL=ua-chart.map
