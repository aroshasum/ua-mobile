import Ember from 'ember';
import utils from '../utils/utils';
import moduleInitializerConfig from '../config/module-initializer-config';
import appConfig from '../config/app-config';
import sharedService from '../models/shared/shared-service';

export default (function () {
    var name = 'application-initializer';

    var initialize = function (container, application) {
        _initializeApplication();
        application.deferReadiness();

        // Pre intialize only configured modules, post initialize will be invoked once lazy modules initialized
        Ember.$.each(moduleInitializerConfig.modules, function (key, config) {
            try {
                config.preInitialize(application);
            } catch (e) {
                utils.logger.logError('Error in pre-initialize : ' + e);
                utils.logger.logTrace('application-initializer.preInitialize() - ' + e.message);
            }
        });

        // Pre intialize configured modules, post initialize will be invoked once lazy modules initialized
        Ember.$.each(moduleInitializerConfig.preInitModules, function (key, initConfig) {
            try {
                var initializer = initConfig ? container.lookupFactory(initConfig) : undefined;

                if (initializer) {
                    initializer = initializer.create();
                    initializer.preInitialize();

                    moduleInitializerConfig.modules.pushObject(initializer);
                }
            } catch (e) {
                utils.logger.logError('Error in pre-initialize : ' + e);
                utils.logger.logTrace('application-initializer.postInitialize() - ' + e.message);
            }
        });

        application.advanceReadiness();

        _addCacheUpdateNotification();

        if (Ember.appGlobal.multiScreen.isParentWindow) {
            Ember.appGlobal.multiScreen.parentSharedService = sharedService;
        }

        if (appConfig.customisation.isTablet) {
            utils.screenHelper.setZoomingFactor(); // Zoom layout for high resolution device
        }
    };

    var _initializeApplication = function () {
        _initializeProperties();
    };

    var _addCacheUpdateNotification = function () {
        if (appConfig.customisation.isPromptCacheUpdate) {
            try {
                _addApplicationCacheUpdateListener();
            } catch (e) {
                utils.logger.logError('Error in adding cache update listener : ' + e);
                utils.logger.logTrace('application-initializer._addApplicationCacheUpdateListener() - ' + e.message);
            }
        }
    };

    var _initializeProperties = function () {
        Ember.appGlobal = {};
        Ember.appGlobal.events = {};
        Ember.appGlobal.priceUser = {};
        Ember.appGlobal.orientation = {};
        Ember.appGlobal.session = {popupCount: 0};
        Ember.appGlobal.tableCache = [];
        Ember.appGlobal.isSortingProgress = false;
        Ember.appGlobal.tabletConfig = {
            zoomingFact: 1 // For default screen (resolution: 1024x600, dppx: 1)
        };
        Ember.appGlobal.multiScreen = {
            isParentWindow: true,
            childWindowArray: [],
            isParentLogoutFired: false
        };

        Ember.appGlobal.logger = {};
        Ember.appGlobal.logger.stackTrace = [];
    };

    var _addApplicationCacheUpdateListener = function () {
        if (window.applicationCache) {
            var appCache = window.applicationCache;

            // Check if a new cache is available on page load.
            window.addEventListener('load', function () {
                appCache.addEventListener('updateready', function () {
                    if (appCache.status === appCache.UPDATEREADY) {
                        // Browser downloaded a new app cache.
                        sharedService.getService('sharedUI').showReloadConfirmation();
                    }
                    // Else - Manifest didn't changed. Nothing new to server.
                }, false);
            }, false);
        } else {
            utils.logger.logInfo('Application cache not supported by this context');
        }
    };

    return {
        name: name,
        initialize: initialize
    };
})();
