import Ember from 'ember';
import BaseArrayController from '../../base-array-controller';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';

export default BaseArrayController.extend({
    stockArray: Ember.A(),
    indexArrowCssUp: 'glyphicon glyphicon-triangle-top up-fore-color',
    indexArrowCssDown: 'glyphicon glyphicon-triangle-bottom down-fore-color',
    stockObject: {},
    timer: undefined,
    priceService: sharedService.getService('price'),

    countryCodeConstants: {
        du: {
            symbol: 'DFMGI',
            exg: 'DFM',
            divStyle: 'margin-left: 92px; margin-top:-52px; width:90px;',
            lineStyle: 'transform="rotate(-50)"',
            svgStyle: 'height="111" style="width: 100%;"',
            animationDelay: '1.8s'
        },

        sa: {
            symbol: 'TASI',
            exg: 'TDWL',
            divStyle: 'margin-left: -60px; margin-top:-3px; width:72px;',
            lineStyle: 'transform="rotate(0)"',
            svgStyle: 'height="90" width="3" style="margin-right: 9px;"',
            animationDelay: '1s'
        },

        kw: {
            symbol: '11',
            exg: 'KSE',
            divStyle: 'margin-left: 17px; margin-top:-4px; width:65px;',
            lineStyle: 'transform="rotate(-15)"',
            svgStyle: 'height="100" width="80"',
            diStyleInd: '',
            animationDelay: '1.6s'
        },

        lk: {
            symbol: 'ASI',
            exg: 'LKCSE',
            divStyle: 'margin-left: -30px; margin-top:-3px;',
            lineStyle: 'transform="rotate(0)"',
            svgStyle: 'height="20" width="34"',
            animationDelay: '1.1s'
        },

        us: {
            symbol: 'I:NDX',
            exg: 'NSDQ',
            divStyle: 'margin-left: -23px; margin-top:-4px;',
            lineStyle: 'transform="rotate(0)"',
            svgStyle: 'height="20" width="45"',
            animationDelay: '1.2s'
        },

        bd: {
            symbol: 'DSEX',
            exg: 'DSE',
            divStyle: 'margin-left: 50px; margin-top:-60px; width:75px;',
            lineStyle: 'transform="rotate(-73)"',
            svgStyle: 'height="45" style="width: 100%;"',
            animationDelay: '1.3s'
        },

        eg: {
            symbol: 'EGX30',
            exg: 'CASE',
            divStyle: 'margin-left:-65px; margin-top:-4px;',
            lineStyle: 'transform="rotate(0)"',
            svgStyle: 'height="12" width="20"',
            animationDelay: '1.4s'
        },

        gb: {
            symbol: 'I:UKX',
            exg: 'FTSE',
            divStyle: 'margin-left: -30px; margin-top:-3px;',
            lineStyle: 'transform="rotate(0)"',
            svgStyle: 'height="10" width="35"',
            animationDelay: '1.5s'
        },

        ae: {
            symbol: 'ADI',
            exg: 'ADSM',
            divStyle: 'margin-left: 110px; margin-top: -90px;',
            lineStyle: 'transform="rotate(-70)"',
            svgStyle: 'height="110" width="180"',
            animationDelay: '1.7s'
        }
    },

    onPrepareData: function () {
        var that = this;
        this.set('stockObject', {});    // Resetting the stockObject to an empty one on every maximize.

        Ember.$(window).resize(function () {
            Ember.run.schedule('afterRender', that, function () {
                Ember.run.cancel(that.get('timer'));

                that.set('stockObject', {});
                that.updatePins();
            });
        });
    },

    updateCommodities: function (gms) {
        this.priceService.addSymbolRequest(gms.exg, gms.sym, gms.inst);
    },

    onAfterRender: function () {
        this.renderMap();
    },

    setPinUpdateTimer: function () {
        var timer = Ember.run.later(this, this.updatePins, 3000);   // Updating pins every 3 seconds
        this.set('timer', timer);
    },

    showLines: function () {
        var div = Ember.$('#div-label-du'); // Last div being rendered as a pin

        if (div.css('opacity') === '1') {
            var countryMapping = this.get('countryCodeConstants');
            var that = this;

            Ember.$.each(countryMapping, function (key) {
                Ember.$(that._escapeColon('div-pin-' + key)).removeClass('opacity-zero');
                Ember.$(that._escapeColon('line-' + key)).attr('class', 'svg-line');
                Ember.$(that._escapeColon('div-label-' + key)).removeClass('div-zoom-' + key);
            });
        } else {
            Ember.run.later(this, this.showLines, 20);
        }
    },

    updatePins: function () {
        var countryMapping = this.get('countryCodeConstants');
        var indexArrowCssDown = this.get('indexArrowCssDown');
        var indexArrowCssUp = this.get('indexArrowCssUp');
        var stockObject = this.get('stockObject');
        var userExg = this.priceService.userDS.get('userExchg');
        var that = this;

        Ember.$.each(countryMapping, function (key, value) {
            var storedPrice = stockObject[value.symbol];
            var exchange = 'GLOBAL';
            var cssClass = 'pin-back-color-down';
            var noOfDecimals = sharedService.userSettings.displayFormat.decimalPlaces;

            if (userExg.indexOf(value.exg) > -1) {
                exchange = value.exg;
            }

            var stock = this.priceService.stockDS.getStock(exchange, value.symbol);
            Ember.$(that._escapeColon('map-' + key)).html(utils.formatters.formatNumber(stock.ltp, noOfDecimals));
            Ember.$(that._escapeColon('displaySym-' + key)).html(stock.dSym);

            var priceChange = Ember.$(that._escapeColon('map-' + key)).html();
            Ember.set(stockObject, value.symbol, priceChange);

            if (Ember.$(that._escapeColon('b-color-' + key)).hasClass('pin-back-color-up')) {
                cssClass = 'pin-back-color-up';
            }

            if (storedPrice !== priceChange) {
                if (stock.pctChg < 0) {
                    Ember.$(that._escapeColon('arrow-' + key)).attr('class', indexArrowCssDown);
                    Ember.$(that._escapeColon('b-color-' + key)).switchClass(cssClass, 'pin-back-color-down-animate', 30).switchClass('pin-back-color-down-animate', 'pin-back-color-down', 30);
                } else {
                    Ember.$(that._escapeColon('arrow-' + key)).attr('class', indexArrowCssUp);
                    Ember.$(that._escapeColon('b-color-' + key)).switchClass(cssClass, 'pin-back-color-up-animate', 30).switchClass('pin-back-color-up-animate', 'pin-back-color-up', 30);
                }
            }
        });

        that.setPinUpdateTimer();
    },

    renderMap: function () {
        var that = this;
        var pins = {};

        // Declaration of data
        var exchange;
        var countryMapping = this.get('countryCodeConstants');
        var stockArray = this.get('stockArray');
        var indexArrowCssUp = this.get('indexArrowCssUp');
        var userExg = this.priceService.userDS.get('userExchg');

        Ember.$.each(countryMapping, function (key, value) {
            var displayElement = '<div class="map-pin">';
            var divStyle = Ember.$('<style type="text/css">').appendTo('head');
            var divCssClasses = '';

            divStyle.append('</style>');
            displayElement = displayElement + '<div id="div-pin-' + key + '" class="pin-image opacity-zero"></div>';

            Ember.$.each(userExg, function (num, exg) {
                if (exg === value.exg) {
                    exchange = exg;
                } else {
                    exchange = 'GLOBAL';
                }
            });

            var stock = this.priceService.stockDS.getStock(exchange, value.symbol);
            stockArray.pushObject(stock);
            that.updateCommodities(stock);

            divCssClasses = divCssClasses + '.div-zoom-' + key + ' {opacity: 0; -webkit-animation: zoom .1s 1 ' + value.animationDelay + ' ease-in-out; animation: zoom .1s 1 ' + value.animationDelay + ' ease-in-out; -o-animation: zoom .1s 1 ' + value.animationDelay + ' ease-in-out; -moz-animation: zoom .1s 1 ' + value.animationDelay + ' ease-in-out; animation-fill-mode: forwards;} ';
            displayElement = displayElement + '<svg ' + value.svgStyle + '><line id="line-' + key + '" ' + value.lineStyle + ' class="svg-line"></line></svg>';
            displayElement = displayElement + '<div id="div-label-' + key + '" style="' + value.divStyle + '" class="div-zoom-' + key + '">';
            displayElement = displayElement + '<div id="b-color-' + key + '" class="pin-fore-color pin-back-color-up pad-s-lr font-x-l">';
            displayElement = displayElement + '<div class="text-nowrap ltr"><span><i id="arrow-' + key + '" class="' + indexArrowCssUp + '"></i></span>';
            displayElement = displayElement + '<span id="displaySym-' + key + '" class="text-nowrap pad-s-l">' + stock.sym + '</span></div>';
            displayElement = displayElement + '<div id="map-' + key + '" class="world-map-pin-height"></div>';
            displayElement = displayElement + '</div>';
            displayElement = displayElement + '</div>';
            displayElement = displayElement + '</div>';

            divStyle.append(divCssClasses);
            Ember.set(pins, key, displayElement);
        });

        Ember.$('#vmap').vectorMap({
            map: 'world_en',
            enableZoom: true,
            selectedColor: null,
            pins: pins,

            colors: {
                mo: '#C9DFAF',
                fl: '#C9DFAF',
                or: '#C9DFAF'
            }
        });

        this.showLines();
        this.drawLines();
        this.updatePins();
    },

    drawLines: function () {
        var countryMapping = this.get('countryCodeConstants');
        var that = this;

        Ember.$.each(countryMapping, function (key) {
            var divOnePosition = Ember.$(that._escapeColon('div-pin-' + key)).position();
            var divTwoPosition = Ember.$(that._escapeColon('div-label-' + key)).position();
            var svgLine = Ember.$(that._escapeColon('line-' + key));

            svgLine.attr('x1', divOnePosition.left + 2).attr('y1', divOnePosition.top).attr('x2', divTwoPosition.left + 2).attr('y2', divTwoPosition.top).attr('class', 'svg-line, opacity-zero');
        });
    },

    onClearData: function () {
        var stock = this.get('stockArray');
        var that = this;

        Ember.$.each(stock, function (prop, stockObj) {
            that.priceService.removeSymbolRequest(stockObj.exg, stockObj.sym);
        });

        this.set('stockArray', Ember.A());
        this.set('stockObject', {});
    },

    onUnloadWidget: function () {
        Ember.$(window).off('resize');
        Ember.run.cancel(this.get('timer'));
    },

    _escapeColon: function (id) {
        return '#' + id.replace(/(:|,)/g, '\\$1');
    }
});