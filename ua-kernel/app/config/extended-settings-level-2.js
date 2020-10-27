export default {
    appConfig: {
        subscriptionConfig: {
            registrationPath: '/create-account?language=',
            upgradeSubscriptionPath: 'upgrade-account',
            renewSubscriptionPath: 'renew-account',
            daysBeforeExpiration: 7
        }
    },

    priceWidgetConfig: {
        chartIndicators: ['AccumulationDistribution', 'AverageTrueRange', 'BollingerBands', 'ChaikinMF', 'ChandeMomentumOscillator', 'MoneyFlowIndex', 'MovingAverage', 'PSAR', 'RelativeStrengthIndex', 'TimeSeriesForecast', 'TRIX', 'VolOsc', 'WildersSmoothing', 'WilliamsPerR']
    },

    priceSettings: {
        connectionParameters: {
            primary: {
                ip: 'data-sa9.mubasher.net/html5-Retail',
                port: '',
                secure: true
            },

            secondary: {
                ip: 'data-sa9.mubasher.net/html5-Retail',
                port: '',
                secure: true
            }
        }
    }
};
