/* global Mousetrap */

import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import appConfig from '../config/app-config';

export default Ember.Component.extend({
    isEnabled: false,
    clickRowX: 0,
    clickRowY: 0,
    popupWidth: 0,      // Width of rightClickPopupMenu popup
    popupHeight: 0,     // Height of rightClickPopupMenu popup
    popupSizeMap: {},

    prevActiveWidget: undefined,

    zoomingFact: Ember.appGlobal.tabletConfig.zoomingFact,

    expose: function () {
        var parentController = this.get('targetObject');
        var exposedName = this.get('id');

        parentController.set(exposedName, this);

        if (this.get('isRegistered')) {
            sharedService.getService('sharedUI').registerService('modalPopupId', this);
        }
    }.on('didInsertElement'),

    addDocumentClickListener: function () {
        this.clickEventHandler = this.onDocumentClick.bind(this);
        document.addEventListener('mouseup', this.clickEventHandler);
    },

    onDocumentClick: function (e) {
        if (this.isEnabled && this.popupWidth) {
            if (!(((this.clickRowX) <= e.pageX) && (e.pageX < (this.clickRowX + this.popupWidth)) && ((this.clickRowY) <= e.pageY) && (e.pageY < (this.clickRowY + this.popupHeight)))) {
                this.set('isEnabled', false);
            }
        }
    },

    setClickMenuPosition: function (viewName, container, isDropdown) {
        var positionX, positionY;
        var fullHeight = document.documentElement.clientHeight / this.zoomingFact;
        var fullWidth = document.documentElement.clientWidth / this.zoomingFact;

        this.popupWidth = this.popupSizeMap[viewName].width;
        this.popupHeight = this.popupSizeMap[viewName].height;

        var elementWidth = this.popupWidth;
        var elementHeight = this.popupHeight;
        var halfHeight = fullHeight - elementHeight;
        var halfWidth = fullWidth - elementWidth;

        var popup = Ember.$('#' + this.get('id')); // Be Careful to call this after calling 'show modal'
        var leftPosition = 0;
        var top = 0;

        var containerTop, containerLeft, containerWidth, containerHeight;

        // Positioning for the dropdown list
        if (isDropdown) {
            var event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;
            var position = Ember.$(event.target).position();

            var dropDownPadding = 5;
            var dropDownHeight = event.target.clientHeight !== 0 ? event.target.clientHeight : 15; // Normal dropdown button height (15)

            var layerX = event.layerX < 250 && event.layerX > 0 ? event.layerX : 0; // Icon position is at the end of the button: width of button (250)
            var layerY = position.top === 0 && event.layerY < dropDownHeight + 2 ? event.layerY : 0;
            var offsetLeft = position.left < 10 && position.left > 0 ? position.left : 0; // Space between button and text at the beginning of the button (10)

            if (sharedService.userSettings.currentLanguage === 'AR') { // For Arabic Language
                var clientWidth = event.target.clientWidth;

                if (clientWidth !== 0) {
                    var positionVal = event.target.nodeName === 'I' ? 0 : clientWidth;
                    positionX = this.get('clickRowX') + positionVal - layerX - offsetLeft;
                } else {
                    layerX = event.target.nodeName === 'I' ? 0 : layerX;
                    positionX = this.get('clickRowX') - layerX;
                }

                if (positionX - elementWidth < 0) {
                    positionX = elementWidth + dropDownPadding;
                }
            } else {
                layerX = Math.abs(layerX);
                positionX = this.get('clickRowX') - layerX - offsetLeft;

                if (positionX + elementWidth > fullWidth) {
                    positionX = fullWidth - elementWidth - dropDownPadding;
                }
            }

            if (positionX < dropDownPadding) {
                positionX = dropDownPadding;
            }

            if (positionX > fullWidth) {
                positionX = fullWidth - dropDownPadding;
            }

            if (layerY > 0) {
                positionY = this.get('clickRowY') + (dropDownHeight - layerY);
            } else {
                positionY = this.get('clickRowY') + dropDownHeight;
            }

            if (positionY + elementHeight > fullHeight) {
                positionY = fullHeight - elementHeight - dropDownPadding;
            }

            // bootstrap-dropdown-select component is commonly used for most of the drop-downs
            // Removed caching
            this.popupSizeMap[viewName] = undefined;
            popup.css({'left': positionX, 'top': positionY, 'position': 'absolute'});

            return;
        }

        if (appConfig.customisation.isMobile) {
            popup.css({'position': 'absolute', 'top': '60px', 'bottom': 0, 'left': 0, 'right': 0});

            Ember.run.later(function () {
                Ember.$('div#modalContainer').addClass('full-height full-width');
            }, 100);
        } else {
            if (sharedService.userSettings.currentLanguage === 'AR') { // For Arabic Language
                positionX = this.get('clickRowX');
                positionY = this.get('clickRowY');

                if (popup && popup.length > 0) {
                    if (halfHeight > positionY) {
                        leftPosition = halfWidth > positionX ? positionX + elementWidth : positionX;
                        top = positionY;
                    } else if (halfHeight < positionY) {
                        leftPosition = halfWidth > positionX ? positionX + elementWidth : positionX;
                        top = positionY - elementHeight;
                    }
                }

                if (container) {
                    containerTop = container.offset().top;
                    containerLeft = container.offset().left;
                    containerWidth = container.width();
                    containerHeight = container.height();

                    if ((this.get('clickRowX') < (containerLeft + containerWidth)) && (this.get('clickRowY') > containerTop)) {
                        var topView = containerTop > elementHeight;
                        var leftView = containerLeft > elementWidth;

                        if (topView) {                                      // If it is possible view the popup on top of the widget
                            top = containerTop - elementHeight;
                        } else if (elementWidth < (fullWidth - (containerLeft + containerWidth))) {
                            leftPosition = containerLeft + containerWidth + 30 + elementWidth;
                        } else if (leftView) {                              // If it is possible view the popup on left of the widget
                            leftPosition = containerLeft - containerWidth + 30 + elementWidth;
                        } else if (elementHeight < (fullHeight - containerTop + containerHeight)) {
                            top = (fullHeight - containerTop + elementHeight);
                        }
                    }
                }
            } else {
                positionX = this.get('clickRowX');
                positionY = this.get('clickRowY');

                if (popup && popup.length > 0) {
                    if (halfHeight > positionY) {
                        leftPosition = halfWidth > positionX ? positionX : positionX - elementWidth;
                        top = positionY;
                    } else if (halfHeight < positionY) {
                        leftPosition = halfWidth > positionX ? positionX : positionX - elementWidth;
                        top = positionY - elementHeight;
                    }
                }

                if (container) {
                    containerTop = container.offset().top;
                    containerLeft = container.offset().left;
                    containerWidth = container.width();
                    containerHeight = container.height();

                    if ((this.get('clickRowX') > containerLeft) && (this.get('clickRowY') > containerTop)) {
                        var topViewEnglish = containerTop > elementHeight;
                        var leftViewEnglish = containerLeft > elementWidth;

                        if (topViewEnglish) {  // If it is possible view the popup on top of the widget
                            top = containerTop - elementHeight;
                        } else if (elementWidth < (fullWidth - (containerLeft + containerWidth))) {
                            leftPosition = containerLeft + containerWidth;
                        } else if (leftViewEnglish) {   // If it is possible view the popup on left of the widget
                            leftPosition = containerLeft - 30 - elementWidth;
                        } else if (elementHeight < (fullHeight - containerTop + containerHeight)) {
                            top = (fullHeight - containerTop + elementHeight);
                        }
                    }
                }
            }

            if (elementHeight > positionY) {
                top = (fullHeight - positionY) > elementHeight ? positionY : fullHeight - elementHeight;
            }

            popup.css({'left': leftPosition, 'top': top, 'position': 'absolute'});
        }
    },

    setupKeyEvents: function () {
        var that = this;
        var widgetId = this.get('widgetId');
        var activeWidgetId = widgetId ? widgetId : this.get('id');

        this.set('prevActiveWidget', Ember.appGlobal.activeWidget);
        Ember.appGlobal.activeWidget = activeWidgetId;

        Mousetrap.bind('esc', function () {
            that.send('closeModalPopup');
        }, activeWidgetId);

        Mousetrap.bind('tab', function () {
            return false; // Prevent other actions
        }, activeWidgetId);

        Mousetrap.bind('shift+tab', function () {
            return false;
        }, activeWidgetId);
    },

    _setModal(viewName, container, isDropdown) {
        var event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;
        var that = this;

        if (event) {
            if ((event.clientX || event.pageX)) {      // Set position params before show
                var clickRowX = event.pageX ? event.pageX : event.clientX;
                var clickRowY = event.pageY ? event.pageY : event.clientY;

                this.set('clickRowX', clickRowX / this.zoomingFact);
                this.set('clickRowY', clickRowY / this.zoomingFact);
            }
        }

        if (!this.popupSizeMap[viewName]) { // Set element Width and Height
            this.popupSizeMap[viewName] = {width: 0, height: 0};

            var popup = Ember.$('#' + this.get('id'));
            popup.css({'left': 3000, 'top': 3000, 'position': 'absolute'});

            this.send('showModalPopup');

            Ember.run.later(function () {
                var modalContainerElement = Ember.$('div#modalContainer');

                that.popupSizeMap[viewName].width = modalContainerElement.width() || modalContainerElement[0].scrollWidth;
                that.popupSizeMap[viewName].height = modalContainerElement.height() || modalContainerElement[0].scrollHeight;

                that.send('closeModalPopup');
                that.setClickMenuPosition(viewName, container, isDropdown);
                that.send('showModalPopup');
            }, 20);
        } else {
            this.setClickMenuPosition(viewName, container, isDropdown);
            this.send('showModalPopup');
        }
    },

    actions: {
        viewModal: function (viewName, container, isDropdown) {
            this._setModal(viewName, container, isDropdown);
            this.send('showModalPopup');
        },

        closeModalPopup: function () {
            if (this.get('isEnabled')) {
                this.set('isEnabled', false);

                if (!appConfig.customisation.isMobile) {
                    Mousetrap.unbind('esc', this.get('id'));
                    Ember.appGlobal.activeWidget = this.get('prevActiveWidget');
                }
            }
        },

        showModalPopup: function () {
            if (!this.get('isEnabled')) {
                this.set('isEnabled', true);

                if (!appConfig.customisation.isMobile) {
                    this.setupKeyEvents();
                }
            }
        },

        enableOverlay: function () {
            var popup = Ember.$('#' + this.get('id'));

            if (popup) {
                popup.css({'left': '', 'top': '', 'position': ''});
            }

            if (!this.get('isOverlayEnabled')) {
                this.set('isOverlayEnabled', true);
            }
        },

        disableOverlay: function () {
            if (this.get('isOverlayEnabled')) {
                this.set('isOverlayEnabled', false);
            }
        },

        sendContainerAction: function () {
            this.sendAction('containerAction');
        }
    }
});
