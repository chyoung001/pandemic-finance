# Pandemic Finance

**2020–2023년 팬데믹이 금융시장에 남긴 8개 사건의 데이터 저널리즘 스크롤리텔링**

COVID-19 대폭락부터 FTX 파산까지, 37개월의 금융 드라마를 외부 시장 데이터로 재구성하고 한국어 신문 기사 톤으로 풀어낸 정적 사이트입니다. Python으로 데이터를 수집·처리·시각화해 PNG 프레임을 만들고, 브라우저가 이를 7프레임(Prologue → Act 1–5 → Summary) 스크롤리텔링으로 이어 보여줍니다.

- **기간**: 2020.01 – 2023.05
- **사건 수**: 6 + 사이드 2 = 8개
- **배포**: GitHub Pages (정적 호스팅)
- **데이터 출처**: FRED · Yahoo Finance · CoinGecko

---

## 프로젝트 구조

```
pandemic-finance/
├── index.html          # 단일 페이지. 해시 라우팅 (#/ · #/event/eXX · #/comic/eXX)
├── app.js              # 라우팅 + 모든 렌더링 로직
├── styles.css          # 테마 변수, 스크롤리텔링 전환
├── data/
│   ├── events.js       # window.PF_EVENTS — 이벤트 본문/메타
│   ├── comics.js       # window.PF_COMICS — 보너스 만화 (현재 e02)
│   └── figures/        # Python이 생성한 프레임 PNG (커밋됨)
├── image/              # 카드 썸네일(step/side), 만화 이미지(comics/)
├── notebooks/          # 데이터 수집 1개 + 이벤트별 시각화 8개
├── utils/              # config.py, data_loader.py
├── requirements.txt
└── .gitignore          # data/raw/, data/processed/ 제외
```

`data/raw/`, `data/processed/`는 `.gitignore`에 포함돼 저장소에 없습니다. 파이프라인 재실행 시 로컬에 생성되며, 커밋된 `data/figures/` 덕분에 수집 없이도 웹은 바로 확인할 수 있습니다.

---

## 데이터 처리 파이프라인

### 흐름도

```
┌──────────────────────────────┐
│  외부 API                    │
│  · FRED (거시 지표)          │
│  · Yahoo Finance (주식·암호) │
│  · CoinGecko (선택)          │
└───────────────┬──────────────┘
                │  notebooks/01_data_collection.ipynb
                ▼
┌──────────────────────────────┐
│  data/raw/*.csv              │  로컬 캐시 (gitignore)
└───────────────┬──────────────┘
                │  notebooks/02~09_*_viz.ipynb
                │   (처리 · 정규화 · matplotlib 차트)
                ▼
┌──────────────────────────────┐
│  data/figures/e{N}_story/    │
│    00_prologue.png           │
│    01_act1.png               │
│    …                          │
│    05_act5.png               │
│    99_summary.png            │
└───────────────┬──────────────┘
                │  <img src="data/figures/..."> 로 참조
                ▼
┌──────────────────────────────┐
│  Browser (index.html)        │
└──────────────────────────────┘
```

### 단계별 상세

#### 1단계 — 수집

[notebooks/01_data_collection.ipynb](notebooks/01_data_collection.ipynb)

- FRED에서 거시 지표 10종(CPI, FedFundsRate, WTI, 연준 자산 등)을 `fredapi`로 수집
- Yahoo Finance에서 티커 8종(SP500, VIX, GME, AMC, COIN, ARKK, BTC-USD, ETH-USD 등)을 `yfinance`로 수집
- 결과를 `../data/raw/<name>.csv`로 저장
- 이후 시각화 노트북들은 이 로컬 CSV만 읽으므로 외부 호출 없이 반복 실행 가능

[utils/data_loader.py](utils/data_loader.py)의 `fetch_fred(series_id, start_date, end_date)`가 FRED 래퍼를 제공합니다. [utils/config.py](utils/config.py)에는 자산 분류(`PRICE_ASSETS` / `PERCENT_ASSETS`)와 이벤트 메타데이터가 정의돼 있습니다.

#### 2단계 — 시각화

`notebooks/02_*_viz.ipynb` ~ `09_*_viz.ipynb` (이벤트당 1개)

각 노트북은 하나의 사건을 맡아 **Prologue → Act 1–5 → Summary**의 6~7프레임을 PNG로 렌더링합니다. 공통 패턴:

```python
FIG_DIR = ROOT / 'data' / 'figures' / 'e{N}_story'
# … matplotlib 차트 구성 …
fig.savefig(FIG_DIR / f'{frame}.png', dpi=140, bbox_inches='tight', facecolor='white')
```

시각적 원칙:
- 듀얼 축 회피, 패널 분리
- 전체 기간은 회색 디밍, 해당 Act만 하이라이트
- Act당 핵심 주석 2~3개만 표시

#### 3단계 — 웹 소비

[index.html](index.html) → [app.js](app.js)

[data/events.js](data/events.js)의 각 이벤트 객체가 `folder`와 `phases[].frame` 필드를 통해 PNG 경로를 조합합니다:

```
data/figures/{folder}/{frame}.png
```

### 이벤트 맵

| ID  | 노트북                              | 사건                     | 시점    | figures 폴더    |
|-----|-------------------------------------|--------------------------|---------|-----------------|
| e01 | 02_event01_story_viz                | COVID 대폭락             | 2020.03 | `e01_story/`    |
| e02 | 03_event02_oil_negative_viz         | WTI 마이너스 유가        | 2020.04 | `e02_story/`    |
| e03 | 04_event03_vaccine_viz              | 화이자 백신 발표         | 2020.11 | `e03_story/`    |
| eA  | 05_sideA_coinbase_viz               | 코인베이스 상장 (사이드) | 2021.04 | `eA_story/`     |
| e04 | 06_event04_inflation_btc_viz        | 인플레이션 + BTC ATH     | 2021.11 | `e04_story/`    |
| e05 | 07_event05_russia_ukraine_viz       | 러-우 전쟁               | 2022.02 | `e05_story/`    |
| e06 | 08_event06_fed_tightening_viz       | Fed 긴축                 | 2022–23 | `e06_story/`    |
| e07 | 09_event07_ftx_viz                  | FTX 파산                 | 2022.11 | `e07_story/`    |

### 파일명 계약 (Python ↔ Web)

Python의 `savefig` 경로와 웹의 `<img src>` 경로는 아래 두 키로 묶입니다:

| 레이어               | 위치                                     | 예시                                        |
|----------------------|------------------------------------------|---------------------------------------------|
| events.js `folder`   | `window.PF_EVENTS[i].folder`             | `"e01_story"`                               |
| phases `frame`       | `window.PF_EVENTS[i].phases[j].frame`    | `"00_prologue"`                             |
| 최종 경로            | `data/figures/{folder}/{frame}.png`      | `data/figures/e01_story/00_prologue.png`    |

→ 차트를 교체하려면 해당 PNG만 같은 경로에 덮어쓰면 됩니다. 웹 측 코드 수정은 필요하지 않습니다.

---

## 설치와 실행

### 1. FRED API 키 발급

[https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)에서 무료로 발급받은 뒤 프로젝트 루트에 `.env` 파일을 만듭니다:

```
FRED_API_KEY=your_key_here
```

### 2. Python 의존성 설치

```bash
pip install -r requirements.txt
pip install fredapi python-dotenv
```

> `requirements.txt`에 `fredapi`, `python-dotenv`가 누락돼 있어 별도 설치가 필요합니다.

### 3. 파이프라인 실행

```bash
jupyter notebook
```

권장 실행 순서:

1. `notebooks/01_data_collection.ipynb` — `data/raw/` CSV 생성 (외부 API 호출, 1회)
2. `notebooks/02_event01_story_viz.ipynb` ~ `09_event07_ftx_viz.ipynb` — 각 이벤트의 `data/figures/e{N}_story/*.png` 갱신

2단계는 이벤트 간 독립이므로 일부만 재렌더링해도 됩니다.

### 4. 웹 로컬 서빙

```bash
python -m http.server 8000
```

브라우저에서 [http://localhost:8000/](http://localhost:8000/) 접속.

---

## 기술 스택

**데이터 파이프라인**
- Python 3.9+
- pandas 2.2.3, numpy 2.0.2
- yfinance 0.2.50, fredapi
- matplotlib 3.9.2, seaborn 0.13.2
- Jupyter 1.1.1

**웹 (프레임워크 없음)**
- 바닐라 JavaScript, 해시 기반 SPA 라우팅
- 정적 호스팅 (GitHub Pages)
- 폰트: Pretendard · Source Serif 4 · Inter · JetBrains Mono

---

## 편집 가이드

- **기사 본문 수정**: [data/events.js](data/events.js)의 `phases[].narrative` 배열 편집
- **차트 교체**: 해당 노트북 재실행 → 같은 경로에 PNG 덮어쓰기
- **만화 추가**: [data/comics.js](data/comics.js)의 `window.PF_COMICS`에 이벤트 ID로 블록 배열 추가, 이미지는 `image/comics/{eventId}/`에 배치
- **새 이벤트 추가**: ① `data/events.js`에 객체 추가 → ② `notebooks/`에 새 시각화 노트북 → ③ `data/figures/e{N}_story/` 생성
