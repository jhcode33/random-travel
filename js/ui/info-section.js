/**
 * 여행 정보 영역(한 줄 소개 · 여행하기 좋은 시기 · 주요 여행지 · 대표 먹거리) 그리기.
 * 지역 정보 팝업(region-popup.js)과 돌림판 결과 팝업(result-modal.js)이 함께 쓴다.
 */

/**
 * @typedef {object} InfoElements
 * @property {HTMLElement} summary
 * @property {HTMLElement} seasonRow
 * @property {HTMLElement} season
 * @property {HTMLElement} highlightsRow
 * @property {HTMLElement} highlights    <ul>
 * @property {HTMLElement} foodsRow
 * @property {HTMLElement} foods
 *
 * @typedef {object} InfoData
 * @property {string} [summary]
 * @property {string} [bestSeason]
 * @property {string[]} [highlights]
 * @property {string[]} [foods]
 */

/**
 * 정보를 채운다. 값이 없는 항목은 줄째 숨긴다.
 * @param {InfoElements} els
 * @param {InfoData} data
 */
export function renderInfo(els, data) {
  setText(els.summary, data.summary);

  els.seasonRow.hidden = !data.bestSeason;
  els.season.textContent = data.bestSeason || '';

  els.highlightsRow.hidden = !data.highlights?.length;
  els.highlights.replaceChildren(...(data.highlights || []).map(tagItem));

  els.foodsRow.hidden = !data.foods?.length;
  els.foods.textContent = (data.foods || []).join(', ');
}

/**
 * 값이 없으면 요소를 숨기고, 있으면 글자를 넣는다.
 * @param {HTMLElement} el
 * @param {string} [text]
 */
export function setText(el, text) {
  el.hidden = !text;
  el.textContent = text || '';
}

/** 주요 여행지 태그 */
function tagItem(text) {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}
