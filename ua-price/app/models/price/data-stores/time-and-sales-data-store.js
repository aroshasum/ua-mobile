import Ember from 'ember';
import Trade from '../business-entities/trade';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    tradesMapBySymbolExchange: {},
    lastTradeMapByKey: {},
    symSubscriptions: {},

    getNewTrade: function (exchange, symbol, seq) {
        var tradeObj;
        var tradeStore = this.isSubscribed(utils.keyGenerator.getKey(exchange, symbol)) ? this.getTradeCollection(exchange, symbol) : this.isSubscribed(exchange) ? this.getTradeCollection(exchange) : undefined;
        var lastTrade = this.getLastTrade(exchange, symbol);

        if (!lastTrade || (lastTrade.seq < seq)) { // Check real-time path duplications
            if (tradeStore && (tradeStore.isDuplicateRemoved || tradeStore.backlog.length === 0 || tradeStore.backlog[0].seq < seq)) {
                tradeObj = Trade.create({sym: symbol, exg: exchange, seq: seq});

                tradeStore.realTime.unshiftObject(tradeObj);
                tradeStore.isDuplicateRemoved = true;
            }
        } else {
            utils.logger.logError('Realtime path duplicate removed');
        }

        return tradeObj;
    },

    getBacklogTrade: function (exchange, symbol, seq) {
        var tradeObj, tradeStore;

        tradeStore = this.getTradeCollection(exchange, symbol);
        tradeObj = tradeStore.backlog[tradeStore.backlogIndex];

        if (!tradeObj) {
            if (!tradeStore.isFirstBatch || tradeStore.realTime.length === 0 || tradeStore.realTime[0].seq > seq) {
                tradeObj = Trade.create({sym: symbol, exg: exchange, seq: seq});
                tradeStore.backlog[tradeStore.backlogIndex] = tradeObj;
            } else {
                return undefined;
            }
        }

        tradeStore.backlogIndex++;

        return tradeObj;
    },

    getBacklogEmptyRecord: function (exchange, symbol, index) {
        var tradeObj;

        if (exchange) {
            tradeObj = Trade.create({isEmpty: true});
            this.getTradeCollection(exchange, symbol).backlog[index] = tradeObj;
        }

        return tradeObj;
    },

    isSubscribed: function (key) {
        var subscription = this.get('symSubscriptions')[key];

        return subscription && subscription.subsCount > 0;
    },

    getLastTrade: function (exchange, symbol) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var lastTradeStore = this.get('lastTradeMapByKey');
        return lastTradeStore[key];
    },

    setLastTrade: function (exchange, symbol, tradeObj) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var lastTradeStore = this.get('lastTradeMapByKey');
        var lastTrade = lastTradeStore[key];

        if (!lastTrade) {
            lastTrade = tradeObj;
            lastTradeStore[key] = lastTrade;
        }

        if (lastTrade.seq <= tradeObj.seq) {
            lastTradeStore[key] = tradeObj;
        }
    },

    getTradeCollection: function (exchange, symbol) {
        var key = exchange;

        if (symbol !== undefined) {
            key = utils.keyGenerator.getKey(exchange, symbol);
        }

        var currentStore = this.get('tradesMapBySymbolExchange');
        var tradeCollection = currentStore[key];

        if (!tradeCollection) {
            tradeCollection = {};
            currentStore[key] = tradeCollection;

            tradeCollection.realTime = Ember.A([]);
            tradeCollection.backlog = Ember.A([]);
            tradeCollection.backlogLen = 0;
            tradeCollection.backlogIndex = 0;
            tradeCollection.isDuplicateRemoved = false;
            tradeCollection.isFirstBatch = true;
        }

        return tradeCollection;
    },

    subscribeSymTS: function (exg, sym, wkey, controller) {
        var key = exg;

        if (sym !== undefined) {
            key = utils.keyGenerator.getKey(exg, sym);
        }

        var symSubscriptions = this.get('symSubscriptions');
        var subscription = symSubscriptions[key];

        if (!subscription) {
            subscription = {subsCount: 0, subscribers: {}};
            symSubscriptions[key] = subscription;
        }

        subscription.subsCount = subscription.subsCount + 1;
        subscription.subscribers[wkey] = controller;
    },

    unSubscribeSymTS: function (exg, sym, wkey) {
        var subKey = exg;

        if (sym !== undefined) {
            subKey = utils.keyGenerator.getKey(exg, sym);
        }

        var symSubscriptions = this.get('symSubscriptions');

        if (symSubscriptions && symSubscriptions[subKey]) {
            var subscription = symSubscriptions[subKey];

            subscription.subsCount = subscription.subsCount - 1;
            subscription.subscribers[wkey] = undefined;

            if (subscription.subsCount === 0) {
                this._removeTradeCollection(subKey);
            }
        }
    },

    setBacklogLength: function (exg, sym, backlogLen) {
        var tradeCollection = this.getTradeCollection(exg, sym);

        if (tradeCollection && backlogLen > tradeCollection.backlogLen) {
            tradeCollection.backlogLen = backlogLen;
        }
    },

    onBacklogDataReady: function (exg, sym) {
        var key = sym !== undefined ? utils.keyGenerator.getKey(exg, sym) : exg;
        var subscription = this.get('symSubscriptions')[key];

        if (subscription && subscription.subscribers) {
            Ember.$.each(subscription.subscribers, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onBacklogDataReady)) {
                    subscriber.onBacklogDataReady();
                }
            });
        } else if (subscription && !subscription.subscribers) {
            this._removeTradeCollection(key);
        }

        var tradeCollection = this.getTradeCollection(exg, sym);
        tradeCollection.isFirstBatch = false;
    },

    _removeTradeCollection: function (key) {
        var currentStore = this.get('tradesMapBySymbolExchange');

        if (currentStore) {
            currentStore[key] = undefined;
        }
    }
});
