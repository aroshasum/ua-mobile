import Ember from 'ember';
import appEvents from '../app-events';
import utils from '../utils/utils';
import sharedService from '../models/shared/shared-service';

export default Ember.Component.extend({
    animationClass: '',
    widgetName: '',
    parentView: undefined,
    currentView: '',
    currentController: undefined,
    wkey: 'child-view-mobile',
    isArabic: false,
    isOrientationLocked: false,
    isBackDisabled: false,

    initialize: function () {
        appEvents.subscribeLanguageChanged(this, this.get('wkey'));
        appEvents.subscribeThemeChanged(this, this.get('wkey'));
        this.set('isArabic', sharedService.userSettings.currentLanguage === 'AR');
        this.set('animationClass', 'display-none');
    }.on('init'),

    showChildView: function (viewName, widgetController, widgetName, parentView) {      // Note that DO NOT close previous popup when show new popup
        var that = this;
        sharedService.getService('sharedUI').setChildViewEnable(true);

        if (Ember.appGlobal.orientation.isLandscape) {
            this.set('isOrientationLocked', true);

            if (Ember.$.isFunction(window.screen.lockOrientation)) {
                window.screen.lockOrientation('portrait');
            }
        }

        if (widgetController && widgetController.get('isBackToPrev')) {
            this.set('previousWidgetName', this.get('widgetName'));
            this.set('previousController', this.get('currentController'));
            this.set('previousView', this.get('currentView'));
        }

        this.set('widgetName', widgetName);
        this.set('currentController', widgetController);
        this.set('currentView', viewName);
        this.set('animationClass', 'child-view-main child-view-enter');
        this.set('isBackDisabled', widgetController ? widgetController.get('isBackDisabled') : false);

        // Subscribe new widget
        appEvents.subscribeLanguageChanged(widgetController, viewName);
        appEvents.subscribeThemeChanged(widgetController, viewName);

        this.parentView = Ember.$('div#' + parentView);
        // this.parentView.removeClass('parent-view-enter').addClass('parent-view-exit'); // Temporary disabled as the animation is not smooth

        Ember.run.later(function () {
            var route = that.container.lookup('route:application');

            route.render(viewName, {
                into: 'components/child-view',
                outlet: 'childWidgetOutlet',
                controller: widgetController
            });
        }, 600);
    },

    closeChildView: function (viewName, isClosePopup) {
        var that = this;
        sharedService.getService('sharedUI').setChildViewEnable(false);

        if (this.get('currentView')) {      // Required to close IF opened popups available when navigating
            if (this.get('isOrientationLocked')) {
                this.set('isOrientationLocked', false);

                if (Ember.$.isFunction(window.screen.unlockOrientation)) {
                    window.screen.unlockOrientation();
                }
            }

            var view = viewName;
            var currentView = this.get('currentView');

            if (utils.validators.isAvailable(currentView)) {
                // Un-subscribe previous widget
                appEvents.unSubscribeLanguageChanged(currentView);
                appEvents.unSubscribeThemeChanged(currentView);
            }

            this.set('animationClass', 'top-zero bottom-zero child-view-exit');
            this.parentView.removeClass('parent-view-exit').addClass('parent-view-enter');

            Ember.run.later(function () {     // Required for animation
                if (that.get('currentView') === view || isClosePopup) {
                    that.set('animationClass', 'display-none');

                    var route = that.container.lookup('route:application');

                    route.disconnectOutlet({
                        parentView: 'components/child-view',
                        outlet: 'childWidgetOutlet'
                    });
                }

                that.set('currentView', '');
            }, 400);
        }
    },

    languageChanged: function () {
        var that = this;

        Ember.run.later(function () {   // Let containing controllers to do language specific changes
            if (that.get('currentController')) {
                that.set('widgetName', that.get('currentController').get('title'));
            }
        }, 100);

        this.set('isArabic', sharedService.userSettings.currentLanguage === 'AR');
    },

    actions: {
        returnChildView: function (viewName) {
            var widgetController = this.get('currentController');

            if (widgetController && widgetController.get('isBackToPrev')) {
                this.showChildView(this.get('previousView'), this.get('previousController'), this.get('previousWidgetName'));
            } else {
                this.closeChildView(viewName);
            }
        }
    }
});