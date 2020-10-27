import Ember from 'ember';
import utils from '../../../../../utils/utils';

export default Ember.Component.extend({
    layoutName: 'price/widgets/announcement/components/announcement-context-menu',

    didInsertElement: function () {
        if (this.get('noneOption')) {
            try {
                var that = this;
                var mainDiv = this.$('div#container');
                var tops = mainDiv[0].children;
                var noneOptionId = this.getIndexOfNoneOption();

                if (noneOptionId !== undefined) {
                    tops[noneOptionId].children[0].children[0].children[0].onclick = function () {
                        that.checkSelectedValue(this.checked, this.name);
                    }
                }
            } catch (e) {
                utils.logger.logError('Error in Announcement Context Menu when trying to access checkbox (None option code - ' + this.get('noneOption') + ') - ' + e);
            }
        }
    },

    getIndexOfNoneOption: function () {
        var indexOfNoneOption = undefined;
        var noneOptionId = this.get('noneOption');
        var options = this.get('columns');

        if (options) {
            Ember.$.each(options, function (index, field) {
                if (field.code === noneOptionId) {
                    indexOfNoneOption = index;
                    return false;
                }
            });
        }

        return indexOfNoneOption;
    },

    checkSelectedValue: function (isChecked, id) {
        var noneOption = this.get('noneOption');
        var options = this.get('columns');

        if (noneOption && options) {
            if (id === noneOption) {
                Ember.$.each(options, function (index, field) {
                    if (id !== field.code) {
                        Ember.set(field, 'isSelected', false);
                        Ember.set(field, 'disableClass', isChecked ? 'pointer-disable' : '');
                    }
                });
            }
        }
    },

    click: function (event) {
        var target = Ember.$(event.target);

        if (!target.hasClass('btn')) {
            event.stopPropagation();
        }
    },

    actions: {
        save: function (item) {
            this.sendAction('saveAction', item);
        },

        cancel: function (item) {
            this.sendAction('cancelAction', item);
        }
    }
});
