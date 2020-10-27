import Ember from 'ember';
import appEvents from '../app-events';

export default Ember.Object.extend({
    controller: null,
    widgetId: null,
    callback: null,
    elementCollection: undefined,
    containerResLevel: undefined,
    groupElementList: undefined,
    groupElementArray: undefined,
    trigger: false,
    throttleDelay: 50,
    debounceDelay: 500,

    // Vertical Responsive
    isVerticalResEnabled: false,
    verticalRes: undefined,

    init: function () {
        this._super();
        this.widget = this.controller;

        if (!this.isContainer) {
            this.set('container', Ember.$('div#' + this.widgetId));

            this.groupElementList = {};
            this.groupElementArray = {};
        }
    },

    onPrepare: function () {
        this.set('elementCollection', {});
        this.set('container', Ember.$('div#' + this.widgetId));

        this.bindResize();
    },

    initialize: function () {
        this.setList();
        this.onPrepare();
    },

    addList: function (key, list) {
        this.get('groupElementList')[key] = list;
    },

    setList: function () {
        var map = this.get('groupElementList');
        var that = this;

        Ember.$.each(map, function (key, array) {
            var elementArray = [];

            Ember.$.each(array, function (id, element) {
                var responsiveMarginRatio = (element.responsiveMarginRatio) ? element.responsiveMarginRatio : 1;
                var responsiveMarginAttribute = (element.responsiveMarginAttribute) ? element.responsiveMarginAttribute : null;

                elementArray[id] = {
                    elementId: element.id,
                    originalWidth: that.getWidth(element.id),
                    respondedElementId: element.id,
                    respondedWidth: 0,
                    responsiveMargin: element.width,
                    responsiveMarginAttribute: responsiveMarginAttribute,
                    responsiveMarginRatio: responsiveMarginRatio
                };
            });

            that.get('groupElementArray')[key] = {elementList: elementArray, level: 0, responsiveKey: key};
        });
    },

    verticalResponsiveList: function (key, containerId, list, callBack) {
        var elementArray = [];

        Ember.$.each(list, function (id, element) {
            elementArray[id] = {
                elementId: element.id,
                originalHeight: Ember.$('[data-id=' + element.id + ']').height()
            };
        });

        var verticalRes = {containerId: containerId, floatingElementId: key, level: 0, elementArray: elementArray, callBack: callBack};

        this.set('isVerticalResEnabled', true);
        this.set('verticalRes', verticalRes);

        this.checkVerticalRes(this.get('verticalRes'));
    },

    bindResize: function () {
        // Bind resize event
        var that = this;
        appEvents.subscribeWindowResize(this, [this.get('widgetId'), Math.floor(Date.now()).toString()].join('-'));

        if (this.isContainer) {
            this.checkBrowserWidth();
        } else {
            this.callSetResponsive();
        }

        if (this.enabledElementResize) {
            var resizeEventHandler = this.onResize.bind(this);

            Ember.$.each(this.get('groupElementArray'), function (key) {
                that.addElementCollection(key, resizeEventHandler);
            });

            this.setTimer();
        }
    },

    setTimer: function () {
        var that = this;
        var elementCollection = this.get('elementCollection');

        if (elementCollection) {
            Ember.$.each(elementCollection, function (key, elem) {
                that._onElementResize(elem);
            });
        }

        var timer = setTimeout(function () {
            that.setTimer();
        }, 1000);

        this.set('resizeCheckTimer', timer);
    },

    addElementCollection: function (elementId, callBack) {
        var elementCollection = this.get('elementCollection');
        var currentWidth = this.getWidth(elementId);

        elementCollection[elementId] = {id: elementId, currentWidth: currentWidth, previousWidth: currentWidth, callBack: callBack};
    },

    _onElementResize: function (elem) {
        var width = this.getWidth(elem.id);
        var groupElementArray = this.get('groupElementArray')[elem.id];
        var currentLevel = groupElementArray.level;

        if (width !== elem.currentWidth || (width === 0 && elem.currentWidth === 0 && currentLevel !== groupElementArray.elementList.length)) {
            elem.currentWidth = width;
            elem.callBack();
        }
    },

    callSetResponsive: function () {
        var that = this;
        var groupElementArray = this.get('groupElementArray');

        Ember.$.each(groupElementArray, function (key, element) {
            that.setResponsive(element);
        });
    },

    onResize: function () {
        var that = this;
        var isContainer = this.isContainer;

        if (this._isActiveWidget() && !isContainer && this.get('container')) {
            var groupElementArray = this.get('groupElementArray');

            Ember.$.each(groupElementArray, function (key, element) {
                Ember.run.throttle(that, 'setResponsive', element, that.throttleDelay); // Throttle enable : Make responsive while resizing
                Ember.run.debounce(that, 'setResponsive', element, that.debounceDelay); // Debounce enable : Make responsive after resizing
            });
        } else if (isContainer && this.get('container')) {
            Ember.run.throttle(that, 'checkBrowserWidth', that.throttleDelay); // Throttle enable : Make responsive while resizing
            Ember.run.debounce(that, 'checkBrowserWidth', that.debounceDelay); // Debounce enable : Make responsive after resizing
        }

        if (this.isVerticalResEnabled) {
            Ember.run.debounce(that, 'checkVerticalRes', this.get('verticalRes'), that.debounceDelay);
        }
    },

    checkVerticalRes: function (group) {
        var level = group.level;

        if (this.increaseVerticalLevel(level, group)) {
            return;
        }

        this.decreaseVerticalLevel(level, group);
    },

    increaseVerticalLevel: function (level, group) {
        var that = this;
        var currentLevel = level + 1;

        if (level < group.elementArray.length && !this.isVisible(group)) {
            Ember.set(group, 'level', currentLevel);
            group.callBack(this.widget, currentLevel);

            Ember.run.later(function () {
                that.increaseVerticalLevel(currentLevel, group);
            }, 5);

            return true;
        } else {
            return false;
        }
    },

    decreaseVerticalLevel: function (level, group) {
        var that = this;
        var currentLevel = level - 1;

        if (level > 0 && this.isVisible(group, true)) {
            Ember.set(group, 'level', currentLevel);
            group.callBack(this.widget, currentLevel);

            Ember.run.later(function () {
                that.decreaseVerticalLevel(currentLevel, group);
            }, 1);

            return true;
        } else {
            return false;
        }
    },

    isVisible: function (group, isDecrease) {
        var elementTop = Ember.$('[data-id=' + group.floatingElementId + ']')[0].offsetTop;
        var containerHeight = Ember.$('[data-id=' + group.containerId + ']').height();
        var decreasedElementHeight = 0;

        if (group.level > 0 && isDecrease) {
            decreasedElementHeight = group.elementArray[group.level - 1].originalHeight;
        }

        return containerHeight > elementTop + decreasedElementHeight;
    },

    checkBrowserWidth: function () {
        /** High resolution responsive levels
         * 0 : 1336 x 768
         * -1 : 1440 x 900
         * -2 : 1600 x 1050
         * -3 : 1680 x 1200
         * -4 : 1792 x 1344
         * -5 : 1920 x 1440
         */

        var currentLevel = 0;
        var windowSize = window.innerWidth;

        if (windowSize > 1900) {
            currentLevel = -5; // Identify 1920 x 1440  display and set responsive level as -5
        } else if (windowSize < 1175) {
            currentLevel = 1; // Identify 1024 x 600  display and set responsive level as 1
        }

        if (this.containerResLevel !== currentLevel) {
            var responsiveArgs = {controller: this.widget, responsiveLevel: currentLevel};

            this._performCallback(responsiveArgs);
            this.containerResLevel = currentLevel;
        }
    },

    setResponsive: function (gruop) {
        var level = gruop.level;

        if (this.increaseLevel(level, gruop)) {
            return;
        }

        this.decreaseLevel(level, gruop);
    },

    increaseLevel: function (level, gruop) {
        var itemsList = gruop.elementList;
        var that = this;

        if (level < itemsList.length) {
            var element = itemsList[level];

            if (that.getResponsiveLimit(gruop.responsiveKey, element.responsiveMarginAttribute) < element.responsiveMargin) {
                var currentLevel = level + 1;
                var responsiveArgs = {
                    controller: that.widget,
                    responsiveKey: gruop.responsiveKey,
                    responsiveLevel: currentLevel
                };

                Ember.set(gruop.elementList[level], 'originalWidth', that.getWidth(gruop.elementList[level].elementId));
                Ember.set(gruop, 'level', currentLevel);

                that._performCallback(responsiveArgs);

                if (element.respondedElementId && !element.respondedWidth) {
                    Ember.run.later(function () {
                        that.setResponsivedWidth(element);
                    }, 1);
                }

                Ember.run.later(function () {
                    that.increaseLevel(currentLevel, gruop);
                }, 5);

                return true;
            }
        } else {
            return false;
        }
    },

    decreaseLevel: function (level, gruop) {
        var itemsList = gruop.elementList;
        var that = this;

        if (level > 0) {
            var element = itemsList[level - 1];

            if (element.responsiveMargin < (that.getResponsiveLimit(gruop.responsiveKey, element.responsiveMarginAttribute) * element.responsiveMarginRatio) - that.getNeededWidth(element)) {
                var currentLevel = level - 1;
                var responsiveArgs = {
                    controller: that.widget,
                    responsiveKey: gruop.responsiveKey,
                    responsiveLevel: currentLevel
                };

                Ember.set(gruop, 'level', currentLevel);
                that._performCallback(responsiveArgs);

                Ember.run.later(function () {
                    that.decreaseLevel(currentLevel, gruop);
                }, 1);
                return true;
            }
        } else {
            return false;
        }
    },

    getNeededWidth: function (item) {
        if (item.respondedWidth === 0) {
            return item.originalWidth;
        } else {
            return item.originalWidth - item.respondedWidth;
        }
    },

    setResponsivedWidth: function (item) {
        var that = this;

        if (item.respondedElementId === 0) {
            return;
        }

        Ember.set(item, 'respondedWidth', that.getWidth(item.respondedElementId));
    },

    getWidth: function (elementId) {
        if (this.container) {
            if (this.widgetId === elementId) {
                return this.container.width();
            }

            return this.container.find('[data-id=' + elementId + ']').width();
        }

        return 0;
    },

    getResponsiveLimit: function (elementId, widthType) {
        if (widthType && this.container) {
            var element = (this.widgetId === elementId) ? this.container : this.container.find('[data-id=' + elementId + ']');
            return parseInt(element.css(widthType), 10);
        }

        return this.getWidth(elementId);
    },

    isResponsiveLevelReached: function (key, level) {
        if (key === 'window') {
            return level >= this.containerResLevel;
        }

        if (this.get('groupElementArray')[key]) {
            var currentLevel = this.get('groupElementArray')[key].level;
            return level <= currentLevel;
        }
    },

    onClear: function () {
        this.set('container', undefined);
        this.set('elementCollection', undefined);

        clearTimeout(this.get('resizeCheckTimer'));
        appEvents.unSubscribeWindowResize(this.get('widgetId'));
    },

    _performCallback: function (responsiveArgs) {
        this.set('trigger', !this.get('trigger'));
        this.callback(responsiveArgs);
    },

    _isActiveWidget: function () {
        var isActiveWidget = true;

        if (this.widget && this.widget.widgetContainer) {
            var widgetContainer = this.widget.widgetContainer;

            var currentMenu = widgetContainer.menuContent ? widgetContainer.menuContent.id : -1;
            var currentTab = widgetContainer.tabContent ? widgetContainer.tabContent.id : -1;

            var widgetMenu = this.widget.menuContent ? this.widget.menuContent.id : -1;
            var widgetTab = this.widget.tabContent ? this.widget.tabContent.id : -1;

            if (currentMenu !== widgetMenu || currentTab !== widgetTab) {
                isActiveWidget = false;
            }
        }

        return isActiveWidget;
    }
});
