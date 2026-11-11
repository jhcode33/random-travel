# 🎡 랜덤 여행 돌림판

대한민국 지도에서 여행 후보를 고르고, 돌림판으로 여행지를 뽑은 뒤
세부 지역(구·군 또는 읍·면·동)까지 돌림판으로 정하는 정적 웹페이지입니다. 빌드 과정이 없습니다.

## 사용 흐름 (3페이지)
1. **여행 후보 선택** — 일러스트 지도(하늘색 바다, 회색 육지, 흰 경계선)
   - 지도 위 전환 버튼으로 **🎯 후보 고르기 / 🧳 다녀온 곳 표시** 모드를 바꿈
   - 다녀온 곳: 사선 무늬로 표시되고, 후보 선택·무작위 채우기에서 빠짐 (브라우저에 저장되어 다음에도 유지)
   - 후보로 고른 곳은 시·도별 파스텔 색으로 칠해지고, 아래 목록도 같은 색
   - 후보 개수(2~40곳, 기본 10)를 정하고 지도에서 지역을 누르면 후보에 담김 (다시 누르면 빠짐)
   - 선택한 여행지는 **하단 트레이**에 나열. 이름을 누르면 **여행 정보 팝업**
     (여행하기 좋은 시기, 주요 여행지, 대표 먹거리), ×로 해제
   - 개수가 맞으면 **[다음: 여행지 돌림판 →]**
   - 특별시·광역시·세종은 시 전체, 도는 시·군 단위 (예: 전북 전주시, 경북 경주시)
2. **여행지 돌림판** — 돌림판을 돌려 1곳을 뽑고 결과 확인
   - 버튼을 **꾹 누르고 있다가 떼면** 돌아갑니다. 게이지가 클수록 세게 돕니다.
   - 처음엔 빠르게(약 11초) 돌다가 점점 느려지며, 느린 구간(약 30초)이 길게 이어지고 끝에는 아주 천천히 도는 구간이 있습니다.
   - 12시의 핀은 받침에 고정되어 있고, 칸 경계의 기둥이 지나갈 때마다 도는 방향으로 부드럽게 휘었다가 천 자락처럼 끝이 늦게 따라오며 펴집니다. (핀을 곧게 고정하려면 `js/wheel/wheel.js` 의 "핀 움직임 켜기/끄기" 두 줄을 주석 처리)
     마지막 몇 개의 기둥은 간당간당하게 넘어갑니다.
   - 결과는 팝업으로 표시 → **[구·군 / 구 / 읍·면·동 돌림판으로 →]** 또는 페이지 하단 [다음]
3. **세부 지역 돌림판** — 왼쪽 세부 지역 지도, 오른쪽 돌림판
   - 광역시 → 구·군 (예: 대구 달서구, 달성군)
   - 일반구가 있는 시 → 구 (예: 포항시 남구·북구)
   - 그 밖의 시·군·세종 → 읍·면·동 (예: 거창군 거창읍, 가조면 …)
   - 당첨 지역은 지도에서 금색으로 강조·확대되고, **최종 여행지 팝업**이 화면 가운데에 뜸

휴대폰·태블릿에서도 쓸 수 있습니다 (팝업은 하단 시트로 표시).

## 폴더 구조
```
index.html                  화면 마크업 (각 영역이 어느 JS 가 담당하는지 주석)
css/
  base.css                  색상 토큰(지도 육지·바다 색 포함), 헤더, 카드, 버튼
  map.css                   일러스트 지도(육지·경계선·물결 바다), 확대 버튼, 범례, 로딩/오류 안내
  panel.css                 후보 개수 조절, 하단 트레이(선택한 여행지·다음 버튼)
  wheel.css                 돌림판, 결과 카드
  popup.css                 지역 정보 팝업 (넓은 화면: 카드 / 휴대폰: 하단 시트)
  pages.css                 3개 페이지 레이아웃, 이전/다음 버튼 줄
  responsive.css            화면 크기별 조정
data/
  korea-municipalities.topo.json   시·군·구 경계 (southkorea-maps, 통계청 2013)
  korea-submunicipalities.topo.json 읍·면·동 경계 (같은 출처, 시·군의 세부 지역 돌림판용, 첫 화면 이후 뒤에서 불러옴)
  region-info.json          지역별 여행 정보 (한 줄 소개, 여행하기 좋은 시기, 주요 여행지, 대표 먹거리)
js/
  main.js                   진입점: 데이터 로드 → 페이지 생성 → 페이지 이동(go.select / pick / detail)
  config.js                 설정값 (후보 개수 범위, 지도·돌림판 옵션, 검색 링크)
  data/                     ── 데이터 로드·가공
    topology-loader.js      TopoJSON 불러오기
    provinces.js            시·도 이름 표
    admin-changes.js        2013년 이후 행정구역 변경 보정 규칙
    region-repository.js    선택 단위·세부 지역(구·군/구/읍·면·동)·시도 경계선 생성, 읍·면·동 지연 로드
    region-info-repository.js  여행 정보 로드 (구는 시의 여행 시기·먹거리를 이어받음)
  model/
    selection-model.js      후보 선택 상태 (DOM 없음)
    visited-store.js        다녀온 곳 목록 (localStorage 저장)
  map/                      ── 지도
    korea-map.js            D3 지도 컴포넌트 (확대/축소, 상태 색, 라벨)
    geo-utils.js            화면 맞춤·라벨 위치 계산
    label-layout.js         라벨 겹침 방지
  wheel/                    ── 돌림판
    wheel.js                돌림판 컴포넌트 (항목, 세기 → 시작 속도, 애니메이션)
    spin-physics.js         회전 물리: 마찰·저항으로 점점 느려짐, 기둥에 걸리는 막대(넘어갈 듯 말 듯)
    wheel-renderer.js       Canvas 그리기 (칸·라벨·기둥·12시 막대)
    spin-math.js            각도 계산 (포인터가 가리키는 칸, 가장 가까운 기둥)
  ui/                       ── 작은 화면 요소
    selection-panel.js      후보 개수·하단 트레이(개수 배지·칩·다음 버튼)
    result-card.js          결과 카드
    spin-button.js          꾹 눌러 힘 모으기 버튼 + 힘 게이지 (마우스·터치·키보드)
    step-indicator.js       상단 단계 표시
    zoom-controls.js        ＋/－/⟲ 버튼
    region-popup.js         지역 정보 팝업 (선택한 여행지 이름을 누르면 표시)
    result-modal.js         돌림판 결과 팝업 (이번 여행지 → 세부 지역 돌림판으로 / 최종 여행지 🎉)
    info-section.js         여행 정보 영역 그리기 (두 팝업이 공유)
    dom.js                  DOM 도우미
  views/                    ── 페이지 단위 컨트롤러
    select-view.js          1페이지: 여행 후보 선택
    pick-view.js            2페이지: 여행지 돌림판
    detail-view.js          3페이지: 세부 지역 돌림판
    popup-content.js        팝업 내용 만들기 (지역 이름 + 여행 정보)
```

### 자주 하는 수정
| 하고 싶은 것 | 고칠 곳 |
|---|---|
| 후보 개수 범위·기본값 | `js/config.js` → `SELECTION` |
| 돌림판 칸 색 (파스텔) | `js/wheel/wheel-renderer.js` → `segmentColor`, `COLORS` |
| 돌림판 세기 범위·힘 게이지 속도 | `js/config.js` → `WHEEL_OPTIONS` |
| 돌림판 손맛 (감속, 느린 구간 길이, 기둥 간당간당 정도) | `js/config.js` → `WHEEL_PHYSICS` |
| 지도 라벨 크기·확대 한도 | `js/config.js` → `MAP_OPTIONS` |
| 검색 사이트 변경 | `js/config.js` → `travelSearchUrl` |
| 행정구역 변경 반영 | `js/data/admin-changes.js` 의 표 |
| 지도 색 (육지·경계선·바다·물결·다녀온 곳) | `css/base.css` 의 `--land*`, `--province-*`, `--sea*`, `--visited` |
| 후보로 골랐을 때 시·도별 색 | `js/data/provinces.js` 의 `color` |
| 지역 여행 정보 수정·추가 | `data/region-info.json` (한 줄에 한 지역. 구 정보가 없으면 시 정보로 대신 표시) |
| 시·도 명칭 | `js/data/provinces.js` |
| 색상 | `css/base.css` 의 `:root` |

외부 라이브러리: D3 7.9.0, topojson-client 3.1.0 (jsDelivr CDN, 전역 변수로 사용).

## 로컬 실행
ES 모듈과 `fetch` 를 쓰므로 `index.html` 을 파일로 직접 열면 동작하지 않습니다. 로컬 웹 서버로 여세요.
```bash
npx serve .
```
또는 `python -m http.server 8000` 후 http://localhost:8000 접속.

## 테스트 (CI)
Node 20 이상만 있으면 됩니다 (외부 패키지 없음).
```bash
npm test
```
PR 을 올리거나 `main` 에 push 하면 GitHub Actions(`.github/workflows/ci.yml`)가 같은 테스트를 자동으로 돌립니다.

| 파일 | 검사 내용 |
|---|---|
| `tests/syntax.test.js` | 모든 `js/` 파일이 문법 오류 없이 읽히는지 |
| `tests/data.test.js` | 경계·여행 정보 데이터 형식, 선택 단위 161곳, 행정구역 보정, 모든 지역이 세부 돌림판으로 넘어가는지 |
| `tests/selection-model.test.js` | 후보 담기·빼기·개수 조절·무작위 채우기 |
| `tests/wheel-physics.test.js` | 돌림판 공정성, 회전 시간 범위, 핀이 반대로 튕기지 않는지 |

`WHEEL_PHYSICS` 를 바꿔 회전 시간이 크게 달라지면 `tests/wheel-physics.test.js` 의 `TIMING` 범위도 함께 고치세요.

## GitHub Pages 배포
```bash
git init
git add .
git commit -m "랜덤 여행 돌림판"
git branch -M main
git remote add origin https://github.com/<사용자명>/random_travel.git
git push -u origin main
```
GitHub 저장소 → **Settings → Pages → Build and deployment** 에서
Source: `Deploy from a branch`, Branch: `main` / `(root)` 선택 후 저장.
잠시 후 `https://<사용자명>.github.io/random_travel/` 에서 확인할 수 있습니다.

## 행정구역 보정 (2013 경계 데이터 기준)
- 군위군 → 대구광역시 편입 (2023)
- 청원군 → 청주시 통합 (2014)
- 인천 남구 → 미추홀구 (2018)
- 강원특별자치도(2023), 전북특별자치도(2024) 명칭 반영
- 도 지역의 일반구(예: 수원시 장안구)는 시 단위로 합침

※ 2026년 7월 인천 행정체제 개편(제물포구·영종구·검단구)은 경계 데이터가 없어 반영하지 않았습니다.
