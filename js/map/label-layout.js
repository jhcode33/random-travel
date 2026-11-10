/**
 * 지도 라벨 배치 (겹침 방지).
 *
 * 우선순위
 *  1. forced    : 선택·당첨된 지역 → 항상 표시
 *  2. preferred : 광역시 → 다른 라벨과 겹치지 않으면 표시
 *  3. 나머지     : 화면에서 충분히 큰 지역부터, 겹치지 않으면 표시
 */

/** 한글 한 글자 폭 ≈ 글자 크기 × 이 값 */
const CHAR_WIDTH_RATIO = 0.95;

/**
 * 표시할 라벨을 고른다.
 *
 * @param {Array<LabelItem>} items
 * @param {object} opts
 * @param {number} opts.k           현재 확대 배율
 * @param {number} opts.fontPx      화면상 글자 크기(px)
 * @param {number} opts.minLabelPx  라벨을 보여줄 최소 지역 크기(px)
 * @param {boolean} opts.showAll    true 면 모두 표시
 * @returns {Set<string>} 표시할 item.id 집합
 *
 * @typedef {object} LabelItem
 * @property {string} id
 * @property {string} text
 * @property {[number, number]} anchor  확대 1배 기준 좌표
 * @property {number} extent            확대 1배 기준 지역 크기(px)
 * @property {boolean} forced
 * @property {boolean} preferred
 */
export function chooseVisibleLabels(items, { k, fontPx, minLabelPx, showAll }) {
  if (showAll) return new Set(items.map((it) => it.id));

  const { forced, preferred, rest } = classify(items, k, minLabelPx);
  const visible = new Set();
  const placed = [];

  const place = (item, mustShow) => {
    const box = labelBox(item, k, fontPx);
    if (mustShow || !overlapsAny(box, placed)) {
      visible.add(item.id);
      placed.push(box);
    }
  };

  forced.forEach((it) => place(it, true));
  preferred.forEach((it) => place(it, false));
  rest.sort((a, b) => b.extent - a.extent).forEach((it) => place(it, false));
  return visible;
}

/**
 * 라벨을 우선순위 그룹으로 나눈다. 너무 작은 지역은 제외한다.
 * @param {LabelItem[]} items
 * @param {number} k
 * @param {number} minLabelPx
 */
function classify(items, k, minLabelPx) {
  const forced = [], preferred = [], rest = [];
  for (const it of items) {
    if (it.forced) forced.push(it);
    else if (it.preferred) preferred.push(it);
    else if (it.extent * k >= minLabelPx) rest.push(it);
  }
  return { forced, preferred, rest };
}

/**
 * 라벨이 차지하는 화면 영역 [x0, y0, x1, y1].
 * @param {LabelItem} item
 * @param {number} k
 * @param {number} fontPx
 */
function labelBox(item, k, fontPx) {
  const w = item.text.length * fontPx * CHAR_WIDTH_RATIO + 4;
  const h = fontPx + 2;
  const x = item.anchor[0] * k;
  const y = item.anchor[1] * k;
  return [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
}

/**
 * 이미 배치된 영역과 겹치는지 검사.
 * @param {number[]} box
 * @param {number[][]} placed
 */
function overlapsAny(box, placed) {
  return placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1]);
}
