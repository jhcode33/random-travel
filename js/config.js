/**
 * 앱 전체 설정값.
 * 숫자·문구·경로를 바꿀 때는 이 파일만 수정하면 된다.
 */

/** 지도 경계 데이터 경로 (index.html 기준 상대 경로) */
export const DATA_URL = 'data/korea-municipalities.topo.json';

/** 읍·면·동 경계 데이터 경로 (시·군의 세부 지역 돌림판용, 앱 시작 후 뒤에서 불러옴) */
export const SUBMUNICIPALITY_URL = 'data/korea-submunicipalities.topo.json';

/** 지역 여행 정보(여행하기 좋은 시기, 주요 여행지 등) 경로 */
export const REGION_INFO_URL = 'data/region-info.json';

/** 후보 개수 설정 */
export const SELECTION = {
  MIN_TARGET: 2,
  MAX_TARGET: 40,
  DEFAULT_TARGET: 10,
};

/** 휴대폰·세로 태블릿으로 보는 화면 폭 (responsive.css 의 900px 와 맞춘다) */
export const NARROW_MEDIA_QUERY = '(max-width: 900px)';

/** 지도 옵션 (KoreaMap 생성자에 전달) */
export const MAP_OPTIONS = {
  /** 1단계: 전국 지도 (광역시 + 도의 시·군) */
  select: { fontSize: 12, minLabelPx: 34, maxZoom: 16, trimIslands: false },
  /** 3단계: 세부 지역 지도 */
  detail: { fontSize: 13, minLabelPx: 24, maxZoom: 16, trimIslands: true },
};

/** 지도 확대/축소 버튼 한 번당 배율 */
export const ZOOM_STEP = 1.6;

/**
 * 돌림판 옵션.
 * 회전은 물리 시뮬레이션(js/wheel/spin-physics.js)으로 계산한다. 각속도 단위는 rad/s.
 */
export const WHEEL_OPTIONS = {
  /** 버튼 힘 0 → 최소 속도, 힘 1 → 최대 속도 */
  minSpeed: 12,
  maxSpeed: 36,
  /** 같은 힘이라도 매번 결과가 달라지도록 섞는 무작위 비율 (±) */
  speedJitter: 0.15,
  /** 버튼을 누르고 있을 때 힘 게이지가 0→1 로 차는 시간(ms). 이후 1→0 으로 왕복 */
  chargeMs: 1300,
};

/** 돌림판 물리 상수 (조정하면 손맛이 바뀐다) */
export const WHEEL_PHYSICS = {
  // ── 감속: 빠를 땐 크게, 느려지면 아주 조금 → 느린 구간이 길다
  // (칸 10개·중간 세기 기준: 전체 약 43초 = 빠른 구간 약 11초 + 느린 구간 약 32초, 그중 아주 느린 구간 약 9초)
  friction: 0.005,      // 축 마찰 (속도와 무관하게 일정) rad/s²  ← 작을수록 느린 구간이 길어짐
  drag: 0.021,          // 속도에 비례한 저항 1/s  ← 작을수록 전체가 길어짐
  dragQuad: 0.021,      // 속도의 제곱에 비례한 저항 (고속에서 주로 작용) 1/rad  ← 작을수록 빠른 구간이 길어짐

  // ── 기둥과 막대: 마지막으로 갈수록 기둥마다 간당간당하게 넘어감
  crossSpeed: 0.8,      // 칸 10개 기준: 이 속도보다 느리면 기둥이 막대를 못 넘고 되돌아옴 rad/s
                        // (칸 수에 따라 자동 조정되어, 한 바퀴에 잃는 힘이 비슷하게 유지됨)
  pegRestitution: 0.99, // 기둥이 막대를 넘을 때 막대가 돌려주는 힘의 비율
                        // (1에 가까울수록 기둥 하나에 잃는 힘이 작아, 끝에서 간당간당한 기둥이 여러 개 이어짐)
  pegFriction: 0.0035,   // 기둥이 핀을 긁는 마찰 (한 바퀴 평균값, 칸 수와 무관하게 유지) rad/s²
  bounceKeep: 0.06,     // 기둥을 못 넘고 되돌아 나갈 때 남는 속도 비율 (작을수록 덜 밀려남)
  contactWidth: 0.2,    // 기둥이 막대에 닿아 있는 각도 폭 (최대값, 칸이 좁으면 줄어듦) rad
  flapperMax: 0.75,     // 핀 끝이 도는 방향으로 최대로 휘는 각도 rad
  // ── 핀 움직임 (보이는 모양만, 결과에는 영향 없음): 천처럼 부드럽게 휘었다가 펴짐
  flapperBendSec: 0.025,  // 기둥에 밀려 휘는 빠르기 (초, 클수록 부드럽고 덜 휨)
  flapperReturnSec: 0.11, // 기둥이 지나간 뒤 곧게 펴지는 빠르기 (초, 클수록 천천히). 반대쪽으로 튕기지 않음
  flapperTipLagSec: 0.07, // 핀 끝이 몸통을 늦게 따라오는 정도 (초, 클수록 천처럼 끝이 끌려옴)
  stepSec: 1 / 240,     // 시뮬레이션 간격
  maxSec: 90,           // 안전장치: 최대 회전 시간
};

/** 여행 정보 검색 링크 */
export function travelSearchUrl(placeName) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${placeName} 여행 가볼만한 곳`);
}
