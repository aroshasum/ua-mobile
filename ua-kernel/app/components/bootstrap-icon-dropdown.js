import BootstrapDropdownSelect from './bootstrap-dropdown-select';

export default BootstrapDropdownSelect.extend({
    layoutName: 'components/bootstrap-icon-dropdown',

    iconCss: function () {
        return this.get('iconStyle') ? this.get('iconStyle') : 'icon-gear';
    }.property(),

    _loadDropDownList: function () {
        var viewName = 'components/bootstrap-dropdown-select-list';
        var instanceName = 'component:bootstrap-dropdown-select-list';

        this.createDropDown(viewName, instanceName);
    }
});
