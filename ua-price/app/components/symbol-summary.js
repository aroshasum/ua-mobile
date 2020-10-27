import BaseComponent from './base-component';

export default BaseComponent.extend({
    QuoteSettings: {
        IntZero: 0,
        EmptyString: '',

        Styles: {
            Green: 'up-fore-color',
            DarkGreen: 'up-fore-color',
            Red: 'down-fore-color',
            DarkRed: 'down-fore-color',
            White: 'white',
            UpArrow: 'glyphicon-triangle-top glyphicon ',
            DownArrow: 'glyphicon-triangle-bottom glyphicon '
        }
    },

    changeSign: '',
    perChgCss: '',
    changeCss: '',

    isShowLtp: true,

    didInsertElement: function () {
        this._super();
        this.updatePercentageChangeCss();
    },

    updatePercentageChangeCss: function () {
        var stockObj = this.get('stockObj');

        if (stockObj) {
            var pctChg = stockObj.get('pctChg');
            var changeSign = '';
            var perChgCss = '';
            var changeCss = '';

            if (pctChg > this.QuoteSettings.IntZero) {
                changeSign = this.QuoteSettings.Styles.UpArrow;
                perChgCss = this.QuoteSettings.Styles.Green;
                changeCss = this.QuoteSettings.Styles.DarkGreen;
            } else if (pctChg < this.QuoteSettings.IntZero) {
                changeSign = this.QuoteSettings.Styles.DownArrow;
                perChgCss = this.QuoteSettings.Styles.Red;
                changeCss = this.QuoteSettings.Styles.DarkRed;
            } else {
                changeSign = this.QuoteSettings.EmptyString;
                perChgCss = this.QuoteSettings.Styles.White;
            }

            this.set('changeSign', changeSign);
            this.set('perChgCss', perChgCss);
            this.set('changeCss', changeCss);
        }
    }.observes('stockObj.pctChg')
});