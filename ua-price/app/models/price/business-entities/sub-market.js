import Ember from 'ember';
import languageDataStore from '../../../models/shared/language/language-data-store';

export default Ember.Object.extend({
    marketId: '',
    lDes: '',
    def: '',
    isMktSummary: '',
    stat: '',

    init: function () {
        this._super();
        this.set('app', languageDataStore.getLanguageObj());
    },

    statStr: function () {
        return this.app.lang.labels['mktStatus_' + this.get('stat')]; // Sub Market Status String
    }.property('stat', 'lDes'),

    setData: function (subMktMsg) {
        var that = this;

        Ember.$.each(subMktMsg, function (key, value) {
            that.set(key, value);
        });
    }
});
