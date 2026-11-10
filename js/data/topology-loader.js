/**
 * 지도 경계 데이터(TopoJSON) 로더.
 */

/**
 * TopoJSON 파일을 불러온다.
 * @param {string} url 파일 경로
 * @returns {Promise<object>} TopoJSON Topology 객체
 */
export async function loadTopology(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`지도 데이터를 불러오지 못했습니다 (${res.status} ${url})`);
  const topology = await res.json();
  validateTopology(topology);
  return topology;
}

/**
 * 최소한의 형식 검사.
 * @param {object} topology
 */
function validateTopology(topology) {
  if (topology?.type !== 'Topology' || !topology.objects) {
    throw new Error('지도 데이터 형식이 올바르지 않습니다 (TopoJSON 이 아님)');
  }
}

/**
 * Topology 안의 첫 번째 객체(시·군·구 GeometryCollection)를 돌려준다.
 * @param {object} topology
 */
export function getMunicipalityObject(topology) {
  const name = Object.keys(topology.objects)[0];
  return topology.objects[name];
}
