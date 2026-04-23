"""프로젝트 공통 설정 — 이벤트 메타데이터, 자산 분류."""

# 정규화 대상(가격 계열). True면 2020-01-01 = 100 기준으로 정규화.
PRICE_ASSETS = {
    'SP500', 'VIX', 'WTI', 'FedAssets',
    'GME', 'AMC', 'BBBY', 'TSLA', 'COIN', 'ARKK',
    'BTC-USD', 'ETH-USD',
}

# 퍼센트/지수 지표 — 정규화 제외 (원값 유지)
PERCENT_ASSETS = {
    'CPI', 'FedFundsRate', '10Y2YSpread', 'Unemployment', 'GDP', 'IndustrialProduction',
}

# 이벤트 정의 — (id, 이름, 날짜, 관련 티커, 윈도우 일수)
EVENTS = [
    {'id': 'event_01_covid_crash',   'name': 'COVID-19 증시 폭락',     'date': '2020-03-16', 'tickers': ['SP500', 'VIX'],           'window_days': 30},
    {'id': 'event_02_fed_cut',       'name': '연준 긴급 금리 인하',    'date': '2020-03-15', 'tickers': ['FedFundsRate', 'SP500'],  'window_days': 30},
    {'id': 'event_03_oil_negative',  'name': 'WTI 마이너스 유가',      'date': '2020-04-20', 'tickers': ['WTI'],                    'window_days': 15},
    {'id': 'event_04_vaccine',       'name': '화이자 백신 발표',        'date': '2020-11-09', 'tickers': ['SP500', 'VIX'],           'window_days': 30},
    {'id': 'event_05_gamestop',      'name': '게임스톱 숏스퀴즈',       'date': '2021-01-27', 'tickers': ['GME', 'AMC'],             'window_days': 30},
    {'id': 'event_06_arkk_peak',    'name': 'ARKK 고점',              'date': '2021-02-12', 'tickers': ['ARKK', 'TSLA'],           'window_days': 45},
    {'id': 'event_07_coinbase_ipo', 'name': '코인베이스 상장',         'date': '2021-04-14', 'tickers': ['COIN', 'BTC-USD'],        'window_days': 30},
    {'id': 'event_08_crypto_peak',  'name': '암호화폐 고점',           'date': '2021-11-10', 'tickers': ['BTC-USD', 'ETH-USD'],     'window_days': 45},
    {'id': 'event_09_inflation',    'name': '인플레이션 피크',         'date': '2022-06-10', 'tickers': ['CPI', 'WTI'],             'window_days': 60},
    {'id': 'event_12_bbby',         'name': 'BBBY 파산',              'date': '2023-04-23', 'tickers': ['BBBY'],                   'window_days': 30},
]
