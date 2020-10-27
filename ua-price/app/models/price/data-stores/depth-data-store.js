import depth from '../business-entities/depth';
import utils from '../../../utils/utils';

export default function () {
    var depthStore = {};

    var getDepthItem = function (exchange, symbol, depthType) {
        var key = _getKey(exchange, symbol, depthType);
        var depthObj = depthStore[key];

        if (!depthObj) {
            depthObj = depth.create({
                sym: symbol,
                exg: exchange,
                dt: depthType
            });
            depthStore[key] = depthObj;
        }

        return depthObj;
    };

    var _getKey = function (exchange, symbol, depthType) {
        return [exchange, utils.Constants.StringConst.Tilde, symbol, utils.Constants.StringConst.Tilde, depthType].join('');
    };

    return {
        getDepthItem: getDepthItem
    };
}
