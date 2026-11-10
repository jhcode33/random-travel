/**
 * 시·도 기본 정보.
 * 키는 통계청 2013 시·군·구 코드의 앞 2자리.
 *
 * color: 지도에서 '선택한 후보'로 칠할 색 (일러스트 여행 지도 느낌의 파스텔 톤).
 *        같은 권역은 비슷한 계열, 이웃한 시·도는 서로 다른 계열이 되도록 골랐다.
 *        모두 밝은 색이라 검정 글자가 잘 보인다.
 */
export const PROVINCES = {
  '11': { name: '서울특별시', short: '서울', color: '#ffb547' },
  '21': { name: '부산광역시', short: '부산', color: '#5ec4a0' },
  '22': { name: '대구광역시', short: '대구', color: '#ff9b57' },
  '23': { name: '인천광역시', short: '인천', color: '#ffe48a' },
  '24': { name: '광주광역시', short: '광주', color: '#ec7fa3' },
  '25': { name: '대전광역시', short: '대전', color: '#8fb6f0' },
  '26': { name: '울산광역시', short: '울산', color: '#8ad0e0' },
  '29': { name: '세종특별자치시', short: '세종', color: '#a58ddb' },
  '31': { name: '경기도', short: '경기', color: '#ffd45e' },       // 노랑
  '32': { name: '강원특별자치도', short: '강원', color: '#9ed36a' }, // 초록
  '33': { name: '충청북도', short: '충북', color: '#7fc4ee' },       // 파랑
  '34': { name: '충청남도', short: '충남', color: '#bba2e6' },       // 보라
  '35': { name: '전북특별자치도', short: '전북', color: '#f7a6c1' }, // 분홍
  '36': { name: '전라남도', short: '전남', color: '#f491b4' },       // 진한 분홍
  '37': { name: '경상북도', short: '경북', color: '#ffb873' },       // 주황
  '38': { name: '경상남도', short: '경남', color: '#7fd3b7' },       // 민트
  '39': { name: '제주특별자치도', short: '제주', color: '#8bcf6e' }, // 초록
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
 * @returns {{name: string, short: string, color: string}}
 */
export function getProvince(provCode) {
  const p = PROVINCES[provCode];
  if (!p) throw new Error(`알 수 없는 시·도 코드: ${provCode}`);
  return p;
}
