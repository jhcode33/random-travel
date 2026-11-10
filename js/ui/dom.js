/**
 * DOM 공통 도우미.
 */
import { NARROW_MEDIA_QUERY } from '../config.js';

/**
 * id 로 요소를 찾는다. 없으면 바로 오류를 내서 HTML 과 코드의 불일치를 빨리 알 수 있게 한다.
 * @param {string} id
 * @returns {HTMLElement}
 */
export function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 요소가 없습니다 (index.html 확인)`);
  return el;
}

/**
 * id 목록을 { id: element } 객체로 바꾼다.
 * @param {Record<string, string>} map { 이름: id }
 * @returns {Record<string, HTMLElement>}
 */
export function queryElements(map) {
  return Object.fromEntries(Object.entries(map).map(([name, id]) => [name, byId(id)]));
}

/**
 * 요소를 잠깐 커졌다 작아지게 해서 주의를 끈다.
 * @param {HTMLElement} el
 */
export function flash(el) {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
    { duration: 300 },
  );
}

/** 휴대폰·세로 태블릿 화면인지 */
export function isNarrowScreen() {
  return window.matchMedia(NARROW_MEDIA_QUERY).matches;
}

/**
 * 좁은 화면에서 요소가 화면 밖에 있으면 보이도록 스크롤한다.
 * @param {HTMLElement} el
 */
export function revealOnNarrow(el) {
  if (isNarrowScreen()) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 요소의 왼쪽 위 화면 좌표 (팝업을 띄울 기준점).
 * @param {HTMLElement} el
 * @returns {{x:number, y:number}}
 */
export function anchorOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top };
}

/**
 * 여러 요소의 disabled 를 한 번에 바꾼다.
 * @param {HTMLElement[]} elements
 * @param {boolean} disabled
 */
export function setDisabled(elements, disabled) {
  elements.forEach((el) => { el.disabled = disabled; });
}
