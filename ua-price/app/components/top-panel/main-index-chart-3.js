import MainIndexChart from './main-index-chart';
import layout from '../../templates/components/top-panel/main-index-chart-3';

export default MainIndexChart.extend({
    layout: layout,

    getChartConfig: function () {
        return {
            size: {
                width: 90,
                height: 56
            },
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            },
            axis: {
                x: {show: false},
                y: {show: false}
            }
        };
    }
});