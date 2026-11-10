/**
 * 시·도 기본 정보.
 * 키는 통계청 2013 시·군·구 코드의 앞 2자리.
 */
export const PROVINCES = {
  '11': { name: '서울특별시', short: '서울' },
  '21': { name: '부산광역시', short: '부산' },
  '22': { name: '대구광역시', short: '대구' },
  '23': { name: '인천광역시', short: '인천' },
  '24': { name: '광주광역시', short: '광주' },
  '25': { name: '대전광역시', short: '대전' },
  '26': { name: '울산광역시', short: '울산' },
  '29': { name: '세종특별자치시', short: '세종' },
  '31': { name: '경기도', short: '경기' },
  '32': { name: '강원특별자치도', short: '강원' },
  '33': { name: '충청북도', short: '충북' },
  '34': { name: '충청남도', short: '충남' },
  '35': { name: '전북특별자치도', short: '전북' },
  '36': { name: '전라남도', short: '전남' },
  '37': { name: '경상북도', short: '경북' },
  '38': { name: '경상남도', short: '경남' },
  '39': { name: '제주특별자치도', short: '제주' },
};

/**
 * 특별시·광역시·특별자치시 여부.
 * 이 지역들은 시 전체를 하나의 선택 단위로 다룬다. (코드 31 이상은 도)
 * @param {string} provCode 시·도 코드 2자리
 */
export function isMetro(provCode) {
  return Number(provCode) < 31;
}

/**
 * 시·도 정보 조회.
 * @param {string} provCode 시·도 코드 2자리
 * @returns {{name: string, short: string}}
 */
export function getProvince(provCode) {
  const p = PROVINCES[provCode];
  if (!p) throw new Error(`알 수 없는 시·도 코드: ${provCode}`);
  return p;
}
