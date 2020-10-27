import Ember from 'ember';
import BaseController from '../../base-controller';
import sharedService from '../../../models/shared/shared-service';
import appConfig from '../../../config/app-config';
import d3 from 'd3';
import appEvents from '../../../app-events';

export default BaseController.extend({
    TransitionDuration: 400,
    HeaderHeight: 20,

    // HeatMap dropdown options
    SizeDropDownOptions: {
        MktCap: {
            ID: 0,
            LanguageTag: 'mktCap',
            val: 'mktCap',
            decPlace: 0,
            formatter: 'divideNumber'
        },

        Vol: {
            ID: 2,
            LanguageTag: 'volume',
            val: 'vol',
            decPlace: 0,
            formatter: 'formatNumber'
        },

        Trades: {
            ID: 4,
            LanguageTag: 'trades',
            val: 'trades',
            decPlace: 0,
            formatter: 'formatNumber'
        }
    },

    ColorDropDownOptions: {
        MktCap: {
            ID: 0,
            LanguageTag: 'mktCap',
            val: 'mktCap',
            decPlace: 0,
            formatter: 'divideNumber'
        },

        Vol: {
            ID: 2,
            LanguageTag: 'volume',
            val: 'vol',
            decPlace: 0,
            formatter: 'formatNumber'
        },

        PerChange: {
            ID: 3,
            LanguageTag: 'perChange',
            val: 'pctChg',
            decPlace: 2,
            formatter: 'formatNumber'
        },

        Trades: {
            ID: 4,
            LanguageTag: 'trades',
            val: 'trades',
            decPlace: 0,
            formatter: 'formatNumber'
        }
    },

    heatMapContent: undefined,
    stocks: Ember.A(),
    exchange: undefined,

    treemap: null,
    chartWidth: undefined,
    chartHeight: undefined,
    xScale: undefined,
    yScale: undefined,
    root: undefined,
    node: undefined,
    canvas: undefined,
    maxColorValue: Number.NEGATIVE_INFINITY,
    minColorValue: Number.POSITIVE_INFINITY,
    colorScale: undefined,
    zoomedSector: undefined,

    isContentUpdated: false,
    isHeatMapInitialized: false,
    isUpdating: false,
    isFOSupported: true,
    isSizeColorFieldsSame: false,
    isFocused: true,
    isMobile: appConfig.customisation.isMobile,

    updateTimer: undefined,

    sizeFieldSelection: undefined,
    colorFieldSelection: undefined,
    valueField: undefined,
    colorField: undefined,
    sizeDropdownOptions: Ember.A(),
    colorDropdownOptions: Ember.A(),
    priceService: sharedService.getService('price'),
    isMoreMarketsAvailable: sharedService.getService('price').isMoreMarketsAvailable(),
    currentSubMarketId: undefined,

    isSubMarketsAvailable: function () {
        return this.get('exchange.subMarketArray') && this.get('exchange.subMarketArray').length > 0;
    }.property('exchange.subMarketArray'),

    /* *
     * This will be called by based controller
     */
    onLoadWidget: function () {
        var marketId = sharedService.getService('price').exchangeDS.getDefaultSubMarket(this.get('exg'));

        this._detectFOSupport();

        this.set('sizeFieldSelection', this.SizeDropDownOptions.MktCap);
        this.set('colorFieldSelection', this.ColorDropDownOptions.PerChange);
        this.set('valueField', this.SizeDropDownOptions.MktCap.val);
        this.set('colorField', this.ColorDropDownOptions.PerChange.val);

        this.set('exchange', sharedService.getService('price').exchangeDS.getExchange(this.get('exg')));
        this.set('currentSubMarketId', marketId);
        this.set('chartId', 'heatMapChart-' + this.get('wkey'));

        this._loadSavedLayout();
        this._loadDropDownOptions();

        this.set('isSizeColorFieldsSame', this.get('valueField') === this.get('colorField'));
        this.setErrorMessage();
    },

    onAfterRender: function () {
        if (this.get('treemap') === null) {
            this.setRequestTimeout(3, 'isDataAvailable');
            this._setHeatMapContent();

            if (this.get('isDataAvailable')) {
                try {
                    this._drawHeatMap();
                } catch (e) {
                    this.utils.logger.logError('Error in drawing heatmap [onAfterRender]: ' + e);
                }
            }
        }

        appEvents.subscribeWindowResize(this, this.get('wkey'));
    },

    onResize: function () {
        Ember.$('#' + this.get('chartId')).remove();
        this._drawHeatMap();
    },

    onPrepareData: function () {
        this.set('stocks', this.priceService.stockDS.getSymbolCollectionByExchange(this.get('exg')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['exg:', this.get('exg')].join(''));
    },

    onAddSubscription: function () {
        this.priceService.addFullMarketSymbolRequest(this.get('exg'));
    },

    onClearData: function () {
        this.set('stocks', Ember.A());
        appEvents.unSubscribeWindowResize(this.get('wkey'));
    },

    onRemoveSubscription: function () {
        this.priceService.removeFullMarketSymbolRequest(this.get('exg'));
    },

    onUnloadWidget: function () {
        clearTimeout(this.get('updateTimer'));

        this.set('heatMapContent', undefined);
        this.set('isHeatMapInitialized', false);
        this.set('isDataAvailable', false);
        this.set('canvas', undefined);
        this.set('chartWidth', undefined);
        this.set('chartHeight', undefined);
        this.set('root', undefined);
        this.set('node', undefined);
        this.set('treemap', undefined);
    },

    onLanguageChanged: function () {
        var that = this;
        this._loadDropDownOptions();
        this._saveLayout();
        this.setErrorMessage();

        Ember.run.later(function () {
            that._updateHeatMap();
        }, 100);

    },

    onCheckDataAvailability: function () {
        return this.get('isDataAvailable');
    },

    onVisibilityChanged: function (isHidden) {
        if (isHidden) {
            this.set('isFocused', false);
            clearTimeout(this.get('updateTimer'));
        } else {
            this.set('isFocused', true);
            this.set('isUpdating', false);
            this._updateHeatMap();
        }
    },

    loadSubMarketContent: function (subMkt) {
        var exchange = this.get('exg');

        this.set('stocks', this.priceService.stockDS.getStockCollectionBySubMarket(exchange, subMkt));
        this._updateHeatMap();
    },

    _changeCriteria: function () {
        this.set('isSizeColorFieldsSame', this.get('valueField') === this.get('colorField'));
        this._saveLayout();
        this._updateHeatMap();
    },

    checkUpdates: function () {
        if (!this.get('isUpdating') && this.get('isFocused')) {
            this.set('isUpdating', true);
            var that = this;

            var timer = setTimeout(function () {
                that._updateHeatMap();
                that.set('isUpdating', false);
            }, 3000);

            this.set('updateTimer', timer);
        }
        // TODO: [satheeqh] change observes to Ember observer dynamically when size representation changes
    }.observes('stocks.@each.trades', 'stocks.@each.mktcap'),

    _loadDropDownOptions: function () {
        var sizeArrOptions = Ember.A();
        var colorArrOptions = Ember.A();
        var that = this;
        var option = null;

        Ember.$.each(this.SizeDropDownOptions, function (key) {
            option = that.SizeDropDownOptions[key];
            Ember.set(option, 'DisplayName', that.get('app').lang.labels[option.LanguageTag]);
            sizeArrOptions.push(option);
        });

        Ember.$.each(this.ColorDropDownOptions, function (key) {
            option = that.ColorDropDownOptions[key];
            Ember.set(option, 'DisplayName', that.get('app').lang.labels[option.LanguageTag]);
            colorArrOptions.push(option);
        });

        Ember.set(this.get('sizeFieldSelection'), 'DisplayName', this.get('app').lang.labels[this.get('sizeFieldSelection').LanguageTag]);
        Ember.set(this.get('colorFieldSelection'), 'DisplayName', this.get('app').lang.labels[this.get('colorFieldSelection').LanguageTag]);
        this.set('sizeDropdownOptions', sizeArrOptions);
        this.set('colorDropdownOptions', colorArrOptions);
    },

    _setHeatMapContent: function () {
        var that = this;
        var stockds = this.get('stocks');
        this.set('isDataAvailable', false);
        this.set('maxColorValue', Number.NEGATIVE_INFINITY);
        this.set('minColorValue', Number.POSITIVE_INFINITY);

        var _addSymData = function (list, obj) {
            if (obj.get(that.get('colorField')) > that.get('maxColorValue')) {
                that.set('maxColorValue', obj.get(that.get('colorField')));
            } else if (obj.get(that.get('colorField')) < that.get('minColorValue')) {
                that.set('minColorValue', obj.get(that.get('colorField')));
            }

            list.get('children').push(obj);
        };

        var sectorList = [];
        var parentItem = this.get('heatMapContent');
        var exg = this.get('exg');
        var des = this.priceService.exchangeDS.getExchange(exg).get('des');

        if (parentItem === undefined) {
            parentItem = Ember.Object.create({
                sym: exg,
                sDes: des,
                children: []
            });
        } else {
            parentItem.sym = exg;
            parentItem.sDes = des;
            parentItem.children = [];
        }

        this.set('zoomedSector', exg);

        Ember.$.each(stockds, function (id, stock) {
            // Check whether symbol mapped to a sector
            var secId = stock.get('sec');

            if (secId && stock.get(that.valueField) > 0) {
                if (!that.get('isDataAvailable')) {
                    that.set('isDataAvailable', true);
                    that.hideDataErrorMessage();
                    Ember.$('#treemap_container').show();
                }

                if (secId in sectorList) {
                    _addSymData(sectorList[secId], stock);
                } else {
                    var newSec = Ember.Object.create({
                        sym: secId,
                        sDes: sharedService.getService('price').sectorDS.getSector(exg, secId).get('des'),
                        children: []
                    });

                    _addSymData(newSec, stock);
                    sectorList[secId] = newSec;
                    parentItem.get('children').push(newSec);
                }
            }
        });

        this.set('heatMapContent', parentItem);
        sectorList = [];
        var color = d3.scale.linear()
            .range(['#f9a825', '#2ba25c'])
            .domain([this.get('minColorValue'), this.get('maxColorValue')]);

        if (this.get('minColorValue') < 0) {
            color = d3.scale.linear()
                .domain([this.get('minColorValue'), 0, this.get('maxColorValue')])
                .range(['#c43b2d', '#f9a825', '#2ba25c']);
        }
        this.set('colorScale', color);
    },

    /* *
     * Update heatmap based on trigger.
     * If it triggered once, waits until timer finises its job.
     */
    _updateHeatMap: function () {
        this._setHeatMapContent();

        if (!this.get('isDataAvailable')) {
            this.showDataErrorMessage();
            Ember.$('#treemap_container').hide();
        } else if (this.get('isHeatMapInitialized')) {
            this._updateTree();
        } else if (this.get('isDataAvailable')) {
            try {
                this._drawHeatMap();
            } catch (e) {
                this.utils.logger.logError('Error in drawing heatmap [_updateHeatMap]: ' + e);
            }
        }
    },

    _updateTree: function () {
        var that = this;
        var content = this.get('heatMapContent');
        that.set('root', content);

        var treemapV = this.get('treemap')
            .round(true)
            .mode('squarify')
            .ratio(this.get('chartHeight') / this.get('chartWidth') * 0.5 * (1 + Math.sqrt(5)))
            .sort(function (a, b) {
                return a.value - b.value;
            })
            .size([this.get('chartWidth'), this.get('chartHeight')])
            .sticky(true)
            .value(function (d) {
                return d.get(that.get('valueField'));
            });

        var newNodes = treemapV.nodes(content);
        this.set('treemap', treemapV);

        var children = newNodes.filter(function (d) {
            return !d.children;
        });
        var parents = newNodes.filter(function (d) {
            return d.children;
        });

        // Fix to stop aggregating other sector rectangles into zoomed area.
        // This filter used to update the zoomed node with newly generated node.
        var zoomedNode = newNodes.filter(function (d) {
            return d.get('sym') === that.get('zoomedSector');
        });

        var can = this.get('canvas');
        // Re-crate parent & children cells
        var pCells = can.selectAll('g.cell.parent')
            .data(parents, function (d) {
                return 'p-' + d.get('sym');
            });
        var childCells = can.selectAll('g.cell.child')
            .data(children, function (d) {
                return 'c-' + d.get('sym');
            });

        this.set('node', zoomedNode[0]);

        this._updateTransitions(pCells, childCells);
        this._zoom(this.get('node'));
    },

    _drawHeatMap: function () {
        var that = this;
        var width = Ember.$('#treemap_container').width() - 5;
        var height = Ember.$('#treemap_container').height() - 20;
        this.set('chartWidth', width);
        this.set('chartHeight', height);

        var scaleX = d3.scale.linear().range([0, this.get('chartWidth')]);
        var scaleY = d3.scale.linear().range([0, this.get('chartHeight')]);
        this.set('xScale', scaleX);
        this.set('yScale', scaleY);

        var content = this.get('heatMapContent');

        var treemapLayout = d3.layout.treemap()
            .round(true)
            .mode('squarify')
            .ratio(this.get('chartHeight') / this.get('chartWidth') * 0.5 * (1 + Math.sqrt(5)))
            .sort(function (a, b) {
                return a.value - b.value;
            })
            .size([this.get('chartWidth'), this.get('chartHeight')])
            .sticky(true)
            .value(function (d) {
                return d.get(that.valueField);
            });

        var canvas = d3.select('#treemap_container').append('svg:svg')
            .attr('id', this.get('chartId'))
            .attr('width', this.get('chartWidth'))
            .attr('height', this.get('chartHeight'))
            .append('svg:g');

        this.set('canvas', canvas);

        var localNode;
        var root;
        localNode = root = content;
        var newNodes = treemapLayout.nodes(root);

        this.set('treemap', treemapLayout);
        this.set('node', localNode);
        this.set('root', root);

        var children = newNodes.filter(function (d) {
            return !d.children;
        });
        var parents = newNodes.filter(function (d) {
            return d.children;
        });

        // Create parent cells
        var pCells = canvas.selectAll('g.cell.parent')
            .data(parents, function (d) {
                return 'p-' + d.get('sym');
            });

        // Create children cells
        var childCells = canvas.selectAll('g.cell.child')
            .data(children, function (d) {
                return 'c-' + d.get('sym');
            });

        this._updateTransitions(pCells, childCells);
        this._zoom(this.get('node'));

        this.set('isHeatMapInitialized', true);
    },

    _updateTransitions: function (parentCells, childCells) {
        var that = this;
        var mapParents = parentCells;
        var mapChildren = childCells;

        var parentEnterTransition = mapParents.enter()
            .append('g')
            .attr('class', 'cell parent')
            .on('click', function (d) {
                that._zoom(d);
            });
        parentEnterTransition.append('rect')
            .attr('class', 'parent-rect');

        if (this.get('isFOSupported')) {
            parentEnterTransition.append('foreignObject')
                .attr('class', 'parent')
                .append('xhtml:div')
                .attr('class', 'div-parent')
                .append('span')
                .attr('class', 'label-parent colour-normal');
        } else {
            parentEnterTransition.append('text')
                .attr('class', 'label-ie-parent colour-normal');
        }

        // Update transition
        var parentUpdateTransition = mapParents.transition().duration(this.TransitionDuration);
        parentUpdateTransition.select('.cell')
            .attr('transform', function (d) {
                return 'translate(' + d.dx + ',' + d.y + ')';
            });
        parentUpdateTransition.select('rect')
            .attr('width', function (d) {
                return Math.max(0.01, d.dx);
            })
            .attr('height', this.HeaderHeight);

        if (this.get('isFOSupported')) {
            parentUpdateTransition.select('foreignObject')
                .attr('width', function (d) {
                    return d.dx;
                })
                .attr('height', this.HeaderHeight)
                .select('.div-parent .label-parent')
                .text(function (d) {
                    return d.get('sDes');
                });
        } else {
            parentUpdateTransition.select('.label-ie-parent')
                .attr('x', function (d) {
                    return d.dx / 2;
                })
                .attr('y', this.HeaderHeight / 2)
                .attr('dy', '.35em')
                .text(function (d) {
                    return d.get('sDes');
                });
        }

        // Exit transition
        mapParents.exit().remove();

        var childEnterTransition = mapChildren.enter()
            .append('g')
            .attr('class', 'cell child')
            .on('click', function (d) {
                Ember.$('#id-heatmap-popover').popover('hide');
                d3.select(this).attr('id', null)
                    .attr('data-original-title', null)
                    .attr('data-content', null)
                    .attr('title', null)
                    .style('stroke-width', null);

                that._zoom(that.get('node').get('sym') === d.parent.get('sym') ? that.get('root') : d.parent);
            })
            .on('mouseover', function () {
                if (!that.isMobile) {
                    d3.select(this).style('stroke-width', '3px');
                    d3.select(this).attr('id', 'id-heatmap-popover')
                        .attr('data-original-title', function (d) {
                            return '<strong class="symbol-fore-color ltr">' + d.get('dispProp1') + '</strong> <br/> <span class="font-m bold fore-color">' + d.get('sDes') + '</span>';
                        })

                        .attr('data-content', function (d) {
                            var formattedChg = that._formatNumber('formatNumber', d.get('chg'), d.get('deci'));
                            var formattedPerChg = that._formatNumber('formatNumber', d.get('pctChg'), 2);
                            var chgFontCss = formattedChg > 0 ? 'up-fore-color' : formattedChg < 0 ? 'down-fore-color' : '';
                            var perChgFontCss = formattedPerChg > 0 ? 'up-fore-color' : formattedPerChg < 0 ? 'down-fore-color' : '';

                            return ['<table class="table font-m fore-color"><tbody>',
                                '<tr><td>', that.get('app').lang.labels.lastTrade, '</td><td class="h-right">', that._formatNumber('formatNumber', d.get('ltp'), d.get('deci')), '</td></tr>',
                                '<tr><td>', that.get('app').lang.labels.trades, '</td><td class="h-right">', that._formatNumber('formatNumber', d.get('trades'), 0), '</td></tr>',
                                '<tr><td>', that.get('app').lang.labels.volume, '</td><td class="h-right">', that._formatNumber('formatNumber', d.get('vol'), 0), '</td></tr>',
                                '<tr><td>', that.get('app').lang.labels.turnover, '</td><td class="h-right">', that._formatNumber('formatNumber', d.get('tovr'), 0), '</td></tr>',
                                '<tr><td>', that.get('app').lang.labels.change, '</td><td><div class="h-right ', chgFontCss, '">', formattedChg, '</div></td></tr>',
                                '<tr><td>', that.get('app').lang.labels.perChange, '</td><td><div class="h-right ', perChgFontCss, '">', formattedPerChg, '</div></div></td></tr>',
                                '</tbody></table>'].join('');
                        })
                        .style('stroke-width', '3px');

                    Ember.$('#id-heatmap-popover').popover({
                        'trigger': 'hover',
                        'container': 'div#treemap_container',
                        'placement': 'auto',
                        'html': true,
                        /*  'delay': {
                         show: 2000,
                         hide: 0
                         },*/
                        'animation': false
                    });

                    Ember.$('#id-heatmap-popover').popover('show');
                    var ev = d3.event;
                    var offset = Ember.$('#treemap_container').offset();
                    var x = ev.pageX - offset.left + 25;
                    var y = ev.pageY - offset.top + 25;
                    var popoverWidth = Ember.$('.popover').width();
                    var popoverHeight = Ember.$('.popover').height();
                    if (x + popoverWidth > that.get('chartWidth')) {
                        x -= popoverWidth + 50;
                    }
                    if (y + popoverHeight > that.get('chartHeight')) {
                        y -= popoverHeight + 25;
                    }
                    Ember.$('.popover').css('top', y + 'px').css('left', x + 'px').css('direction', 'ltr');
                }
            })
            .on('mousemove', function () {
                var ev = d3.event;
                var offset = Ember.$('#treemap_container').offset();
                var x = ev.pageX - offset.left + 25;
                var y = ev.pageY - offset.top + 25;
                var popoverWidth = Ember.$('.popover').width();
                var popoverHeight = Ember.$('.popover').height();
                if (x + popoverWidth > that.get('chartWidth')) {
                    x -= popoverWidth + 50;
                }
                if (y + popoverHeight > that.get('chartHeight')) {
                    y -= popoverHeight + 25;
                }
                Ember.$('.popover').css('top', y + 'px').css('left', x + 'px').css('direction', 'ltr');

            })
            .on('mouseout', function () {
                Ember.$('id-heatmap-popover').popover('destroy');
                d3.select(this).attr('id', null)
                    .attr('data-original-title', null)
                    .attr('data-content', null)
                    .attr('title', null)
                    .style('stroke-width', null);
            });

        childEnterTransition.append('rect')
            .classed('background', true)
            .attr('class', 'child-rect')
            .style('fill', function (d) {
                return that._getColor(d.get('colorField'));
            });

        if (this.get('isFOSupported')) {
            childEnterTransition.append('foreignObject')
                .attr('class', 'child')
                .append('xhtml:div')
                .attr('class', 'div-child ltr')
                .append('span')
                .attr('class', 'label-child');
        } else {
            childEnterTransition.append('text')
                .attr('class', 'label-ie-l1');
            childEnterTransition.append('text')
                .attr('class', 'label-ie-l2');
            childEnterTransition.append('text')
                .attr('class', 'label-ie-l3');
            childEnterTransition.append('text')
                .attr('class', 'label-ie-l4');
        }

        // Update transition
        var childUpdateTransition = mapChildren.transition().duration(this.TransitionDuration);
        childUpdateTransition.select('.cell')
            .attr('transform', function (d) {
                return 'translate(' + d.x + ',' + d.y + ')';
            });
        childUpdateTransition.select('rect')
            .attr('width', function (d) {
                return Math.max(0.01, d.dx);
            })
            .attr('height', function (d) {
                return Math.max(0.01, d.dy);
            })
            .style('fill', function (d) {
                return that._getColor(d.get(that.colorField));
            });

        mapChildren.exit().remove();
    },

    // Zoom function
    _zoom: function (d) {
        var that = this;
        this.get('treemap').padding([this.HeaderHeight / (this.get('chartHeight') / d.dy), 0, 0, 0])
            .nodes(d);

        // Moving the next two lines above treemap layout messes up padding of zoom result
        var kx = this.get('chartWidth') / d.dx;
        var ky = this.get('chartHeight') / d.dy;
        var isRoot = d.get('sym') === this.get('root').get('sym');
        this.get('xScale').domain([d.x, d.x + d.dx]);
        this.get('yScale').domain([d.y, d.y + d.dy]);

        var zoomTransition = this.get('canvas').selectAll('g.cell').transition().duration(this.TransitionDuration)
            .attr('transform', function (cell) {
                return 'translate(' + that.xScale(cell.x) + ',' + that.yScale(cell.y) + ')';
            });

        // Update the width/height of the rects
        zoomTransition.select('.parent-rect')
            .attr('width', function (parent) {
                return Math.max(0.01, kx * parent.dx);
            })
            .attr('height', this.HeaderHeight);

        zoomTransition.select('.child-rect')
            .attr('width', function (childWidth) {
                return Math.max(0.01, kx * childWidth.dx);
            })
            .attr('height', function (childHeight) {
                return ky * childHeight.dy;
            })
            .style('fill', function (childFill) {
                return that._getColor(childFill.get(that.colorField));
            });
        zoomTransition.select('foreignObject')
            .attr('width', function (fo) {
                return kx * fo.dx;
            })
            .attr('height', this.HeaderHeight);

        zoomTransition.select('.child')
            .attr('height', function (child) {
                return ky * child.dy;
            });

        if (this.get('isFOSupported')) {
            this.get('canvas').selectAll('.label-child')
                .style('font-size', function (canvasFont) {
                    return that._calFontSize(canvasFont.dy * ky, canvasFont.dx * kx);
                })
                .html(function (canvasHtml) {
                    if (isRoot) {
                        return that._generateLabel(canvasHtml, false, canvasHtml.dx, canvasHtml.dy);
                    } else {
                        return that._generateLabel(canvasHtml, true, canvasHtml.dx * kx, canvasHtml.dy * ky);
                    }
                });
        } else {
            zoomTransition.select('.label-ie-l1')
                .attr('x', function (ie11x) {
                    return kx * ie11x.dx / 2;
                })
                .attr('y', function (ie11y) {
                    return ky * ie11y.dy / 2;
                })
                .attr('dy', function (ie11dy) {
                    if (ie11dy.dy * ky > 35 && ie11dy.dx * kx > 110) {
                        return '-1em';
                    }
                    return '0.35em';
                })
                .style('font-size', function (ie11Font) {
                    return that._calFontSize(ie11Font.dy * ky, ie11Font.dx * kx);
                })
                .text(function (ie11Text) {
                    return that._generateLabelIE(ie11Text, 1, ie11Text.dx * kx, ie11Text.dy * ky);
                });

            zoomTransition.select('.label-ie-l2')
                .attr('x', function (ie12x) {
                    return kx * ie12x.dx / 2;
                })
                .attr('y', function (ie12y) {
                    return ky * ie12y.dy / 2;
                })
                .style('font-size', function (ie12Font) {
                    return that._calFontSize(ie12Font.dy * ky, ie12Font.dx * kx);
                })
                .text(function (ie12Text) {
                    return that._generateLabelIE(ie12Text, 2, ie12Text.dx * kx, ie12Text.dy * ky);
                });

            zoomTransition.select('.label-ie-l3')
                .attr('x', function (ie13x) {
                    return kx * ie13x.dx / 2;
                })
                .attr('y', function (ie13y) {
                    return ky * ie13y.dy / 2;
                })
                .attr('dy', function () {
                    return '1.2em';
                })
                .text(function (ie13Text) {
                    return that._generateLabelIE(ie13Text, 3, ie13Text.dx * kx, ie13Text.dy * ky);
                });

            zoomTransition.select('.label-ie-l4')
                .attr('x', function (ie14x) {
                    return kx * ie14x.dx / 2;
                })
                .attr('y', function (ie14y) {
                    return ky * ie14y.dy / 2;
                })
                .attr('dy', function () {
                    return '2.35em';
                })
                .text(function (ie14Text) {
                    return that._generateLabelIE(ie14Text, 4, ie14Text.dx * kx, ie14Text.dy * ky);
                });

            zoomTransition.select('.label-ie-parent')
                .attr('x', function (ieParentx) {
                    return kx * ieParentx.dx / 2 - 2;
                })
                .attr('y', this.HeaderHeight / 2)
                .attr('dy', '.35em')
                .text(function (ieParentText) {
                    return that._generateLabelIE(ieParentText, 0, ieParentText.dx * kx, ieParentText.dy);
                });
        }

        this.set('node', d);
        this.set('zoomedSector', d.get('sym'));

        // Updating popover content
        if (!this.isMobile) {
            this.get('canvas').selectAll('#id-heatmap-popover')
                .attr('data-original-title', function (dataTitle) {
                    return '<strong class="symbol-fore-color ltr">' + dataTitle.get('dispProp1') + '</strong> <br/> <i class="font-m bold fore-color">' + dataTitle.get('sDes') + '</i>';
                })
                .attr('data-content', function (dataContent) {
                    var formattedChg = that._formatNumber('formatNumber', dataContent.get('chg'), 2);
                    var formattedPerChg = that._formatNumber('formatNumber', dataContent.get('pctChg'), 2);
                    var chgFontCss = formattedChg > 0 ? 'up-fore-color' : formattedChg < 0 ? 'down-fore-color' : '';
                    var perChgFontCss = formattedPerChg > 0 ? 'up-fore-color' : formattedPerChg < 0 ? 'down-fore-color' : '';

                    return ['<table class="table font-m fore-color"><tbody>',
                        '<tr><td>', that.get('app').lang.labels.lastTrade, '</td><td class="h-right">', that._formatNumber('formatNumber', dataContent.get('ltp'), 2), '</td></tr>',
                        '<tr><td>', that.get('app').lang.labels.trades, '</td><td class="h-right">', that._formatNumber('formatNumber', dataContent.get('trades'), 0), '</td></tr>',
                        '<tr><td>', that.get('app').lang.labels.volume, '</td><td class="h-right">', that._formatNumber('formatNumber', dataContent.get('vol'), 0), '</td></tr>',
                        '<tr><td>', that.get('app').lang.labels.turnover, '</td><td class="h-right">', that._formatNumber('formatNumber', dataContent.get('tovr'), 0), '</td></tr>',
                        '<tr><td>', that.get('app').lang.labels.change, '</td><td><div class="h-right ', chgFontCss, '">', formattedChg, '</div></td></tr>',
                        '<tr><td>', that.get('app').lang.labels.perChange, '</td><td><div class="h-right ', perChgFontCss, '">', formattedPerChg, '</div></div></td></tr>',
                        '</tbody></table>'].join('');
                });
        }

        var popover = Ember.$('#id-heatmap-popover').data('bs.popover');

        if (popover) {
            popover.setContent();
            popover.$tip.addClass(popover.options.placement);
        }

        if (d3.event) {
            d3.event.stopPropagation();
        }
    },

    _generateLabel: function (d, isZoomed, width, height) {
        var txt = d.get('dispProp1');
        var tLen = txt.length + 28;

        if (height > 80 && width > 90) {
            txt += '<br>' + d.get('sDes') + '<br><div class="label-child-info">' + this.get('sizeFieldSelection').DisplayName +
                ': ' + this._formatNumber(this.get('sizeFieldSelection').formatter, d.get(this.get('valueField')), this.get('sizeFieldSelection').decPlace);

            if (!this.get('isSizeColorFieldsSame')) {
                txt += '<br>' + this.get('colorFieldSelection').DisplayName +
                    ': ' + this._formatNumber(this.get('colorFieldSelection').formatter, d.get(this.get('colorField')), this.get('colorFieldSelection').decPlace);
            }
            txt += '</div>';
            return txt;
        } else if (height > 50 && width > 75) {
            txt += '<br>' + d.get('sDes');
            return txt;
        } else if (isZoomed && height > 30 && width > 40) {
            return txt;
        } else if (height < 20 || width < tLen) {
            return '';
        }
        return txt;
    },

    _generateLabelIE: function (d, level, width, height) {
        switch (level) {
            case 0:
                if (width > 30) {
                    return d.get('sDes').substring(0, width - 30);
                }
                break;
            case 1:
                if (height > 20 && width > 30) {
                    return d.get('dispProp1');
                }
                break;
            case 2:
                if (height > 35 && width > 110) {
                    return d.get('sDes').substring(0, width - 20);
                }
                break;
            case 3:
                if (height > 42 && width > 110) {
                    return this.get('sizeFieldSelection').DisplayName +
                        ': ' + this._formatNumber(this.get('sizeFieldSelection').formatter, d.get(this.get('valueField')), this.get('sizeFieldSelection').decPlace);
                }
                break;
            case 4:
                if (!this.get('isSizeColorFieldsSame') && height > 55 && width > 110) {
                    return this.get('colorFieldSelection').DisplayName +
                        ': ' + this._formatNumber(this.get('colorFieldSelection').formatter, d.get(this.get('colorField')), this.get('colorFieldSelection').decPlace);
                }
                break;
        }

        return '';
    },

    _formatNumber: function (formatter, value, decimalPlace) {
        if (formatter === 'formatNumber') {
            return this.utils.formatters.formatNumber(value, decimalPlace);
        } else if (formatter === 'divideNumber') {
            return this.utils.formatters.divideNumber(value, decimalPlace);
        }

        return value;
    },
    _calFontSize: function (height, width) {
        if (height > 450 && width > 450) {
            return '30px';
        } else if (height > 300 && width > 300) {
            return '25px';
        } else if (height > 150 && width > 150) {
            return '19px';
        } else if (height > 50 && width > 50) {
            return '13px';
        }
        return '11px';
    },

    _getColor: function (value) {
        return this.colorScale(value);
    },

    _detectFOSupport: function () {
        try {
            var browser = this.utils.browser.getBrowserInfo();

            if (browser.name === 'MSIE' || browser.name === 'Edge' || (browser.name === 'Safari' && browser.version === '8')) {
                this.set('isFOSupported', false);
            }
        } catch (e) {
            this.utils.logger.logError('Error in detecting browser info]: ' + e);
        }

    },

    _loadSavedLayout: function () {
        var prevLayout = this.get('heatMapLayout');

        if (prevLayout) {
            this.set('sizeFieldSelection', prevLayout.sizeFieldSelect);
            this.set('colorFieldSelection', prevLayout.colorFieldSelect);
            this.set('valueField', prevLayout.valueField);
            this.set('colorField', prevLayout.colorField);
        }
    },

    // Save the current selections.
    _saveLayout: function () {
        var layout = {
            sizeFieldSelect: this.get('sizeFieldSelection'),
            colorFieldSelect: this.get('colorFieldSelection'),
            valueField: this.get('valueField'),
            colorField: this.get('colorField')
        };

        this.saveWidget({heatMapLayout: layout});
    },

    actions: {
        setSizeField: function (option) {
            this.set('sizeFieldSelection', option);
            this.set('valueField', option.val);
            this._changeCriteria();
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['size:', option.val].join(''));
        },

        setColorField: function (option) {
            this.set('colorFieldSelection', option);
            this.set('colorField', option.val);
            this._changeCriteria();
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['color:', option.val].join(''));
        },

        setExchange: function (exchg) {
            var exchangeArgs = {exg: exchg.code};
            this.priceService.exchangeDS.getExchangeMetadata(exchg.code);

            this.set('exchange', this.priceService.exchangeDS.getExchange(exchg.code));
            this.saveWidget(exchangeArgs);
            this.refreshWidget(exchangeArgs);
        },

        setSubMarket: function (mktId) {
            this.loadSubMarketContent(mktId);
        },

        onClickColor: function () {
            Ember.appGlobal.activeWidget = 'colorDropdown' + this.get('wkey');
        },

        onClickSize: function () {
            Ember.appGlobal.activeWidget = 'sizeDropdown' + this.get('wkey');
        }
    }
});