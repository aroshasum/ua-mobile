import Ember from 'ember';
import sharedService from '../../models/shared/shared-service';
import utils from '../../utils/utils';
import ControllerFactory from '../../controllers/controller-factory';
import priceConstants from '../../models/price/price-constants';

export default Ember.Object.extend({
    subscriptionKey: 'priceUI',
    priceService: {},
    sharedUIService: {},
    bidOfferSubscriptionWidgets: {},
    container: undefined,
    defaultComponent: undefined,

    initialize: function (appLanguage) {
        this.set('app', appLanguage);
        this.sharedUIService = sharedService.getService('sharedUI');

        this.set('priceService', sharedService.getService('price'));
        this.priceService.subscribeAuthSuccess(this, this.subscriptionKey);
    },

    onLayoutReady: function (appLayout) {
        this.initializeComponents(appLayout);
    },

    initializeComponents: function (appLayout) {
        this.container = appLayout;
        appLayout.container.lookupFactory('controller:price/widgets/announcement/components/titlebar-news-announcement').create({priceService: sharedService.getService('price')}).initialize();

        // this.setTitleBarDefaultComponent(); // TODO [ATHEESAN] Enable this to show delayed message in title-bar
    },

    // Exposed to do things on price authentication success
    onAuthSuccess: function () {
        // this.setDelayedExgMessage(); // TODO [ATHEESAN] Enable this to show delayed message in title-bar
    },

    setTitleBarDefaultComponent: function () {
        var titleBar = this.sharedUIService.getTitleBar();
        var defaultComponent = this.get('container').container.lookupFactory('component:single-message-viewer').create();

        if (defaultComponent && titleBar && titleBar.setDefaultComponent) {
            titleBar.setDefaultComponent('components/single-message-viewer', defaultComponent);
            this.set('defaultComponent', defaultComponent);
        }
    },

    setDelayedExgMessage: function () {
        var userExgList = sharedService.getService('price').userDS.get('userExchg');
        var isDelayedExgAvailable = false;

        Ember.$.each(userExgList, function (key, userExg) {
            var delayedExg = sharedService.getService('price').userDS.get('delayedExchg');

            if (delayedExg.length > 0) {
                if (delayedExg.indexOf(userExg) > -1) {
                    isDelayedExgAvailable = true;

                    return false; // To break the loop
                }
            }
        });

        var defaultComponent = this.get('defaultComponent');

        if (defaultComponent && isDelayedExgAvailable) {
            var message = sharedService.userSettings.currentLanguage === 'AR' ? this.get('app').lang.messages.delayedExgTime + ' \'d\'' :
            '\'d\' ' + this.get('app').lang.messages.delayedExgTime;

            defaultComponent.set('message', message);
            defaultComponent.set('showMessage', true);
        }
    },

    notifyAlertTrigger: function (alert) {
        var separatorSpace = ' ';
        var separatorColon = ' : ';
        var alertTriggered = this.get('app') ? this.get('app').lang.labels.alerts : '';
        var messageInitial = [alert.dispProp1, this.get('app').lang.labels[alert.param], alert.crit, alert.val].join(separatorSpace);
        var message = [alertTriggered, messageInitial].join(separatorColon);

        utils.messageService.showMessage(message,
            utils.Constants.MessageTypes.Info,
            false,
            alertTriggered
        );
    },

    notifyAddToWatchList: function (symbol, watchListName, isAlreadyAdded) {
        var layoutName = 'components/single-message-viewer';
        var messageComponent = this.sharedUIService.getService('single-message-viewer');
        var titleBar = this.sharedUIService.getTitleBar();
        var stockObj = sharedService.getService('price').stockDS.getStock(symbol.exg, symbol.sym);

        var messageDesc = isAlreadyAdded ? this.get('app').lang.messages.symAddedAlready + watchListName : this.get('app').lang.messages.symAddedSuccess + watchListName;
        var message = stockObj.get('dispProp1') + ' ' + messageDesc;

        if (messageComponent && titleBar && titleBar.renderNotificationTemplate) {
            messageComponent.set('message', message);
            messageComponent.set('showMessage', true);
            messageComponent.set('messageCss', 'title-info-message');
            messageComponent.set('type', utils.Constants.MessageTypes.Info);
            titleBar.renderNotificationTemplate(layoutName, messageComponent, false, priceConstants.TimeIntervals.AlertNotificationInterval);
        }
    },

    notifyDeleteFromWatchList: function (symbol, watchListName) {
        var layoutName = 'components/single-message-viewer';
        var messageComponent = this.sharedUIService.getService('single-message-viewer');
        var titleBar = this.sharedUIService.getTitleBar();
        var stockObj = sharedService.getService('price').stockDS.getStock(symbol.exg, symbol.sym);
        var message = [stockObj.get('dispProp1'), this.get('app').lang.messages.symDeletedForm, watchListName].join(' ');

        if (messageComponent && titleBar && titleBar.renderNotificationTemplate) {
            messageComponent.set('message', message);
            messageComponent.set('showMessage', true);
            messageComponent.set('messageCss', 'title-info-message');
            messageComponent.set('type', utils.Constants.MessageTypes.Info);
            titleBar.renderNotificationTemplate(layoutName, messageComponent, false, priceConstants.TimeIntervals.AlertNotificationInterval);
        }
    },

    notifyAddToPortfolio: function (symbol, isAlreadyAdded) {
        var layoutName = 'components/single-message-viewer';
        var messageComponent = this.sharedUIService.getService('single-message-viewer');
        var titleBar = this.sharedUIService.getTitleBar();
        var stockObj = sharedService.getService('price').stockDS.getStock(symbol.exg, symbol.sym);

        var messageDesc = isAlreadyAdded ? this.get('app').lang.messages.symAddedPortfolioAlready : this.get('app').lang.messages.symAddedPortfolioSuccess;
        var message = stockObj.get('dispProp1') + ' ' + messageDesc;

        if (messageComponent && titleBar && titleBar.renderNotificationTemplate) {
            messageComponent.set('message', message);
            messageComponent.set('showMessage', true);
            messageComponent.set('messageCss', 'title-info-message');
            messageComponent.set('type', utils.Constants.MessageTypes.Info);
            titleBar.renderNotificationTemplate(layoutName, messageComponent, false, priceConstants.TimeIntervals.AlertNotificationInterval);
        }
    },

    onBidOfferChanged: function (isBid, link) {
        if (link) {
            var bidOfferSubscriptionWidgets = this.get('bidOfferSubscriptionWidgets');
            var subscribersByLink = bidOfferSubscriptionWidgets ? bidOfferSubscriptionWidgets[link] : '';

            if (subscribersByLink) {
                Ember.$.each(subscribersByLink, function (id, subscriber) {
                    if (subscriber && Ember.$.isFunction(subscriber.onBidOfferChanged)) {
                        subscriber.onBidOfferChanged({
                            isBid: isBid
                        });
                    }
                });
            }
        }
    },

    subscribeBidOfferChanged: function (subscriber, link) {
        if (link) {
            var bidOfferSubscriptionWidgets = this.get('bidOfferSubscriptionWidgets');
            var subscribersForLink = bidOfferSubscriptionWidgets[link];

            if (!subscribersForLink) {
                subscribersForLink = bidOfferSubscriptionWidgets[link] = [];
            }

            subscribersForLink[subscribersForLink.length] = subscriber;
        }
    },

    unSubscribeBidOfferChanged: function (subscriber, link) {
        if (link) {
            var bidOfferSubscriptionWidgets = this.get('bidOfferSubscriptionWidgets');
            var subscribersForLink = bidOfferSubscriptionWidgets[link];

            if (subscribersForLink && subscriber) {
                Ember.$.each(subscribersForLink, function (index, widget) {
                    if (subscriber === widget) {
                        subscribersForLink[index] = null;
                    }
                });
            }

            if (bidOfferSubscriptionWidgets[subscriber.wkey]) {
                bidOfferSubscriptionWidgets[subscriber.wkey] = null;
            }
        }
    },

    showPopupWidget: function (config, args) {
        var symbolPopupView = ControllerFactory.createController(config.container, config.controllerString);
        symbolPopupView.show(args.tabId, args.sym, args.exg, args.inst);

        // Close menu
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');
        modal.send('closeModalPopup');
    }
});
