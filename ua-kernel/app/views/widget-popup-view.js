/* global Draggabilly */
import Ember from 'ember';
import appEvents from '../app-events';
import sharedService from '../models/shared/shared-service';

export default Ember.View.extend({
    defaultDimensions: {
        w: 345,
        h: ''
    },

    showWidget1: true,
    outletName: '',
    widgetPopupId: '',
    currentWidgetController: null,
    displacementScale: 20,
    userSettings: sharedService.userSettings,

    popUpWidgetTitle: function () {
        var widgetController = this.get('currentWidgetController');

        if (widgetController && widgetController.title) {
            return widgetController.get('title');
        }

        return '';
    }.property('currentWidgetController.title'),

    popUpWidgetTitleRight: function () {
        var widgetController = this.get('currentWidgetController');

        if (widgetController && widgetController.titleRight) {
            return widgetController.get('titleRight');
        }

        return '';
    }.property('currentWidgetController.titleRight'),

    isWidgetCloseAvailable: function () {
        var widgetController = this.get('currentWidgetController');

        if (widgetController && widgetController.isWidgetCloseAvailable === false) {
            return widgetController.get('isWidgetCloseAvailable');
        }

        return true;
    }.property('currentWidgetController.isWidgetCloseAvailable'),

    load: function () {
        var dimensions = this.get('defaultDimensions');

        if (this.get('dimensions')) {
            dimensions = this.get('dimensions');
        } else {
            this.set('dimensions', dimensions);
        }

        var timeStamp = Math.floor(Date.now() / 1000);
        this.outletName = 'out-' + timeStamp;
        this.widgetPopupId = 'widget-popup-out-' + timeStamp;

        this.template = Ember.HTMLBars.compile('<div style="width: ' + dimensions.w + 'px; height: ' + dimensions.h + 'px;" class="popup-widget js-resizable overflow-visible">' +
            '<div id="title-handle" style="cursor: move;">{{widget-header widgetTitle=view.popUpWidgetTitle widgetTitleRight=view.popUpWidgetTitleRight closeWidgetAction="closePopup" isWidgetCloseAvailable=view.isWidgetCloseAvailable closeActionTarget=view hideWidgetLink=true}}</div>' +
            '<div class="popup-height">{{outlet OUTLET_NAME}}</div></div>'.replace('OUTLET_NAME', '"' + this.outletName + '"'));
        this.set('showWidget1', true);
    }.on('init'),

    languageChanged: function () {
        this.setPopupPosition();
    },

    show: function (widgetController, successFunc) {
        Ember.PopupContainerView.addPopupView(this);
        widgetController.set('wkey', this.outletName);

        var popupElement = document.getElementById(Ember.PopupContainerView.elementId);
        var popupElementId = this.elementId;
        var that = this;

        if (popupElement) {
            popupElement.setAttribute('style', 'height: 1px; max-height: 1px; position: absolute;');
        }

        appEvents.subscribeLanguageChanged(this, this.widgetPopupId);

        Ember.run.later(function () {
            var elem = document.getElementById(popupElementId);
            that.preparePopUp(widgetController);

            if (elem) {
                new Draggabilly(elem, {       // eslint-disable-line
                    handle: '#title-handle',
                    x: 100,
                    y: 200
                });

                Ember.$('.js-resizable').resizable();
            }

            widgetController.onAfterRender();
            successFunc();
        }, 1);
    },

    // TODO: [satheeq] Once popup view redesigned, need to merge this method in base class.
    setPopupPosition: function () {
        var elem = document.getElementById(this.elementId);
        var currentPosition = this.getPopupCount() * this.get('displacementScale');
        var leftPosition = currentPosition;

        if (this.get('userSettings').currentLanguage === 'AR') {
            leftPosition = -(this.get('dimensions.w') + currentPosition);
        }

        elem.setAttribute('style', 'position: absolute; top:' + currentPosition + 'px;left:' + leftPosition + 'px;');

        // Timer: To make this pop-up window active when the popup window button (buy/sell) is clicked from another popup window
        // click: To add the z-index when the popup is created
        Ember.run.later(this, this.click, 1);
    }.on('didInsertElement'),

    getPopupCount: function () {
        var popupCount = Ember.appGlobal.session.popupCount;

        if (this.get('dimensions.h') + popupCount * this.get('displacementScale') > Ember.$(window).height() || this.get('dimensions.w') + popupCount * this.get('displacementScale') > Ember.$(window).width()) {
            Ember.appGlobal.session.popupCount = 0;
        } else {
            Ember.appGlobal.session.popupCount = popupCount + 1;
        }

        return popupCount;
    },

    preparePopUp: function (widgetController) {
        var route = this.container.lookup('route:application');

        route.render(widgetController.get('routeString'), {
            into: 'application',
            outlet: this.outletName,
            controller: widgetController
        });

        appEvents.subscribeLanguageChanged(widgetController, this.outletName);
        this.set('currentWidgetController', widgetController);
    },

    click: function () {
        var elem = document.getElementById(this.elementId);

        if (!Ember.PopupZIndex) {
            Ember.PopupZIndex = 2000;
        }

        Ember.PopupZIndex = Ember.PopupZIndex + 1;
        elem.style.zIndex = Ember.PopupZIndex;
    },

    unloadCurrentController: function () {
        var currentController = this.get('currentWidgetController');

        if (currentController) {
            currentController.closeWidget();
        }
    },

    showConfirmationPopup: function () {
        var currentController = this.get('currentWidgetController');

        if (currentController) {
            currentController.showConfirmationPopup();
        }
    },

    actions: {
        closePopup: function () {
            if (!this.get('currentWidgetController.confirmClose')) {
                this.unloadCurrentController();

                appEvents.unSubscribeLanguageChanged(this.get('outletName'));
                appEvents.unSubscribeLanguageChanged(this.widgetPopupId);
                Ember.PopupContainerView.removeObject(this);
            } else {
                this.showConfirmationPopup();
            }
        }
    }
});