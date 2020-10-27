import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    myFavouritesIndex: 0,
    myFavouritesKey: 'myFavourites',
    customWatchListKey: 'customWL',
    customWatchListArray: Ember.A([]),
    customWatchListColumnArray: Ember.A([{id: 0, name: 'My Favourites', classicColumnArray: Ember.A(), defaultColumnArray: Ember.A()}]),

    watchListTypes: {
        fullMarket: 'fullMarket',
        customWL: 'customWL',
        portfolio: 'portfolio'
    },

    loadCustomWatchLists: function () {
        return this.priceService.priceUserData[this.customWatchListKey];
    },

    initializeCustomColumnArray: function (widgetArgsKey) {
        var columnState = sharedService.userState.getWidgetState(widgetArgsKey);

        if (columnState && columnState.customWatchListColumnArray) {
            this.set('customWatchListColumnArray', columnState.customWatchListColumnArray);
        }
    },

    getCustomWLArray: function () {
        return this.get('customWatchListArray');
    },

    getCustomWatchListColumnArray: function () {
        return this.get('customWatchListColumnArray');
    },

    initializeCustomWL: function () {
        var customWatchListArray = this.get('customWatchListArray');

        if (customWatchListArray.length === 0) {
            var savedCustomWL = this.loadCustomWatchLists();
            var favouriteData = {id: this.get('myFavouritesIndex'), key: this.get('myFavouritesKey'), stkArray: Ember.A()};

            if (savedCustomWL) {
                if (savedCustomWL[favouriteData.key] && savedCustomWL[favouriteData.key].key === favouriteData.key) {
                    customWatchListArray.pushObject(savedCustomWL[favouriteData.key]);
                } else {
                    customWatchListArray.pushObject(favouriteData);
                }

                Ember.$.each(savedCustomWL, function (key, custWatchlist) {
                    if (key !== favouriteData.key) {
                        custWatchlist.id = customWatchListArray.length;
                        customWatchListArray[customWatchListArray.length] = custWatchlist;
                    }
                });
            } else {
                customWatchListArray.pushObject(favouriteData);

                if (!utils.validators.isAvailable(savedCustomWL) || !utils.validators.isAvailable(savedCustomWL[favouriteData.key])) {
                    this._removeCustomWlActiveCss(favouriteData);
                }
            }

            if (customWatchListArray && customWatchListArray.length > 0) {
                Ember.$.each(customWatchListArray, function (key, cusWatchlist) {
                    if (cusWatchlist && cusWatchlist.activeClass === 'active') {
                        Ember.set(cusWatchlist, 'activeClass', '');
                    }
                });
            }
        }
    },

    addNewWatchList: function (name) {
        var newWatchList;
        var isWatchListAvailable = false;
        var customWatchLists = this.get('customWatchListArray');

        if (utils.validators.isAvailable(name)) {
            isWatchListAvailable = this.isCustomWatchListAvailable(name, customWatchLists);

            if (!isWatchListAvailable) {
                var newWatchListColumns = this.get('customWatchListColumnArray');
                newWatchList = {id: customWatchLists.length, name: name, stkArray: Ember.A()};

                customWatchLists.insertAt(customWatchLists.length, newWatchList);
                newWatchListColumns.insertAt(newWatchListColumns.length, {id: newWatchListColumns.length, name: name, classicColumnArray: Ember.A(), defaultColumnArray: Ember.A()});

                this._removeCustomWlActiveCss(newWatchList);
            }
        }

        return isWatchListAvailable ? isWatchListAvailable : customWatchLists[customWatchLists.length - 1].id;
    },

    deleteWL: function (watchListId) {
        var customWatchLists = this.get('customWatchListArray');
        var customWatchListColumns = this.get('customWatchListColumnArray');
        var currentCustomWLId = watchListId;
        var myFavouritesIndex = this.get('myFavouritesIndex');
        var that = this;

        if (currentCustomWLId && currentCustomWLId !== myFavouritesIndex && currentCustomWLId < customWatchLists.length) {
            if (customWatchLists[currentCustomWLId]) {
                this._deleteCustomWatchList(customWatchLists[currentCustomWLId].name);
                customWatchLists.removeAt(currentCustomWLId);
            }

            if (customWatchListColumns[currentCustomWLId]) {
                customWatchListColumns.removeAt(currentCustomWLId);
                sharedService.userState.save();
            }

            // Make id and the index same
            Ember.$.each(customWatchLists, function (index, watchlist) {
                if (watchlist) {
                    Ember.set(watchlist, 'id', index);
                    that._removeCustomWlActiveCss(watchlist);
                }
            });

            Ember.$.each(customWatchListColumns, function (index, watchlistColumns) {
                if (watchlistColumns) {
                    Ember.set(watchlistColumns, 'id', index);
                }
            });
        }
    },

    renameCustomWatchList: function (name, currentWatchListId) {
        var customWatchLists = this.get('customWatchListArray');
        var currentCustomWLId = currentWatchListId;
        var myFavouritesIndex = this.get('myFavouritesIndex');
        var isCustomWatchListAvailable = this.isCustomWatchListAvailable(name, customWatchLists);

        if (!isCustomWatchListAvailable && currentCustomWLId && currentCustomWLId !== myFavouritesIndex && currentCustomWLId < customWatchLists.length) {
            var watchList = customWatchLists[currentCustomWLId];
            this._deleteCustomWatchList(watchList.name);

            Ember.set(watchList, 'name', name);
            this._removeCustomWlActiveCss(watchList);
        }

        return !isCustomWatchListAvailable;
    },

    addStocksToCustomWL: function (stock, watchListId) {
        var stockFromStore = this.priceService.stockDS.getStock(stock.exg, stock.sym, stock.inst);
        var watchList = this.get('customWatchListArray')[watchListId];
        var stockArray = watchList.stkArray;
        var watchListName = watchList.name;
        var isStockAlreadyAdded = false;

        Ember.$.each(stockArray, function (id, stockAdded) {
            var stkKey = stockAdded.sym ? (stockAdded.sym + utils.Constants.StringConst.Tilde + stockAdded.exg) : stockAdded.get('key');   // Access method is diff, newly added stk and saved stk

            if (stkKey === stockFromStore.get('key')) {
                isStockAlreadyAdded = true;
                Ember.set(stockAdded, 'isSelected', true);
            } else {
                Ember.set(stockAdded, 'isSelected', false);
            }
        });

        if (isStockAlreadyAdded) {
            sharedService.getService('priceUI').notifyAddToWatchList(stockFromStore, watchListName, true);
        } else {
            Ember.set(stockFromStore, 'isSelected', true);
            stockArray.pushObject(stockFromStore);

            sharedService.getService('priceUI').notifyAddToWatchList(stockFromStore, watchListName);
            this._removeCustomWlActiveCss(watchList);
        }

        this._saveCustomWatchList(watchList.key ? watchList.key : watchList.name, watchList);  // Favourites WL is saved by lang key
    },

    deleteSymbol: function (stock, watchListId) {
        var deletedId = -1;
        var symbolKey = utils.keyGenerator.getKey(stock.exg, stock.sym);
        var customWLId = watchListId;
        var customWatchLists = this.get('customWatchListArray');
        var currentCustomWL = customWatchLists[customWLId];
        var customStockArray = currentCustomWL ? currentCustomWL.stkArray : [];

        Ember.$.each(customStockArray, function (id, stockAdded) {
            var addedStockKey = utils.keyGenerator.getKey(stockAdded.exg, stockAdded.sym);

            if (symbolKey === addedStockKey) {
                deletedId = id;

                return false;
            }
        });

        if (deletedId >= 0) {
            customStockArray.removeAt(deletedId);
            this._removeCustomWlActiveCss(currentCustomWL);

            sharedService.getService('priceUI').notifyDeleteFromWatchList(stock, currentCustomWL.name);
        }
    },

    isCustomWatchListAvailable: function (name, customWatchLists) {
        var isCustomWatchListAvailable = false;
        var customWatchListsArray = customWatchLists ? customWatchLists : this.get('customWatchListArray');

        Ember.$.each(customWatchListsArray, function (id, watchList) {
            if (watchList.name === name || watchList.key === name) {
                isCustomWatchListAvailable = true;
                return false;
            }
        });

        return isCustomWatchListAvailable;
    },

    isSymbolAvailableInCustomWL: function (symbol, customWatchListId) {
        var customWatchListArray = this.get('customWatchListArray');
        var watchlistId = customWatchListId ? customWatchListId : 0;
        var isSymbolAvailable = false;

        if (customWatchListArray && customWatchListArray.length > 0) {
            var symArray = customWatchListArray[watchlistId].stkArray;

            if (symArray && symArray.length > 0) {
                Ember.$.each(symArray, function (key, stock) {
                    if (stock.sym === symbol.sym && stock.exg === symbol.exg) {
                        isSymbolAvailable = true;

                        return false;
                    }
                });
            }
        }

        return isSymbolAvailable;
    },

    _saveCustomWatchList: function (customWLName, customWLObj) {
        var priceUserData = this.priceService.priceUserData;

        if (!priceUserData[this.customWatchListKey]) {
            priceUserData[this.customWatchListKey] = {};
        }

        priceUserData[this.customWatchListKey][customWLName] = customWLObj;
        this.priceService.priceUserData.save();
    },

    _removeCustomWlActiveCss: function (customWL) {
        var isTabSelected = false;

        if (customWL.activeClass === 'active') {
            Ember.set(customWL, 'activeClass', '');
            isTabSelected = true;
        }

        this._saveCustomWatchList(customWL.key ? customWL.key : customWL.name, customWL);  // Favourites WL is saved by lang key

        if (isTabSelected) {
            Ember.set(customWL, 'activeClass', 'active');
        }
    },

    _deleteCustomWatchList: function (customWLName) {
        var priceUserData = this.priceService.priceUserData;

        if (priceUserData[this.customWatchListKey]) {
            delete priceUserData[this.customWatchListKey][customWLName];  // Delete used to prevent growing undefined properties in Local Storage
            this.priceService.priceUserData.save();
        }
    }
});