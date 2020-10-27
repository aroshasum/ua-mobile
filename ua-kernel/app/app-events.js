import Ember from 'ember';
import utils from './utils/utils';

export default (function () {
    var containerController = {};
    var languageSubscription = {};
    var themeSubscription = {};
    var visibilityChangeSubscription = {};
    var workspaceUpdatedSubscription = {};
    var onAppCloseSubscription = {};
    var exchangeSubscriptionMap = {};
    var subMarketSubscriptionMap = {};
    var symbolSubscriptionMap = {};
    var layoutReadySubscriptions = {};
    var orientationSubscriptions = {};
    var onDomReadySubscriptions = {};
    var onWindowResizeSubscriptions = {};

    var eventSubscriberMap = {};

    // TODO: [Bashitha] Handle exceptions for all observer notifications

    var onSymbolChanged = function (symbol, exchange, insType, link) {
        if (utils.validators.isAvailable(link)) {
            var subscriptionMap = symbolSubscriptionMap[link];

            if (subscriptionMap) {
                Ember.$.each(subscriptionMap, function (key, subscriber) {
                    if (subscriber) {
                        try {
                            subscriber.onWidgetKeysChange({sym: symbol, exg: exchange, inst: insType});
                        } catch (e) {
                            utils.logger.logError(e);
                        }
                    }
                });
            }

            if (containerController && Ember.$.isFunction(containerController.saveSettings)) {
                containerController.saveSettings(symbol, exchange, insType);
            }
        } else {
            containerController.onSymbolChanged(symbol, exchange, insType);
        }
    };

    var languageChanged = function (language) {
        if (languageSubscription) {
            Ember.$.each(languageSubscription, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.languageChanged)) {
                    subscriber.languageChanged(language);
                }
            });
        }
    };

    var themeChanged = function (theme) {
        if (themeSubscription) {
            Ember.$.each(themeSubscription, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.themeChanged)) {
                    subscriber.themeChanged(theme);
                }
            });
        }
    };

    var onVisibilityChanged = function (isHidden) {
        if (visibilityChangeSubscription) {
            Ember.$.each(visibilityChangeSubscription, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onVisibilityChanged)) {
                    subscriber.onVisibilityChanged(isHidden);
                }
            });
        }

        onOrientationChanged();
    };

    var onWorkspaceUpdated = function () {
        if (workspaceUpdatedSubscription && Ember.$.isFunction(workspaceUpdatedSubscription.onWorkspaceUpdated)) {
            workspaceUpdatedSubscription.onWorkspaceUpdated();
        }
    };

    var onAppClose = function () {
        Ember.$.each(onAppCloseSubscription, function (id, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onAppClose)) {
                subscriber.onAppClose();
            }
        });
    };

    var onExchangeChanged = function (link, exg, subMkt) {
        if (exchangeSubscriptionMap[link]) {
            Ember.$.each(exchangeSubscriptionMap[link], function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onWidgetKeysChange)) {
                    subscriber.onWidgetKeysChange({
                        exg: exg,
                        subMarket: subMkt
                    });
                }
            });
        }
    };

    var onSubMarketChanged = function (link, subMkt) {
        if (subMarketSubscriptionMap[link]) {
            Ember.$.each(subMarketSubscriptionMap[link], function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onWidgetKeysChange)) {
                    subscriber.onWidgetKeysChange({
                        subMarket: subMkt
                    });
                }
            });
        }
    };

    var onOrientationChanged = function () {
        var angle = 0;

        if (!Ember.isIos && screen && screen.orientation && screen.orientation.angle !== undefined) {
            angle = screen.orientation.angle;
        } else if (window && window.orientation !== undefined) {
            // iOS specific
            angle = window.orientation;
        }

        var isLandscape = angle === 90 || angle === -90 || angle === 270;

        if (Ember.appGlobal.orientation.isLandscape !== isLandscape) {
            Ember.appGlobal.orientation.isLandscape = isLandscape;

            if (orientationSubscriptions) {
                Ember.$.each(orientationSubscriptions, function (id, subscriber) {
                    if (subscriber && Ember.$.isFunction(subscriber.onOrientationChanged)) {
                        subscriber.onOrientationChanged(isLandscape);
                    }
                });
            }
        }
    };

    var onDomReady = function () {
        Ember.appGlobal.events.isDomReady = true;

        if (onDomReadySubscriptions) {
            Ember.$.each(onDomReadySubscriptions, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onDomReady)) {
                    subscriber.onDomReady();
                }
            });
        }
    };

    var onWindowResize = function () {
        if (onWindowResizeSubscriptions) {
            Ember.$.each(onWindowResizeSubscriptions, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onResize)) {
                    subscriber.onResize();
                }
            });
        }
    };

    var subscribeWindowResize = function (subscriber, key) {
        onWindowResizeSubscriptions[key] = subscriber;
    };

    var unSubscribeWindowResize = function (key) {
        if (utils.validators.isAvailable(key)) {
            onWindowResizeSubscriptions[key] = undefined;
        }
    };

    var subscribeSymbolChanged = function (key, subscriber, link) {
        if (link !== undefined) {
            if (link !== 0) {
                symbolSubscriptionMap[link] = symbolSubscriptionMap[link] || {};
                symbolSubscriptionMap[link][key] = subscriber;
            }
        } else {
            containerController = subscriber;
        }
    };

    var unSubscribeSymbolChanged = function (key, link) {
        if (link !== undefined) {
            if (link !== 0) {
                symbolSubscriptionMap[link] = symbolSubscriptionMap[link] || {};
                symbolSubscriptionMap[link][key] = undefined;
            }
        } else {
            containerController = undefined;
        }
    };

    var subscribeLanguageChanged = function (subscriber, key) {
        if (utils.validators.isAvailable(key)) {
            languageSubscription[key] = subscriber;
        }
    };

    var unSubscribeLanguageChanged = function (key) {
        if (utils.validators.isAvailable(key)) {
            languageSubscription[key] = undefined;
        }
    };

    var subscribeThemeChanged = function (subscriber, key) {
        if (utils.validators.isAvailable(key)) {
            themeSubscription[key] = subscriber;
        }
    };

    var unSubscribeThemeChanged = function (key) {
        if (utils.validators.isAvailable(key)) {
            themeSubscription[key] = undefined;
        }
    };

    var subscribeVisibilityChanged = function (subscriber, key) {
        if (utils.validators.isAvailable(key)) {
            visibilityChangeSubscription[key] = subscriber;
        }
    };

    var unSubscribeVisibilityChanged = function (key) {
        if (utils.validators.isAvailable(key)) {
            visibilityChangeSubscription[key] = undefined;
        }
    };

    var subscribeWorkspaceUpdated = function (key, subscriber) {
        if (utils.validators.isAvailable(key)) {
            workspaceUpdatedSubscription[key] = subscriber;
        }
    };

    var unSubscribeWorkspaceUpdated = function (key) {
        if (utils.validators.isAvailable(key)) {
            workspaceUpdatedSubscription[key] = undefined;
        }
    };

    var subscribeAppClose = function (key, subscriber) {
        onAppCloseSubscription[key] = subscriber;
    };

    var subscribeExchangeChanged = function (link, key, subscriber) {
        var linkCode = link;

        if (utils.validators.isAvailable(key)) {
            if (!utils.validators.isAvailable(link)) {
                linkCode = -1;
            }

            exchangeSubscriptionMap[linkCode] = exchangeSubscriptionMap[linkCode] || {};
            exchangeSubscriptionMap[linkCode][key] = subscriber;
        }
    };

    var unSubscribeExchangeChanged = function (link, key) {
        if (utils.validators.isAvailable(link) && utils.validators.isAvailable(key)) {
            exchangeSubscriptionMap[link][key] = undefined;
        }
    };

    var subscribeSubMarketChanged = function (link, key, subscriber) {
        var linkCode = link;

        if (utils.validators.isAvailable(key)) {
            if (!utils.validators.isAvailable(link)) {
                linkCode = -1;
            }

            subMarketSubscriptionMap[linkCode] = subMarketSubscriptionMap[linkCode] || {};
            subMarketSubscriptionMap[linkCode][key] = subscriber;
        }
    };

    var unSubscribeSubMarketChanged = function (link, key) {
        if (utils.validators.isAvailable(link) && utils.validators.isAvailable(key)) {
            subMarketSubscriptionMap[link][key] = undefined;
        }
    };

    var subscribeLayoutReady = function (key, subscriber) {
        layoutReadySubscriptions[key] = subscriber;
    };

    var onLayoutReady = function (appLayout) {
        Ember.appGlobal.events.isLayoutReady = true;

        Ember.$.each(layoutReadySubscriptions, function (key, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onLayoutReady)) {
                subscriber.onLayoutReady(appLayout);
            }
        });

        layoutReadySubscriptions = {};
    };

    var subscribeOrientationChanged = function (key, subscriber) {
        if (utils.validators.isAvailable(key)) {
            orientationSubscriptions[key] = subscriber;
        }
    };

    var unSubscribeOrientationChanged = function (key) {
        if (utils.validators.isAvailable(key)) {
            orientationSubscriptions[key] = undefined;
        }
    };

    var subscribeDomReady = function (key, subscriber) {
        if (utils.validators.isAvailable(key)) {
            onDomReadySubscriptions[key] = subscriber;
        }
    };

    var unSubscribeDomReady = function (key) {
        if (utils.validators.isAvailable(key)) {
            onDomReadySubscriptions[key] = undefined;
        }
    };

    // ////////////////////////////////////////////////////////////////////////////////////////

    /* *
     * Subscribe for an event
     * @param event Event name
     * @param key Unique identifier for the subscriber
     * @param subscriber Subscriber instance
     */
    var subscribeEvent = function (event, key, subscriber) {
        if (!eventSubscriberMap[event]) {
            eventSubscriberMap[event] = {};
        }

        eventSubscriberMap[event][key] = subscriber;
    };

    /* *
     * UnSubscribe from an event
     * @param event Event name
     * @param key Unique identifier for the subscriber
     */
    var unSubscribeEvent = function (event, key) {
        if (eventSubscriberMap[event]) {
            eventSubscriberMap[event][key] = undefined;
        }
    };

    /* *
     * Trigger event
     * @param event Event name
     * @param args Arguments to pass to triggering event
     */
    var triggerEvent = function (event, args) {
        var subscribers = eventSubscriberMap[event];

        if (subscribers) {
            Ember.$.each(subscribers, function (key, subscriber) {
                if (subscriber) {
                    var callbackFn = subscriber[event];

                    if (Ember.$.isFunction(callbackFn)) {
                        callbackFn.apply(subscriber, args);
                    }
                }
            });
        }
    };

    return {
        onSymbolChanged: onSymbolChanged,
        languageChanged: languageChanged,
        themeChanged: themeChanged,
        subscribeSymbolChanged: subscribeSymbolChanged,
        subscribeLanguageChanged: subscribeLanguageChanged,
        subscribeThemeChanged: subscribeThemeChanged,
        unSubscribeSymbolChanged: unSubscribeSymbolChanged,
        unSubscribeLanguageChanged: unSubscribeLanguageChanged,
        unSubscribeThemeChanged: unSubscribeThemeChanged,
        subscribeVisibilityChanged: subscribeVisibilityChanged,
        unSubscribeVisibilityChanged: unSubscribeVisibilityChanged,
        onVisibilityChanged: onVisibilityChanged,
        onWorkspaceUpdated: onWorkspaceUpdated,
        subscribeWorkspaceUpdated: subscribeWorkspaceUpdated,
        unSubscribeWorkspaceUpdated: unSubscribeWorkspaceUpdated,
        subscribeAppClose: subscribeAppClose,
        onAppClose: onAppClose,
        onExchangeChanged: onExchangeChanged,
        onSubMarketChanged: onSubMarketChanged,
        subscribeExchangeChanged: subscribeExchangeChanged,
        subscribeSubMarketChanged: subscribeSubMarketChanged,
        unSubscribeExchangeChanged: unSubscribeExchangeChanged,
        unSubscribeSubMarketChanged: unSubscribeSubMarketChanged,
        subscribeLayoutReady: subscribeLayoutReady,
        onLayoutReady: onLayoutReady,
        onOrientationChanged: onOrientationChanged,
        subscribeOrientationChanged: subscribeOrientationChanged,
        unSubscribeOrientationChanged: unSubscribeOrientationChanged,
        onDomReady: onDomReady,
        subscribeDomReady: subscribeDomReady,
        unSubscribeDomReady: unSubscribeDomReady,
        onWindowResize: onWindowResize,
        subscribeWindowResize: subscribeWindowResize,
        unSubscribeWindowResize: unSubscribeWindowResize,
        // ---
        subscribeEvent: subscribeEvent,
        unSubscribeEvent: unSubscribeEvent,
        triggerEvent: triggerEvent
    };
})();
