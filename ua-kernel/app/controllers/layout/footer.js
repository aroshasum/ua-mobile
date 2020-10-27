import Ember from 'ember';
import BaseController from '../base-controller';
import ThemeDataStore from '../../models/shared/data-stores/theme-data-store';

export default BaseController.extend({
    toTheme: ThemeDataStore.getChangeThemeObj(),

    actions: {
        changeTheme: function (toTheme) {
            ThemeDataStore.changeTheme(toTheme);
        },

        itemClicked: function () {
            Ember.$().on('shown.bs.modal', function () {
                Ember.$('#myInput').focus();
            });
        }
    }
});
