/**
 * 지역 여행 정보 저장소 (data/region-info.json).
 *
 * JSON 구조
 *  units:    { [unitKey]: { summary, bestSeason, highlights[], foods[] } }
 *  subunits: { ['unitKey/구이름']: { summary?, highlights[] } }
 *
 * 세부 지역(구)은 주요 여행지만 따로 갖고, 여행 시기·먹거리는 상위 지역 정보를 이어받는다.
 */

/** @typedef {{summary?:string, bestSeason?:string, highlights?:string[], foods?:string[]}} RegionInfo */

/**
 * 여행 정보 JSON 을 불러온다.
 * 정보가 없어도 앱은 동작해야 하므로, 실패하면 빈 저장소를 돌려주고 경고만 남긴다.
 * @param {string} url
 * @returns {Promise<RegionInfoRepository>}
 */
export async function loadRegionInfo(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return new RegionInfoRepository(await res.json());
  } catch (err) {
    console.warn('지역 여행 정보를 불러오지 못했습니다:', err);
    return new RegionInfoRepository({});
  }
}

export class RegionInfoRepository {
  /**
   * @param {{units?: object, subunits?: object}} json
   */
  constructor(json) {
    this.units = json.units || {};
    this.subunits = json.subunits || {};
  }

  /**
   * 선택 단위(광역시, 도의 시·군) 정보.
   * @param {string} unitKey 예: '21', '37|경주시'
   * @returns {RegionInfo|null}
   */
  forUnit(unitKey) {
    return this.units[unitKey] || null;
  }

  /**
   * 세부 지역(구·군) 정보. 상위 지역의 여행 시기·먹거리를 합쳐서 돌려준다.
   * 세부 정보가 없으면 상위 지역 정보를 그대로 쓰고 inherited=true 로 표시한다.
   *
   * @param {string} subunitId 예: '21/해운대구', '37|포항시/남구'
   * @returns {{info: RegionInfo|null, inherited: boolean}}
   */
  forSubunit(subunitId) {
    const parent = this.forUnit(parentKeyOf(subunitId));
    const own = this.subunits[subunitId];
    if (!own) return { info: parent, inherited: !!parent };
    return {
      info: {
        summary: own.summary,
        bestSeason: own.bestSeason || parent?.bestSeason,
        highlights: own.highlights,
        foods: own.foods || parent?.foods,
      },
      inherited: false,
    };
  }
}

/**
 * 세부 지역 id 에서 상위 선택 단위 key 를 꺼낸다.
 * @param {string} subunitId 'unitKey/구이름'
 */
function parentKeyOf(subunitId) {
  return subunitId.slice(0, subunitId.lastIndexOf('/'));
}
