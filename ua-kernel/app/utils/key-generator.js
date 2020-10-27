import utils from '../utils/utils';

export default (function () {
    var getKey = function (exchange, symbol) {
        return [exchange, utils.Constants.StringConst.Tilde, symbol].join('');
    };

    return {
        getKey: getKey
    };
})();