import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

export default Ember.Component.extend({
    isSaveDisabled: true,
    isMobile: appConfig.customisation.isMobile,
    layoutName: 'components/custom-watchlist-dialog',
    priceService: sharedService.getService('price'),
    actionsTypes: {
        addNew: 'addNewWL',
        rename: 'renameWL',
        addNewWithStock: 'addNewWithStock'
    },

    checkEmpty: function () {
        if (utils.validators.isAvailable(this.get('watchListName'))) {
            this.set('isSaveDisabled', false);
        } else {
            this.set('isSaveDisabled', true);
            this.set('isCustomWLExist', false);
        }
    }.observes('watchListName'),

    click: function (event) {
        var target = Ember.$(event.target);

        if (!target.hasClass('btn') || this.get('isCustomWLExist') || this.get('isEmptyName')) {
            event.stopPropagation();
        }
    },

    displayTitle: function () {
        var name = this.get('title') ? this.get('title') : 'createNewWL';
        return this.get('app') ? this.get('app').lang.labels[name] : '';
    }.property(),

    addNewWL: function (name) {
        var watchListId = this.priceService.watchListDS.addNewWatchList(name);
        this.sendAction('customWLCallBack', watchListId);
    },

    renameWL: function (name) {
        this.priceService.watchListDS.renameCustomWatchList(name, this.get('currentCustomWLId'));
        this.sendAction('customWLCallBack');
    },

    addNewWithStock: function (name) {
        var watchListId = this.priceService.watchListDS.addNewWatchList(name);

        if (watchListId) {
            this.priceService.watchListDS.addStocksToCustomWL(this.get('symbol'), watchListId);
            this.sendAction('customWLCallBack', watchListId);
        }
    },

    closePopup: function () {
        if (this.get('isMobile')) {
            var parentController = this.get('targetObject');

            parentController.set('showPopup', false);
            parentController.set('isRenameWL', false);
            parentController.set('isAddNewWL', false);
        } else {
            var modal = sharedService.getService('sharedUI').getService('modalPopupId');

            if (modal) {
                modal.send('closeModalPopup');
            }
        }
    },

    actions: {
        saveWL: function (name) {
            var actionType = this.get('actionType');

            this.set('isCustomWLExist', this.priceService.watchListDS.isCustomWatchListAvailable(name));
            this.set('isEmptyName', name === '');

            if (!this.get('isCustomWLExist') && !this.get('isEmptyName')) {
                if (actionType !== this.actionsTypes.rename) {
                    this.set('watchListName', null);
                }

                switch (actionType) {
                    case this.actionsTypes.addNew:
                        this.addNewWL(name);
                        break;

                    case this.actionsTypes.rename:
                        this.renameWL(name);
                        break;

                    case this.actionsTypes.addNewWithStock:
                        this.addNewWithStock(name);
                        break;

                    default:
                        this.sendAction('saveAction', name);
                        break;
                }

                this.closePopup();
            }
        },

        closePopup: function () {
            this.closePopup();
        }
    }
});
