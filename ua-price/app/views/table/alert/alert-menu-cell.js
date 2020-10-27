import ButtonCell from '../button-cell';

export default ButtonCell.extend({
    templateName: 'table/views/alert/alert-menu-cell',

    displayStyle: function () {
        var status = this.get('rowValues.content.status');

        return (status === 'triggered' || status === 'expired') ? 'disable-style' : '';
    }.property('rowValues.content.status')
});