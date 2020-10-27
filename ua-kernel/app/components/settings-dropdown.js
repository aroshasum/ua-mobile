/* *
 * Created by janithal on 2/12/2016.
 */
import BootstrapDropdownSelect from './bootstrap-dropdown-select';

export default BootstrapDropdownSelect.extend({
    layoutName: 'components/settings-dropdown',

    actions: {
        loadSettingsDropDownList: function () {
            var viewName = 'components/settings-dropdown-list';
            var instanceName = 'component:settings-dropdown-list';

            this.createDropDown(viewName, instanceName);
        }
    }
});

