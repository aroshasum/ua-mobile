/* *
 * Created by anushkag on 4/19/2016.
 */
import BasePopup from '../components/base-popup';

export default BasePopup.extend({
    initialize: function (wkey, rowData) {
        this.prepareContextMenu(rowData);
        this.bindKeyboardShortcut(wkey);
    },

    prepareContextMenu: function () {
        // Implement in child component
    },

    bindKeyboardShortcut: function () {
        // Will implement in child component
    },

    setMainContextMenuDesc: function () {
        // Will implement in child component
    },

    loadMainContextItem: function () {
        // Will implement in child component
    }
});
