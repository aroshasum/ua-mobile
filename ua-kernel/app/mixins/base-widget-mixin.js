import Ember from 'ember';
import LanguageDataStore from '../models/shared/language/language-data-store';
import appEvents from '../app-events';
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default Ember.Mixin.create({
    app: LanguageDataStore.getLanguageObj(),
    widgetContainer: undefined,
    storedArgs: {},

    // Full Screen parameters
    previousParent: null,
    previousWatchListStyleAttribute: null,
    previousFullScreenContainerStyleAttribute: null,
    isFullScreenMode: false,

    // Parameters for loading indicator and error message
    showError: false,
    errorMessage: '',
    isLoading: false,
    isObserving: false,
    observableProperty: '',
    isDataAvailable: false,

    // Link Parameters
    links: [{code: 0, desc: '', name: 'Remove'}, {code: 1, desc: 'link-1', name: 'Yellow'}, {code: 2, desc: 'link-2', name: 'Blue'}, {code: 3, desc: 'link-3', name: 'Pink'}, {code: 4, desc: 'link-4', name: 'Green'}],
    defaultLink: {code: 0, desc: ''},
    selectedLink: 0,

    menuComponent: null, // Context menu
    isAllowedToActive: true,

    setArgs: function (args) {
        if (args) {
            var that = this;

            Ember.$.each(args, function (prop, val) {
                that.set(prop, val);
            });
        }
    },

    saveWidget: function (widgetArgs, isGlobalSave) {
        var widgetArgsKey = this.get('widgetArgsKey');

        try {
            this.storedArgs = Ember.$.extend({}, this.storedArgs, widgetArgs);

            if (this.widgetContainer) {
                if (isGlobalSave) {
                    this.widgetContainer.saveGlobalWidgetArgs(widgetArgs, widgetArgsKey);
                } else {
                    this.widgetContainer.saveWidgetArgs(this.get('wid'), this.get('bid'), this.storedArgs);
                }
            }
        } catch (e) {
            utils.logger.logError(e);
        }
    },

    initializeWidget: function (widgetDef, args, widgetContainer, menuContent, tabContent) {
        try {
            if (!widgetDef.loadFromCache) {
                if (args) {
                    this.storedArgs = args.storedArgs;
                    this.menuContent = menuContent;
                    this.tabContent = tabContent;
                    this.setArgs(args.widgetArgs);

                    if (widgetContainer) {
                        this.widgetContainer = widgetContainer;
                        var wKeyComps = [menuContent.id, tabContent.id, widgetDef.id];

                        if (args.widgetArgs && args.widgetArgs.innerWidgets) {
                            var innerId = args.widgetArgs.innerWidgets.wDef.id;

                            this.set('bid', innerId);
                            wKeyComps[wKeyComps.length] = innerId;
                        }

                        this.set('wid', widgetDef.id);
                        this.set('wkey', wKeyComps.join('-'));
                    }
                }

                if (widgetContainer) {
                    this.set('gaKey', [menuContent.title, tabContent.outlet.split('.').pop(), widgetDef.wn.split('.').pop()].join(':'));
                } else {
                    this.set('gaKey', widgetDef.wn.split('.').pop());
                }

                this.loadWidget();

                Ember.run.schedule('afterRender', this, this.afterRender, widgetDef.cacheInBackground);
            }
        } catch (e) {
            utils.logger.logError(e);
        }
    },

    loadWidget: function () {
        this.onLoadWidget();
    },

    prepareData: function () {
        this.onPrepareData();
    },

    addSubscription: function () {
        this.onAddSubscription();
    },

    fullScreenToggleTitle: function () {
        return this.setFullScreenToggleTitle();
    }.property(),

    refreshWidget: function (args) {
        try {
            // TODO: [Bashitha] Handle cache widgets, cannot call remove & add subscription
            // Clear existing
            this.onRemoveSubscription();
            this.onClearData();

            // Set new arguments
            this.setArgs(args);

            // Add new
            this.prepareData();
            this.onBindData();
            this.addSubscription();
        } catch (e) {
            utils.logger.logError(e);
        }
    },

    closeWidget: function (isCachedWidget) {
        try {
            this.onRemoveSubscription();

            if (!isCachedWidget) {
                this.onClearData();
                this.unloadWidget();
            }
        } catch (e) {
            utils.logger.logError(e);
        }
    },

    languageChanged: function (language) {
        this.onLanguageChanged(language);
        this.setFullScreenToggleTitle();
    },

    themeChanged: function (theme) {
        this.onThemeChanged(theme);
    },

    afterRender: function (isCacheInBackground) {
        var that = this;

        Ember.run.next(this, function () {
            that.prepareData();
            that.onBindData();

            if (!isCacheInBackground) {
                that.addSubscription();
            }

            if (this.isAllowedToActive) {
                var wkey = that.get('wkey');
                var topDiv = Ember.$('div[data-wkey=' + wkey + ']').parent().closest('div').parent().closest('div'); // Take outer div of active widget key

                topDiv.click(function () {
                    Ember.appGlobal.activeWidget = wkey; // Update active widget key
                });
            }

            that.initializeResponsive();
            that.onAfterRender();
        });
    },

    unloadWidget: function () {
        if (this.get('responsive')) {
            this.get('responsive').onClear();
        }

        this.onUnloadWidget();
    },

    onClearRender: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    initializeResponsive: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onBindData: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onResponsive: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onLoadWidget: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onPrepareData: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onAddSubscription: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onRemoveSubscription: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onClearData: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onUnloadWidget: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onLanguageChanged: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onThemeChanged: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onVisibilityChanged: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
        // This function triggered with boolean arg while document visibility changes as isHidden
    },

    onAfterRender: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onOrientationChanged: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onDataSuccess: function () {
        this.stopLoadingProgress();
        this.set('isDataAvailable', this.onCheckDataAvailability());

        if (this.get('isDataAvailable')) {
            this.hideDataErrorMessage();
            this.cancelRequestTimeout(this.get('loadingTimeoutTimer'));
            this.onDataLoad();

            if (this.get('isObserving')) {
                this.removeObserver(this.get('observableProperty'), this.onDataSuccess);
                this.set('isObserving', false);
            }
        } else if (this.get('loadingTimeoutTimer')) {
            this.hideDataErrorMessage();
            this.startLoadingProgress();
        } else {
            this.showDataErrorMessage();
        }
    },

    onDataLoad: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onDataError: function () {
        this.stopLoadingProgress();
        this.set('isDataAvailable', this.onCheckDataAvailability());

        if (this.get('isDataAvailable')) {
            this.hideDataErrorMessage();
        } else {
            this.showDataErrorMessage();
        }
    },

    /* *
     * To send data requests again
     * This function should not send specific price subscription request like full market symbol request
     */
    onReloadData: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    /* *
     * To make the content of the widget fit to the widget container when resizing the widget container
     * E.g. Watch list, Time and sales widgets
     * Custom workspace
     */
    onResizeWidget: function () {
        this.toggleProperty('isRefreshed');
    },

    /* *
     * To make the widget header and content responsive when resizing the widget container
     * Custom workspace
     */
    resizeWidget: function () {
        this.onResizeWidget();

        // To call the onResize function in the ResponsiveHandler class on widget container resize
        if (this.responsive) {
            this.responsive.onResize();
        }

        // To make the widget header inner tabs responsive when resizing the widget container or adding new inner widgets
        if (this.get('widgetHeaderComponent')) {
            this.get('widgetHeaderComponent').onResponsiveChanged();
        }
    },

    showDataErrorMessage: function () {
        this.set('showError', true);
    },

    hideDataErrorMessage: function () {
        this.set('showError', false);
    },

    setErrorMessage: function () {
        this.set('errorMessage', this.get('app').lang.messages.dataNotAvailable);
    },

    startLoadingProgress: function () {
        this.set('isDataAvailable', false);
        this.hideDataErrorMessage();
        this.set('isLoading', true);
    },

    stopLoadingProgress: function () {
        this.set('isLoading', false);
    },

    setRequestTimeout: function (timeout, observableProperty) {
        // TODO: [Bashitha] Handle default timeout
        var that = this;

        this.set('observableProperty', observableProperty);
        this.cancelRequestTimeout(this.get('loadingTimeoutTimer'));

        this.set('loadingTimeoutTimer', Ember.run.later(function () {
            that.onDataError();
        }, timeout * 1000));

        this.addObserver(observableProperty, this.onDataSuccess);
        this.set('isObserving', true);
        this.startLoadingProgress();
    },

    cancelRequestTimeout: function (timer) {
        if (timer) {
            Ember.run.cancel(timer);
        }
    },

    toggleFullScreen: function (widgetContainerId, widgetId, fullViewHeight, regularViewHeight) {
        var fullScreenContainer = document.getElementById('fullScreenContainer');
        var widgetContainer = document.getElementById(widgetContainerId);
        var widget = document.getElementById(widgetId);
        var body = document.body;

        if (widgetContainer) {
            if (!this.get('previousParent')) {
                this.set('previousParent', widgetContainer.parentElement);
                this.set('previousWatchListStyleAttribute', widgetContainer.getAttribute('style'));
                this.set('previousFullScreenContainerStyleAttribute', fullScreenContainer.getAttribute('style'));
                fullScreenContainer.appendChild(widgetContainer);
                widgetContainer.setAttribute('style', 'position: absolute; left: 0; top: 0; bottom: 0; right: 0;');
                fullScreenContainer.setAttribute('style', 'z-index:300; position: absolute; left: 0; top: 0; bottom: 0; right: 0;');

                var html = document.documentElement;
                var height = Math.max(body.scrollHeight, body.offsetHeight,
                    html.clientHeight, html.scrollHeight, html.offsetHeight);

                if (widget) {
                    widget.setAttribute('style', 'height:' + fullViewHeight ? fullViewHeight : height + 'px');
                }

                this.set('fullScreenToggleTitle', this.get('app').lang.labels.exitFullScreen);
            } else {
                this.get('previousParent').appendChild(widgetContainer);
                widgetContainer.setAttribute('style', this.get('previousWatchListStyleAttribute'));
                fullScreenContainer.setAttribute('style', this.get('previousFullScreenContainerStyleAttribute'));
                this.set('previousParent', null);
                this.set('fullScreenToggleTitle', this.get('app').lang.labels.fullScreen);

                if (regularViewHeight && widget) {
                    widget.setAttribute('style', 'height:' + regularViewHeight + 'px');
                }
            }
        }
    },

    setFullScreenToggleTitle: function () {
        if (!this.get('previousParent')) {
            this.set('fullScreenToggleTitle', this.get('app').lang.labels.fullScreen);
        } else {
            this.set('fullScreenToggleTitle', this.get('app').lang.labels.exitFullScreen);
        }
    },

    setWidgetLink: function (newLink) {
        if (this.get('selectedLink') !== undefined && this.get('selectedLink') !== this.defaultLink.code) {
            appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
        }

        this.set('selectedLink', newLink.code);

        if (this.get('selectedLink') !== undefined && this.get('selectedLink') !== this.defaultLink.code) {
            appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
        }

        this.saveWidget({selectedLink: newLink.code});
    },

    onWidgetKeysChange: function (args) {
        this.refreshWidget(args);
    },

    initializeEventListner: function (widgetId, methodName) {
        this._generateFullContextMenu();
        this.currentWidget = this.getWidget(widgetId);
        this.bindEvents(methodName, this.currentWidget);
    },

    bindEvents: function (methodName, widget) {
        var method = this.get(methodName);
        this.clickEventHandler = method.bind(this);

        if (widget.addEventListener) { // For all major browsers, except IE 8 and earlier
            widget.addEventListener('mousedown', this.clickEventHandler);
        } else if (widget.attachEvent) { // For IE 8 and earlier versions
            widget.attachEvent('onclick', this.clickEventHandler);
            widget.attachEvent('onmousedown', this.clickEventHandler);
        }
    },

    unBindEvents: function () {
        var widget = this.currentWidget;

        if (widget && widget.removeEventListener) { // For all major browsers, except IE 8 and earlier
            widget.removeEventListener('mousedown', this.clickEventHandler);
        } else if (widget && widget.detachEvent) { // For IE 8 and earlier versions
            widget.detachEvent('onclick', this.clickEventHandler);
            widget.detachEvent('onmousedown', this.clickEventHandler);
        }
    },

    getWidget: function (tableId) {
        var widgetTable = Ember.$(tableId);

        if (widgetTable && widgetTable.length > 0) {
            widgetTable = widgetTable[0];
        }

        return widgetTable;
    },

    getParentElement: function (event, element) {
        return Ember.$(event.target).parents(element);
    },

    _generateFullContextMenu: function () {
        this.menuComponent = this.container.lookup('component:symbol-click-menu-popup');

        if (!this.menuComponent) { // Create a symbol-click-menu-popup component if object is already not
            this.menuComponent = this.container.lookupFactory('component:symbol-click-menu-popup').create();
        }

        if (this.menuComponent.fullContextMenu.length === 1 && appConfig.customisation.isTradingEnabled) {
            this.menuComponent.fullContextMenu.insertAt(0, this.menuComponent.tradeContextMenu);
        }
    },

    // TODO: [Dasun] Should remove these animation functions to common component

    _clickAnimation: function (e) {
        var clickedElement = Ember.$(e.target);
        var buttonElement, topValue, leftValue;

        // Get button element
        if (clickedElement[0].localName === 'button') {
            buttonElement = clickedElement;
            topValue = buttonElement[0].clientHeight / 2;
            leftValue = buttonElement[0].clientWidth / 2;

        } else if (clickedElement.parent().closest('button') && clickedElement.parent().closest('button')[0] && clickedElement.parent().closest('button')[0].clientHeight) {
            buttonElement = clickedElement.parent().closest('button');
            topValue = buttonElement[0].clientHeight / 2;
            leftValue = buttonElement[0].clientWidth / 2;
        } else {
            leftValue = e.offsetX ? e.offsetX : e.layerX;
            topValue = e.offsetY ? e.offsetY : e.layerY;
        }

        var effect = document.createElement('div');

        effect.className = 'effect';
        effect.style.top = topValue + 'px';
        effect.style.left = leftValue + 'px';

        e.srcElement.appendChild(effect);

        setTimeout(function () {
            e.srcElement.removeChild(effect);
        }, 1100);
    },

    initializeButtonAnimation: function () {
        var that = this;

        Ember.run.later(function () {
            var button = document.querySelectorAll('.btn-animation');

            for (var i = 0; i < button.length; i++) {
                button[i].onmousedown = that._clickAnimation;
            }
        }, 1);
    },

    generateScrollBar: function (elementId, timeOut) {
        var id = elementId ? elementId : this.get('wkey');
        var time = timeOut ? timeOut : 1000;

        Ember.run.later(function () {
            Ember.$('#' + id + ' > .nano').nanoScroller();
        }, time);
    },

    actions: {
        renderInnerWidgetItems: function (options) {
            this.widgetContainer.onRenderInnerWidgetItems(options.innerWidget, options.baseWidgetId);
        },

        /* *
         * To close the widget or inner widget
         * Custom workspace
         */
        closeWidgetAction: function () {
            if (this.widgetContainer) {
                this.widgetContainer.closeInnerWidget(this.get('widgetId'), this.get('innerWidgetId'));
            }
        },

        changeSymbol: function (item) {
            this.onWidgetKeysChange({sym: item.sym, exg: item.exg, inst: item.inst});
        },

        /* *
         * To send data requests again
         * This should not send some specific price subscription request like full market symbol request
         */
        reloadData: function () {
            this.onReloadData();
        }
    }
});