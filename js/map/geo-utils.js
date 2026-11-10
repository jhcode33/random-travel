/**
 * 지도 계산용 순수 함수 모음 (DOM 을 다루지 않는다).
 * 전역 `d3` 가 필요하다.
 */

/** 화면 맞춤에서 제외할 작은 섬의 기준: 가장 큰 폴리곤 대비 면적 비율 */
const SMALL_ISLAND_RATIO = 0.01;

/**
 * 투영(projection)을 화면에 맞출 대상 도형을 만든다.
 * trimIslands 가 true 면 멀리 떨어진 아주 작은 섬을 빼서 본토가 크게 보이게 한다.
 *
 * @param {object[]} features GeoJSON Feature 목록
 * @param {boolean} trimIslands
 * @returns {object} GeoJSON (FeatureCollection 또는 MultiPolygon)
 */
export function fitTarget(features, trimIslands) {
  if (!trimIslands) return { type: 'FeatureCollection', features };

  const polygons = features.flatMap((f) => polygonsOf(f.geometry));
  const areas = polygons.map((coords) => d3.geoArea({ type: 'Polygon', coordinates: coords }));
  const maxArea = d3.max(areas) || 0;
  const kept = polygons.filter((_, i) => areas[i] >= maxArea * SMALL_ISLAND_RATIO);
  return { type: 'MultiPolygon', coordinates: kept };
}

/**
 * 라벨을 둘 위치(화면 좌표)를 구한다.
 * 여러 조각(섬 등)으로 된 지역은 가장 큰 조각의 중심을 쓴다.
 *
 * @param {d3.GeoPath} path
 * @param {object} feature GeoJSON Feature
 * @returns {[number, number]}
 */
export function labelAnchor(path, feature) {
  const polys = polygonsOf(feature.geometry);
  if (polys.length <= 1) return path.centroid(feature);

  let best = null;
  let bestArea = -1;
  for (const coords of polys) {
    const poly = { type: 'Polygon', coordinates: coords };
    const area = path.area(poly);
    if (area > bestArea) { bestArea = area; best = poly; }
  }
  return path.centroid(best);
}

/**
 * Feature 의 화면상 최대 변 길이(px, 확대 1배 기준).
 * 라벨을 보여줄 만큼 큰 지역인지 판단하는 데 쓴다.
 *
 * @param {d3.GeoPath} path
 * @param {object} feature
 */
export function screenExtent(path, feature) {
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  return Math.max(x1 - x0, y1 - y0);
}

/**
 * 지역 하나를 화면 가운데에 크게 보이게 하는 zoom transform 을 구한다.
 *
 * @param {d3.GeoPath} path
 * @param {object} feature
 * @param {{w:number, h:number}} size 화면 크기
 * @param {number} maxScale 최대 확대 배율
 * @param {number} fill 화면 대비 차지할 비율 (0~1)
 * @returns {d3.ZoomTransform}
 */
export function transformToFit(path, feature, size, maxScale, fill = 0.6) {
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  const scale = fill / Math.max((x1 - x0) / size.w, (y1 - y0) / size.h);
  const k = Math.max(1, Math.min(maxScale, scale));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return d3.zoomIdentity.translate(size.w / 2, size.h / 2).scale(k).translate(-cx, -cy);
}

/**
 * Polygon / MultiPolygon 의 폴리곤 좌표 목록.
 * @param {object} geometry
 * @returns {Array} 폴리곤 좌표 배열의 배열
 */
function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}
