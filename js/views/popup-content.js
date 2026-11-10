/**
 * 지역 정보 팝업에 넣을 내용(PopupContent)을 만드는 함수.
 * 지역 이름(RegionRepository)과 여행 정보(RegionInfoRepository)를 합친다.
 */
import { travelSearchUrl } from '../config.js';

/**
 * 선택 단위(광역시, 도의 시·군) 팝업 내용.
 *
 * @param {object} unit       RegionRepository.getUnit() 결과
 * @param {import('../data/region-info-repository.js').RegionInfoRepository} info
 * @param {import('../ui/region-popup.js').PopupAction[]} extraActions 앞에 붙일 버튼 (예: 후보 추가)
 * @returns {import('../ui/region-popup.js').PopupContent}
 */
export function unitPopupContent(unit, info, extraActions = []) {
  const data = info.forUnit(unit.key);
  return {
    id: unit.key,
    title: unit.name,
    subtitle: unit.metro ? '특별시·광역시' : '시·군',
    ...infoFields(data),
    note: data ? '' : '아직 준비된 여행 정보가 없습니다.',
    actions: [...extraActions, searchAction(unit.name)],
  };
}

/**
 * 세부 지역(구·군) 팝업 내용.
 *
 * @param {object} unit     상위 선택 단위 (RegionRepository.getUnit())
 * @param {object} feature  세부 지역 Feature (id: 'unitKey/구이름')
 * @param {import('../data/region-info-repository.js').RegionInfoRepository} info
 * @returns {import('../ui/region-popup.js').PopupContent}
 */
export function subunitPopupContent(unit, feature, info) {
  const { info: data, inherited } = info.forSubunit(feature.id);
  const fullName = `${unit.name} ${feature.properties.name}`;
  return {
    id: feature.id,
    title: feature.properties.name,
    subtitle: unit.name,
    ...infoFields(data),
    note: noteFor(data, inherited, unit.name),
    actions: [searchAction(fullName)],
  };
}

/**
 * 여행 정보 필드만 골라낸다.
 * @param {object|null} data
 */
function infoFields(data) {
  return {
    summary: data?.summary || '',
    bestSeason: data?.bestSeason || '',
    highlights: data?.highlights || [],
    foods: data?.foods || [],
  };
}

/**
 * 세부 지역 안내 문구.
 * @param {object|null} data
 * @param {boolean} inherited 상위 지역 정보를 대신 보여주는지
 * @param {string} parentName
 */
function noteFor(data, inherited, parentName) {
  if (!data) return '아직 준비된 여행 정보가 없습니다.';
  if (inherited) return `세부 정보가 없어 ${parentName} 전체 정보를 보여줍니다.`;
  return '';
}

/**
 * 여행 정보 검색 링크.
 * @param {string} placeName
 */
function searchAction(placeName) {
  return { label: '여행 정보 검색', href: travelSearchUrl(placeName) };
}

/** 줄바꿈 없는 공백 (no-break space) */
const NBSP = '\u00A0';

/**
 * 최종 여행지 이름 양옆에 🎉 를 붙인다.
 * 줄바꿈 없는 공백으로 붙여서, 이름이 줄바꿈돼도 🎉 가 혼자 다음 줄로 떨어지지 않는다.
 * @param {string} name
 */
export function celebrate(name) {
  return `🎉${NBSP}${name}${NBSP}🎉`;
}
