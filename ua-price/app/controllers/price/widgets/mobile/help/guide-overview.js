import BaseController from '../../../../base-controller';

export default BaseController.extend({
    title: '',
    isBackToPrev: true,

    onLoadWidget: function () {
        this.set('title', this.get('app').lang.labels.summary);
    }
});