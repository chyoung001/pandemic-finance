# Data loader module

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from fredapi import Fred

# 프로젝트 루트의 .env 자동 로드 (utils/ → 상위 디렉토리)
load_dotenv(Path(__file__).resolve().parent.parent / '.env', override=True)

FRED_API_KEY = os.environ.get('FRED_API_KEY')
if not FRED_API_KEY or FRED_API_KEY == 'your_fred_api_key_here':
    raise RuntimeError(
        "FRED_API_KEY가 설정되지 않았습니다. "
        "https://fred.stlouisfed.org/docs/api/api_key.html 에서 키를 발급받아 "
        "프로젝트 루트의 .env 파일에 `FRED_API_KEY=<키>` 형식으로 저장하세요."
    )

fred = Fred(api_key=FRED_API_KEY)

def fetch_fred(series_id, start_date, end_date):
    """
    FRED에서 시계열 데이터를 가져옵니다.
    
    Parameters:
    series_id (str): FRED 시리즈 ID
    start_date (str): 시작 날짜 (YYYY-MM-DD)
    end_date (str): 종료 날짜 (YYYY-MM-DD)
    
    Returns:
    pd.DataFrame: 날짜 인덱스와 값 컬럼
    """
    try:
        data = fred.get_series(series_id, start_date, end_date)
        df = pd.DataFrame(data, columns=[series_id])
        df.index.name = 'date'
        return df
    except Exception as e:
        print(f"Error fetching {series_id}: {e}")
        return pd.DataFrame()