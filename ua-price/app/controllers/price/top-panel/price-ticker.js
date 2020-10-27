/* global Queue */

import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import PriceConstants from '../../../models/price/price-constants';
import BaseComponent from '../../../components/base-component';
import layout from '../../../templates/price/top-panel/price-ticker';
import ControllerFactory from '../../controller-factory';
import appConfig from '../../../config/app-config';
import utils from '../../../utils/utils';
import userSettings from '../../../config/user-settings';
import appEvents from '../../../app-events';

export default BaseComponent.extend({
    wkey: 'price-ticker',
    exchange: undefined, // User Default exchange reference
    fullMarket: undefined, // ticker setting : to keep full market tickers
    priceService: sharedService.getService('price'),
    tickerSettings: sharedService.userSettings,
    tickerSymDisplayField: sharedService.getService('price').settings.configs.priceTickerConfigs.tickerSymDisplayField,
    tickerChangeDisplayField: sharedService.getService('price').settings.configs.priceTickerConfigs.tickerChangeDisplayField,

    // Ticker related settings
    previousRunTime: undefined,  // last run time
    tickerIndex: 0,      // global variable to keep last used index of ticker list
    noOfItemsToAddToQ: 24, // number of symbols to add to Q in one loop
    numberOfIteration: 0,  // number of iterations
    isInitialTickerItemsAdded: false,

    timeInterval: {
        OneSecondInMillis: 1000,
        OneMinuteInMillis: 60000
    },

    /* *
     * Warning : Change css style according to millisecondsToTransformOneItem
     * Default settings
     * @type {{elementQueueMaxSize: number, numberOfHtmlElementsInTicker: number, itemWidth: number, millisecondsToTransformOneItem: number, millisecondsToWait: number}}
     */
    settings: {
        elementQueueMaxSize: 24,
        itemWidth: 125,
        itemWidthStyle: 'width: 125px', // Added this to remove "Binding style" warning. Update this if itemWidth is changed
        millisecondsToWait: 2500,
        singleTickerWidth: 1500,
        singleTickerItemCount: 12,
        tickerSpeed: '',
        tickerDelay: ''
    },

    elementQueue: undefined,

    // Ticker div 1 related properties
    tickerElementOne: undefined,
    tickerOneItems: Ember.A([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]),
    tickerOneArrayIndex: 0,

    // Ticker div 2 related properties
    tickerElementTwo: undefined,
    tickerTwoItems: Ember.A([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]),
    tickerTwoArrayIndex: 0,

    tickerDivWidth: undefined,
    visibleTicker: 1,
    animationTime: 60, // This should be equal to animation time given in CSS
    animationTimeoutFunction: undefined,
    activeTicker: 1,
    isFirstRound: true,
    addedElementCount: 0,

    isTickerRunning: false, // Play or pause ticker
    isAnimationStarted: false, // To stabilise the animation

    layout: layout,
    isHorizontalTickerAnimation: appConfig.customisation.isHorizontalTickerAnimation,
    isTablet: appConfig.customisation.isTablet,

    willDestroyElement: function () {
        this._clearPriceTicker();
    },

    initializeTicker: function () {
        this._setTickerItemCount();
        this._setTickerExchange();

        this.priceService.addFullMarketSymbolRequest(this.get('exchange.exg'));

        if (appConfig.customisation.isMobile) {
            appEvents.subscribeLanguageChanged(this, this.get('wkey'));
        }
    }.on('init'),

    changeSettings: function () {
        this._setTickerSpeed();
    }.observes('tickerSettings.tickerSpeed'),

    onFullMarketSnapshotReceived: function () {
        this._startPriceTicker();
        this.priceService.unSubscribeFullMarketReceived(this.get('wkey'), this);
    },

    languageChanged: function () {
        this._changeTickerLanguage();
    },

    _setTickerItemCount: function () {
        if (this.isHorizontalTickerAnimation) {
            var itemWidth = this.settings.itemWidth;
            var tickerWidth = Ember.$('#tickerPanel').width();
            var tickerItems = Math.floor(tickerWidth / itemWidth);

            tickerItems = tickerItems > this.settings.singleTickerItemCount ? this.settings.singleTickerItemCount : tickerItems;

            this.set('settings.singleTickerItemCount', tickerItems);
        }

        this.priceService.subscribeFullMarketReceived(this.get('wkey'), this);
    },

    _startPriceTicker: function () {
        this._setTickerExchange();
        this._preparePriceTicker();
    },

    _setTickerExchange: function () {
        if (!this.get('exchange')) {
            var exchange = userSettings.customisation.defaultExchange;
            this.set('exchange', this.priceService.exchangeDS.getExchange(exchange));
        }
    },

    _setTickerSpeed: function () {
        var speed = sharedService.userSettings.tickerSpeed;

        if (speed) {
            var tickerTwoDelay = speed / 2;
            var tickerSpeed = '-webkit-animation: tickerMove ' + speed + 's linear infinite both; -moz-animation: tickerMove ' + speed + 's linear infinite both; animation: tickerMove ' + speed + 's linear infinite both;';
            var tickerDelay = tickerSpeed + '-webkit-animation-delay: -' + tickerTwoDelay + 's !important; -moz-animation-delay: -' + tickerTwoDelay + 's !important; animation-delay: -' + tickerTwoDelay + 's !important;';

            this.set('isSpeedChange', true);
            this.set('settings.tickerSpeed', tickerSpeed);
            this.set('settings.tickerDelay', tickerDelay);
        }
    },

    _preparePriceTicker: function () {
        // get and set full market symbols
        this._setFullMarketSymbols();

        this._initPriceTicker();
        this._initPriceTickerData();
        this._setTickerSpeed();
    },

    _clearPriceTicker: function () {
        var exchange = this.get('exchange');

        if (exchange) {
            this.priceService.removeFullMarketSymbolRequest(exchange.exg);
        }
    },

    /* *
     * Setting full market tickers to local variable
     */
    _setFullMarketSymbols: function () {
        var exchange = this.get('exchange');
        var store = this.priceService.stockDS.get('stockMapByExg');

        if (exchange) {
            var fullMarket = store[exchange.exg];
            this.set('fullMarket', fullMarket);
        }
    },

    /* *
     * Initializing price ticker data
     * Run every 1 minute if market is not open
     * Run every 1 seconds if Market open but no data to show in ticker
     * Run every 30 seconds if required elements are added to Q
     */
    _initPriceTickerData: function () {
        var exchange = this.get('exchange');

        if (exchange) {
            var marketTime = exchange.time;
            var marketStatus = exchange.stat;

            // Initial sleep time
            var sleepTime = this.timeInterval.OneSecondInMillis;
            var that = this;

            if (marketStatus !== PriceConstants.MarketStatus.Open) {
                if (marketStatus === PriceConstants.MarketStatus.PreOpen) {
                    this._clearTicker();
                    this.isInitialTickerItemsAdded = false;
                }

                // If market is not open, no need to check last traded time
                this.set('previousRunTime', undefined);

                if (this.isInitialTickerItemsAdded) {
                    sleepTime = this.timeInterval.OneMinuteInMillis;
                } else {
                    this._addElementsToQ();
                    sleepTime = this.timeInterval.OneSecondInMillis;
                }
            } else {
                this._addElementsToQ();

                // set last run time after running above function
                this.set('previousRunTime', marketTime);

                // run this every 30 seconds
                if (this._getQueueSize() > 0) {
                    sleepTime = this.timeInterval.OneSecondInMillis * 30;
                }
            }

            setTimeout(function () {
                if (!that.get('isDestroyed') || !that.get('isDestroying')) {
                    that._initPriceTickerData();
                }
            }, sleepTime);
        }
    },

    /* *
     * @param initEffectiveElementsCount
     */
    _addElementsToQ: function (initEffectiveElementsCount) {
        var previousRunTime = this.get('previousRunTime');
        var maxNumberOfIterationPerInvoke = 2;
        var effectiveElementsCount = initEffectiveElementsCount || 0;
        var numberOfIterationPerInvoke = this.get('numberOfIteration');

        var fullMarket = this.get('fullMarket');
        var exchange = this.get('exchange');
        var tickerIndex = this.tickerIndex;

        if (fullMarket && exchange) {
            var noOfTickersInList = fullMarket.length;
            var marketStatus = exchange.stat;

            // Add 20 elements in each loop or until complete the full list
            while (noOfTickersInList !== tickerIndex && effectiveElementsCount < this.noOfItemsToAddToQ) {
                var stock = fullMarket[tickerIndex];

                if (stock && utils.AssetTypes.isEquityAssetType(stock.inst)) {
                    // Last traded time of this ticker
                    var ltt = stock.ltt;
                    var isValidStock;

                    if (previousRunTime === undefined) {
                        // This is first time. No need to check last traded time condition
                        // Just add to Q if there are trades
                        isValidStock = stock.trades > 0;
                    } else {
                        isValidStock = (stock.trades > 0 && previousRunTime < ltt);
                    }

                    if (isValidStock) {
                        if (marketStatus !== PriceConstants.MarketStatus.Open) {
                            this.isInitialTickerItemsAdded = true;
                            this._addItemToQueueWhenMarketClosed(stock);
                        } else {
                            this._addItemToQueue(stock);
                        }

                        effectiveElementsCount++;
                    }
                }

                tickerIndex++;
            }

            numberOfIterationPerInvoke++;

            // full list is completed
            if (noOfTickersInList === tickerIndex) {
                // reset tickerIndex
                tickerIndex = 0;
            }

            this.set('tickerIndex', tickerIndex);

            // Iterate through the list from the beginning if there is no 20 elements to add
            // Iterate only twice even though there are no enough elements
            if (effectiveElementsCount < this.noOfItemsToAddToQ && numberOfIterationPerInvoke < maxNumberOfIterationPerInvoke) {
                this.set('numberOfIteration', numberOfIterationPerInvoke);
                this.set('numberOfIteration', numberOfIterationPerInvoke);
                this.set('tickerIndex', 0);
                this._addElementsToQ(effectiveElementsCount);
            }
        }
    },

    /* *
     * Initializing ticker
     */
    _initPriceTicker: function () {
        this._setTickerUI();
        this.elementQueue = new Queue(this.settings.elementQueueMaxSize);
        this._moveTicker();
        this._startCounterTimeout();
    },

    _setTickerUI: function () {
        this.tickerElementOne = Ember.$('#tickerOne');
        this.tickerElementTwo = Ember.$('#tickerTwo');

        if (Ember.$('.tickerDiv').css('width')) {
            this.set('tickerDivWidth', parseInt(Ember.$('.tickerDiv').css('width').split('.')[0], 10));

            Ember.$('.tickerDiv::first-letter').bind('webkitAnimationIteration', this._animationIterationFinished.bind(this));
            Ember.$('.tickerDiv::first-letter').bind('mozAnimationIteration', this._animationIterationFinished.bind(this));
            Ember.$('.tickerDiv::first-letter').bind('animationiteration', this._animationIterationFinished.bind(this));
        }
    },

    /* *
     * Start a timeout to periodically update addedElementCount and pause the ticker if new elements are not added
     */
    _startCounterTimeout: function () {
        var that = this;

        if (this.addedElementCount <= 1) {
            if (this.get('isAnimationStarted')) {
                this.set('isTickerRunning', false);
            }
        } else {
            this.addedElementCount--;
        }

        setTimeout(function () {
            if (!that.get('isDestroyed') || !that.get('isDestroying')) {
                that._startCounterTimeout();
            }
        }, this.settings.millisecondsToWait);
    },

    /* *
     * Callback function for AnimationIteration CSS event to toggle visible ticker property
     */
    _animationIterationFinished: function () {
        if (this.isFirstRound) {
            this.isFirstRound = false;
            this.visibleTicker = 1;
        } else {
            if (this.visibleTicker === 1) {
                this.visibleTicker = 2;
                this.activeTicker = 1;
                this.tickerOneArrayIndex = 0;
            } else {
                this.visibleTicker = 1;
                this.activeTicker = 2;
                this.tickerTwoArrayIndex = 0;
            }
        }
    },

    /* *
     * Add item to queue
     * Removing element before add if queue is already reached the max limit
     * @param itemObject
     */
    _addItemToQueue: function (itemObject) {
        var elementQueueLength = this.elementQueue.getLength();

        if (elementQueueLength >= this.settings.elementQueueMaxSize) {
            this.elementQueue.dequeue();
        }

        // adding element to queue
        this.elementQueue.enqueue(itemObject);
    },

    _addItemToQueueWhenMarketClosed: function (itemObject) {
        this._moveTickerWhenMarketClosed(itemObject);
    },

    /* *
     * @returns size of queue
     */
    _getQueueSize: function () {
        return this.elementQueue.getLength();
    },

    _getIconCssClass: function (value) {
        return value > 0 ? 'glyphicon-triangle-top glyphicon font-m up-fore-color' : 'glyphicon-triangle-bottom glyphicon font-m down-fore-color';
    },

    _getUpDwnCssClass: function (value) {
        return value > 0 ? 'up-fore-color' : value < 0 ? 'down-fore-color' : 'highlight-fore-color';
    },

    /* *
     * This function is to update ticker div which is not visible by updating respective element in th array
     * @param itemObject item object
     */
    _addItemToTicker: function (itemObject) {
        if (this.isFirstRound || this.activeTicker !== this.visibleTicker) {
            if (this.activeTicker === 1) {
                this._addItemToSingleTicker(itemObject, 1);
            } else {
                this._addItemToSingleTicker(itemObject, 2);
            }
        } else {
            this.activeTicker = this.activeTicker === 1 ? 2 : 1;
        }
    },

    _addItemToSingleTicker: function (itemObject, ticker) {
        var item;
        var tickerArrayIndex = ticker === 1 ? this.tickerOneArrayIndex : this.tickerTwoArrayIndex;
        var tickerItems = ticker === 1 ? 'tickerOneItems' : 'tickerTwoItems';

        item = this.get(tickerItems).objectAt(tickerArrayIndex);
        this._fillItem(item, itemObject);

        this.set('isAnimationStarted', true);
        this.set('isTickerRunning', true);

        tickerArrayIndex++;
        this.tickerOneArrayIndex = ticker === 1 ? tickerArrayIndex : this.tickerOneArrayIndex;
        this.tickerTwoArrayIndex = ticker === 2 ? tickerArrayIndex : this.tickerTwoArrayIndex;

        if (tickerArrayIndex === this.settings.singleTickerItemCount) {
            this.tickerOneArrayIndex = ticker === 1 ? 0 : this.tickerOneArrayIndex;
            this.tickerTwoArrayIndex = ticker === 2 ? 0 : this.tickerTwoArrayIndex;
            this.activeTicker = ticker === 1 ? 2 : 1;
        }

        this.addedElementCount++;
    },

    _fillItem: function (item, itemObject) {
        var cssClass = this._getIconCssClass(itemObject.chg);
        var chgCssClass = this._getUpDwnCssClass(itemObject.chg);
        var pctChgCssClass = this._getUpDwnCssClass(itemObject.pctChg);

        var description = itemObject.get(this.tickerSymDisplayField);
        var chg = itemObject.get(this.tickerChangeDisplayField);

        var exchange = itemObject.exg;
        var symbol = itemObject.sym;
        var instrumentType = itemObject.inst;
        var ltp = itemObject.ltp;
        var pctChg = itemObject.pctChg;
        var change, decimalPlaces;

        if (this.tickerChangeDisplayField === 'pctChg' || !utils.validators.isAvailable(itemObject.deci) || itemObject.deci < -1) {
            decimalPlaces = sharedService.userSettings.displayFormat.decimalPlaces;
        } else {
            decimalPlaces = itemObject.deci;
        }

        change = utils.formatters.formatNumber(chg, decimalPlaces);

        if (description && description.length > 6) {
            description = description.substr(0, 6) + '...';
        }

        Ember.set(item, 'des', description);
        Ember.set(item, 'iconClass', cssClass);
        Ember.set(item, 'chgCssClass', chgCssClass);
        Ember.set(item, 'pctChgCssClass', pctChgCssClass);
        Ember.set(item, 'chg', change);
        Ember.set(item, 'sym', symbol);
        Ember.set(item, 'exg', exchange);
        Ember.set(item, 'inst', instrumentType);
        Ember.set(item, 'ltp', ltp);
        Ember.set(item, 'pctChg', pctChg);
    },

    /* *
     *  This function to add items to ticker periodically
     */
    _moveTicker: function () {
        // get item object from elements queue
        var itemObject = this.elementQueue.dequeue();
        var that = this;

        // no need to take any action if object is null or empty
        if (itemObject) {
            this._addItemToTicker(itemObject);
        }

        setTimeout(function () {
            if (!that.get('isDestroyed') || !that.get('isDestroying')) {
                that._moveTicker();
            }
        }, this.settings.millisecondsToWait);
    },

    _moveTickerWhenMarketClosed: function (itemObject) {
        // No need to take any action if object is null or empty
        if (itemObject) {
            this._addItemToTicker(itemObject);
        }
    },

    // TODO: [Sahan] Merge this with _clearPriceTicker after implementing widget level subscription.
    _clearTicker: function () {
        this.set('tickerOneItems', Ember.A([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]));
        this.set('tickerTwoItems', Ember.A([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]));
    },

    _popUpWidget: function (tickerItem) {
        var symbolPopupView = ControllerFactory.createController(this.container, 'view:symbol-popup-view');

        // 0 for detail quote
        symbolPopupView.show(0, tickerItem.sym, tickerItem.exg, tickerItem.inst);
    },

    _changeTickerLanguage: function () {
        var that = this;

        Ember.run.next(this, function () {
            that.set('isAnimationStarted', false);

            that._clearPriceTicker();
            that._clearTicker();

            that.isInitialTickerItemsAdded = false;
            that._preparePriceTicker();
        });
    },

    actions: {
        onPrepareData: function (exchange) {
            this.set('exchange', this.priceService.exchangeDS.getExchange(exchange));

            this._clearTicker();
            this._preparePriceTicker();
        },

        onAddSubscription: function () {

        },

        onClearData: function () {
            this._clearPriceTicker();
        },

        onRemoveSubscription: function () {

        },

        onLanguageChanged: function () {
            this._changeTickerLanguage();
        },

        openPopup: function (tickerItem) {
            if (!appConfig.customisation.isTablet) {
                this._popUpWidget(tickerItem);
            }
        }
    }
});
