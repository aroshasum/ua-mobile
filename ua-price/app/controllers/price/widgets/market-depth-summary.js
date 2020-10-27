import QuoteMarketDepth from './quote-market-depth';

export default QuoteMarketDepth.extend({
    clickFn: '',

    actions: {
        onClick: function (bidAsk) {
            var clickFn = this.clickFn;

            if (typeof clickFn === 'function') {
                clickFn(bidAsk);
            }
        }
    }
});