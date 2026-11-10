/**
 * 지도 확대/축소 버튼 (＋ / － / ⟲).
 * 버튼에는 data-zoom="in|out|reset" 속성이 있어야 한다.
 */
import { ZOOM_STEP } from '../config.js';

/**
 * container 안의 확대/축소 버튼을 map 에 연결한다.
 * @param {HTMLElement} container 버튼을 포함하는 요소
 * @param {import('../map/korea-map.js').KoreaMap} map
 */
export function bindZoomControls(container, map) {
  container.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => applyZoom(map, btn.dataset.zoom));
  });
}

/**
 * 버튼 종류에 맞는 확대 동작을 실행한다.
 * @param {object} map
 * @param {'in'|'out'|'reset'} action
 */
function applyZoom(map, action) {
  if (action === 'in') map.zoomBy(ZOOM_STEP);
  else if (action === 'out') map.zoomBy(1 / ZOOM_STEP);
  else map.resetZoom();
}
