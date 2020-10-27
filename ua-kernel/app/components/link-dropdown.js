import Ember from 'ember';
import BootstrapDropdownSelect from './bootstrap-dropdown-select';
import languageDataStore from '../models/shared/language/language-data-store';
import appEvents from '../app-events';

export default BootstrapDropdownSelect.extend({
    layoutName: 'components/link-dropdown',
    subscriptionKey: 'linkDropDown',

    initializeLinkDropDown: function () {
        appEvents.subscribeLanguageChanged(this, this.get('subscriptionKey'));
        this._setLinkLabels();
    }.on('init'),

    languageChanged: function () {
        this._setLinkLabels();
    },

    _setLinkLabels: function () {
        var linkList = this.get('options');
        var app = languageDataStore.getLanguageObj();

        if (linkList) {
            Ember.$.each(linkList, function (index, item) {
                var lanKey = 'link_' + item.code;
                item.name = app.lang.labels[lanKey];
            });
        }
    },

    actions: {
        loadLinkDropDownList: function () {
            var viewName = 'components/link-dropdown-list';
            var instanceName = 'component:link-dropdown-list';

            this.createDropDown(viewName, instanceName);
        }
    }
});
