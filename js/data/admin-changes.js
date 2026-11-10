/**
 * 행정구역 변경 보정.
 *
 * 지도 데이터는 통계청 2013년 경계이므로, 그 이후 바뀐 내용을 여기서 보정한다.
 * 새로운 변경이 생기면 아래 표에 한 줄씩 추가하면 된다.
 */
import { isMetro } from './provinces.js';

/** 다른 시·도로 편입된 시·군·구: { 시군구코드: 새 시·도 코드 } */
const PROVINCE_MOVES = {
  '37310': '22', // 군위군: 경상북도 → 대구광역시 (2023)
};

/** 코드 기준 이름 변경: { 시군구코드: 새 이름 } */
const RENAME_BY_CODE = {
  '33310': '청주시', // 청원군 + 청주시 통합 (2014)
};

/** 시·도 안에서 이름 변경: { '시도코드|옛이름': 새 이름 } */
const RENAME_IN_PROVINCE = {
  '23|남구': '미추홀구', // 인천 남구 → 미추홀구 (2018)
  '29|세종시': '세종특별자치시',
};

/** 도 지역 일반구 이름 패턴. 예: '수원시장안구' → 시='수원시', 구='장안구' */
const GENERAL_GU_PATTERN = /^(.+?시)(.+구)$/;

/**
 * 원본 시·군·구 속성을 현재 행정구역 기준으로 정리한다.
 *
 * @param {{code: string, name: string}} props 원본 TopoJSON 속성
 * @returns {{prov: string, city: string, sub: string|null}}
 *   prov: 시·도 코드, city: 시·군·구 이름, sub: 일반구 이름(없으면 null)
 */
export function normalizeMunicipality(props) {
  const code = String(props.code);
  const prov = resolveProvince(code);
  const name = resolveName(code, prov, props.name);
  return splitGeneralGu(prov, name);
}

/**
 * 시·군·구 코드로 소속 시·도 코드를 구한다 (편입 반영).
 * @param {string} code 시·군·구 코드 5자리
 */
function resolveProvince(code) {
  return PROVINCE_MOVES[code] || code.slice(0, 2);
}

/**
 * 바뀐 이름을 반영한다.
 * @param {string} code 시·군·구 코드
 * @param {string} prov 시·도 코드
 * @param {string} name 원본 이름
 */
function resolveName(code, prov, name) {
  return RENAME_BY_CODE[code] || RENAME_IN_PROVINCE[`${prov}|${name}`] || name;
}

/**
 * 도 지역의 '시+일반구' 이름을 시와 구로 나눈다.
 * 특별시·광역시의 구는 자치구이므로 나누지 않는다.
 * @param {string} prov 시·도 코드
 * @param {string} name 이름
 */
function splitGeneralGu(prov, name) {
  if (!isMetro(prov)) {
    const m = name.match(GENERAL_GU_PATTERN);
    if (m) return { prov, city: m[1], sub: m[2] };
  }
  return { prov, city: name, sub: null };
}
