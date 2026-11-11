/**
 * 데이터 파일 검사.
 * - 경계 파일이 올바른 TopoJSON 인지
 * - 선택 단위(광역시 + 도의 시·군)가 기대한 개수로 만들어지는지
 * - 여행 정보(region-info.json)의 지역 key 가 실제 지역과 맞고, 필수 항목이 있는지
 * - 모든 선택 단위가 세부 지역 돌림판으로 넘어갈 수 있는지 (세부 지역 2곳 이상)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJson, installBrowserStubs } from './helpers.js';

installBrowserStubs();
const { DATA_URL, SUBMUNICIPALITY_URL, REGION_INFO_URL } = await import('../js/config.js');
const { RegionRepository } = await import('../js/data/region-repository.js');
const { loadTopology } = await import('../js/data/topology-loader.js');

/** 선택 단위 개수 (특별·광역시·세종 8 + 도의 시·군 153) */
const EXPECTED_UNITS = 161;

// 테스트 전에 데이터를 모두 불러 둔다 (before 훅 대신 최상위 await: Node 20 에서 순서가 확실함)
const repo = new RegionRepository(await loadTopology(DATA_URL));
await repo.loadSubmunicipalities(SUBMUNICIPALITY_URL);
const info = await readJson(REGION_INFO_URL);

/** 이름으로 선택 단위 찾기 */
function unitNamed(part) {
  return repo.units.find((f) => f.properties.name.includes(part));
}

/** 선택 단위의 세부 지역 이름 목록 */
function subunitNames(unit) {
  return repo.getSubunits(unit.id).map((s) => s.properties.name);
}

test('경계 파일 두 개가 TopoJSON 이고 지역마다 code·name 이 있다', async () => {
  for (const url of [DATA_URL, SUBMUNICIPALITY_URL]) {
    const topo = await readJson(url);
    assert.equal(topo.type, 'Topology', url);
    const obj = Object.values(topo.objects)[0];
    assert.ok(obj.geometries.length > 200, `${url}: ${obj.geometries.length}개`);
    for (const g of obj.geometries) {
      assert.ok(g.properties?.code && g.properties?.name, `${url}: code/name 없는 지역`);
    }
  }
});

test(`선택 단위가 ${EXPECTED_UNITS}곳이고 key 가 겹치지 않으며 시·도 색이 있다`, () => {
  const keys = repo.allUnitKeys();
  assert.equal(keys.length, EXPECTED_UNITS);
  assert.equal(new Set(keys).size, keys.length);
  for (const f of repo.units) {
    assert.ok(f.properties.name, `${f.id}: 이름 없음`);
    assert.match(f.properties.color ?? '', /^#[0-9a-f]{6}$/i, `${f.id}: 시·도 색 없음`);
  }
});

test('행정구역 보정이 반영되어 있다', () => {
  const names = repo.units.map((f) => f.properties.name);
  assert.ok(!names.some((n) => n.includes('청원')), '청원군은 청주시에 통합');
  assert.ok(subunitNames(unitNamed('대구')).includes('군위군'), '군위군은 대구 구·군');
  assert.ok(subunitNames(unitNamed('인천')).includes('미추홀구'), '인천 남구 → 미추홀구');
});

test('모든 선택 단위가 세부 지역 돌림판으로 넘어갈 수 있다 (세부 지역 2곳 이상)', () => {
  const missing = repo.allUnitKeys().filter((key) => !repo.hasSubunits(key));
  assert.deepEqual(missing.map((k) => repo.unitByKey.get(k).properties.name), []);
});

test('여행 정보의 지역 key 가 실제 지역과 맞다', () => {
  const units = new Set(repo.allUnitKeys());
  const badUnits = Object.keys(info.units).filter((k) => !units.has(k));
  assert.deepEqual(badUnits, [], '없는 선택 단위');

  const badSubunits = Object.keys(info.subunits).filter((id) => {
    const unitKey = id.split('/')[0];
    return !units.has(unitKey) || !repo.getSubunits(unitKey).some((s) => s.id === id);
  });
  assert.deepEqual(badSubunits, [], '없는 세부 지역');
});

test('여행 정보 항목 형식이 올바르다', () => {
  for (const [key, v] of Object.entries(info.units)) {
    assert.equal(typeof v.summary, 'string', `${key}.summary`);
    assert.equal(typeof v.bestSeason, 'string', `${key}.bestSeason`);
    assert.ok(Array.isArray(v.highlights) && v.highlights.length > 0, `${key}.highlights`);
    assert.ok(Array.isArray(v.foods), `${key}.foods`);
  }
  for (const [id, v] of Object.entries(info.subunits)) {
    assert.ok(Array.isArray(v.highlights) && v.highlights.length > 0, `${id}.highlights`);
  }
});
