/**
 * 지역 저장소.
 *
 * TopoJSON 경계로부터 다음을 만든다.
 *  - 선택 단위(unit): 특별시·광역시는 시 전체, 도는 시·군
 *  - 세부 지역(subunit): 세부 지역 돌림판에 올라갈 지역
 *      · 특별시·광역시        → 자치구·군      (예: 대구 달서구, 달성군)
 *      · 일반구가 있는 시      → 구            (예: 포항시 남구·북구)
 *      · 그 밖의 시·군·세종    → 읍·면·동      (예: 거창군 거창읍, 가조면 …)
 *  - 시·도 경계선(지도에 굵게 그릴 선)
 *
 * 읍·면·동 경계는 파일이 커서 앱 시작 후 뒤에서 따로 불러온다(loadSubmunicipalities).
 * 전역 `topojson`(topojson-client) 이 필요하다.
 */
import { getProvince, isMetro } from './provinces.js';
import { normalizeMunicipality } from './admin-changes.js';
import { loadTopology, getMunicipalityObject } from './topology-loader.js';

/** 세부 지역 종류 */
export const SUBUNIT_KIND = Object.freeze({
  DISTRICT: '구·군',       // 광역시의 자치구·군
  GENERAL_GU: '구',        // 도 지역 시의 일반구
  TOWN: '읍·면·동',        // 시·군의 읍·면·동
});

export class RegionRepository {
  /**
   * @param {object} topology 시·군·구 경계 TopoJSON
   */
  constructor(topology) {
    this.topology = topology;
    this.collection = getMunicipalityObject(topology);

    /** @type {WeakMap<object, {prov:string, city:string, sub:string|null}>} 원본 geometry → 정리된 속성 */
    this.normalized = new WeakMap();
    /** @type {Map<string, object[]>} unit key → 시·군·구 geometry 목록 */
    this.unitGeometries = new Map();
    /** @type {Map<string, string>} 시·군·구 코드(5자리) → unit key */
    this.unitKeyByCode = new Map();
    /** @type {Map<string, object[]>} unit key → 세부 지역 Feature 목록 (지연 생성 캐시) */
    this.subunitCache = new Map();

    /** 읍·면·동 경계 (loadSubmunicipalities 후 채워짐) */
    this.townTopology = null;
    /** @type {Map<string, object[]>} unit key → 읍·면·동 geometry 목록 */
    this.townGeometries = new Map();
    /** 읍·면·동 로드 완료(성공·실패 모두) 시 끝나는 Promise */
    this.townsReady = Promise.resolve();

    this._normalizeAll();
    this._groupByUnit();

    /** @type {object[]} 선택 단위 GeoJSON Feature 목록 (key 순 정렬) */
    this.units = this._buildUnitFeatures();
    /** @type {Map<string, object>} key → unit Feature */
    this.unitByKey = new Map(this.units.map((f) => [f.id, f]));
    /** 시·도 경계선 (GeoJSON MultiLineString) */
    this.provinceBorders = this._buildProvinceBorders();
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 읍·면·동 경계를 뒤에서 불러오기 시작한다.
   * 실패해도 앱은 동작한다 (읍·면·동으로 나눌 수 없는 시·군은 최종 여행지가 됨).
   * @param {string} url
   * @returns {Promise<void>}
   */
  loadSubmunicipalities(url) {
    this.townsReady = loadTopology(url)
      .then((topo) => this._indexTowns(topo))
      .catch((err) => console.warn('읍·면·동 경계를 불러오지 못했습니다:', err));
    return this.townsReady;
  }

  /**
   * 선택 단위의 key 목록.
   * @returns {string[]}
   */
  allUnitKeys() {
    return this.units.map((f) => f.id);
  }

  /**
   * 선택 단위 속성 조회.
   * @param {string} key unit key (광역시: '21', 도의 시·군: '37|경주시')
   * @returns {{key, prov, metro, name, label, short, alwaysLabel}}
   */
  getUnit(key) {
    const f = this.unitByKey.get(key);
    if (!f) throw new Error(`알 수 없는 지역: ${key}`);
    return f.properties;
  }

  /**
   * 세부 지역 종류 (SUBUNIT_KIND).
   * @param {string} key unit key
   */
  subunitKind(key) {
    if (this.getUnit(key).metro && key !== '29') return SUBUNIT_KIND.DISTRICT;
    if (this._generalGuGroups(key)) return SUBUNIT_KIND.GENERAL_GU;
    return SUBUNIT_KIND.TOWN;
  }

  /**
   * 세부 지역 Feature 목록. 없으면 빈 배열.
   * 읍·면·동을 쓰는 지역은 loadSubmunicipalities() 가 끝난 뒤에 채워진다 (townsReady 를 기다릴 것).
   * @param {string} key unit key
   * @returns {object[]}
   */
  getSubunits(key) {
    if (!this.subunitCache.has(key)) {
      const list = this._buildSubunits(key);
      // 읍·면·동이 아직 안 왔으면 캐시하지 않는다 (나중에 다시 만들도록)
      if (list.length || this.townTopology) this.subunitCache.set(key, list);
      return list;
    }
    return this.subunitCache.get(key);
  }

  /**
   * 세부 지역이 있는지 여부 (2곳 이상일 때만 돌림판을 돌릴 의미가 있다).
   * @param {string} key unit key
   */
  hasSubunits(key) {
    return this.getSubunits(key).length >= 2;
  }

  /* ================= 생성 단계: 시·군·구 ================= */

  /** 모든 원본 geometry 의 속성을 현재 행정구역 기준으로 정리한다. */
  _normalizeAll() {
    for (const g of this.collection.geometries) {
      this.normalized.set(g, normalizeMunicipality(g.properties));
    }
  }

  /** 원본 geometry 를 선택 단위별로 묶고, 코드 → 선택 단위 표를 만든다. */
  _groupByUnit() {
    for (const g of this.collection.geometries) {
      const key = unitKeyOf(this.normalized.get(g));
      if (!this.unitGeometries.has(key)) this.unitGeometries.set(key, []);
      this.unitGeometries.get(key).push(g);
      this.unitKeyByCode.set(String(g.properties.code), key);
    }
  }

  /** 선택 단위 Feature 를 만든다. */
  _buildUnitFeatures() {
    return [...this.unitGeometries.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([key, geoms]) => ({
        type: 'Feature',
        id: key,
        properties: describeUnit(key, this.normalized.get(geoms[0])),
        geometry: topojson.merge(this.topology, geoms),
      }));
  }

  /** 서로 다른 시·도 사이의 경계선만 추출한다. */
  _buildProvinceBorders() {
    return topojson.mesh(this.topology, this.collection,
      (a, b) => a !== b && this.normalized.get(a).prov !== this.normalized.get(b).prov);
  }

  /* ================= 생성 단계: 읍·면·동 ================= */

  /**
   * 읍·면·동 geometry 를 선택 단위별로 묶는다.
   * 읍·면·동 코드(7자리)의 앞 5자리가 시·군·구 코드이므로, 이를 통해 선택 단위를 찾는다.
   * (군위군처럼 다른 시·도로 편입된 곳도 시·군·구 표를 거치므로 자동 반영된다)
   * @param {object} topo 읍·면·동 TopoJSON
   */
  _indexTowns(topo) {
    for (const g of getMunicipalityObject(topo).geometries) {
      const key = this.unitKeyByCode.get(String(g.properties.code).slice(0, 5));
      if (!key) continue;
      if (!this.townGeometries.has(key)) this.townGeometries.set(key, []);
      this.townGeometries.get(key).push(g);
    }
    this.townTopology = topo;
    this.subunitCache.clear();
  }

  /* ================= 생성 단계: 세부 지역 ================= */

  /**
   * 세부 지역 Feature 를 만든다. 종류는 subunitKind() 참고.
   * @param {string} key unit key
   */
  _buildSubunits(key) {
    switch (this.subunitKind(key)) {
      case SUBUNIT_KIND.DISTRICT:
        return toFeatures(key, this.topology, groupBy(this.unitGeometries.get(key), (g) => this.normalized.get(g).city));
      case SUBUNIT_KIND.GENERAL_GU:
        return toFeatures(key, this.topology, this._generalGuGroups(key));
      default:
        if (!this.townTopology) return [];
        return toFeatures(key, this.townTopology, groupBy(this.townGeometries.get(key) || [], (g) => g.properties.name));
    }
  }

  /**
   * 일반구별로 묶은 geometry. 일반구가 2개 이상이고 모든 조각에 일반구 정보가 있을 때만 돌려준다.
   * (청주시처럼 일반구 정보가 일부 없는 시는 null → 읍·면·동 사용)
   * @param {string} key unit key
   * @returns {Map<string, object[]>|null}
   */
  _generalGuGroups(key) {
    const geoms = this.unitGeometries.get(key) || [];
    if (geoms.some((g) => !this.normalized.get(g).sub)) return null;
    const groups = groupBy(geoms, (g) => this.normalized.get(g).sub);
    return groups.size >= 2 ? groups : null;
  }
}

/* ---------------- 내부 함수 ---------------- */

/**
 * 정리된 속성으로부터 선택 단위 key 를 만든다.
 * @param {{prov:string, city:string}} n
 */
function unitKeyOf(n) {
  return isMetro(n.prov) ? n.prov : `${n.prov}|${n.city}`;
}

/**
 * 선택 단위의 표시용 속성을 만든다.
 * @param {string} key unit key
 * @param {{prov:string, city:string}} n 대표 geometry 의 정리된 속성
 */
function describeUnit(key, n) {
  const P = getProvince(n.prov);
  const metro = isMetro(n.prov);
  return {
    key,
    prov: n.prov,
    metro,
    name: metro ? P.name : `${P.name} ${n.city}`,    // 전체 이름: 검색·툴팁
    label: metro ? P.name : `${P.short} ${n.city}`,   // 목록·돌림판
    short: metro ? P.short : n.city,                   // 지도 라벨
    alwaysLabel: metro,                                // 광역시 라벨 우선 표시
  };
}

/**
 * 목록을 이름별로 묶는다.
 * @param {object[]} items
 * @param {(item:object) => string} nameOf
 * @returns {Map<string, object[]>}
 */
function groupBy(items, nameOf) {
  const groups = new Map();
  for (const item of items) {
    const name = nameOf(item);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  }
  return groups;
}

/**
 * 이름별 geometry 묶음 → 세부 지역 Feature 목록 (이름 가나다순).
 * @param {string} unitKey
 * @param {object} topology 묶음 geometry 가 속한 TopoJSON
 * @param {Map<string, object[]>|null} groups
 */
function toFeatures(unitKey, topology, groups) {
  if (!groups || groups.size < 2) return [];
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([name, parts]) => ({
      type: 'Feature',
      id: `${unitKey}/${name}`,
      properties: { name, short: name, label: name },
      geometry: topojson.merge(topology, parts),
    }));
}
