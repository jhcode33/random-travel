/**
 * 지역 정보 팝업.
 *
 * - 넓은 화면: 클릭한 위치 근처에 뜨는 카드
 * - 휴대폰·세로 태블릿: 화면 아래에서 올라오는 시트
 * - 닫기: × 버튼, Esc, 팝업 밖을 누르면 닫힘
 * - 여는 곳: 하단 '선택한 여행지' 목록의 이름, 결과 카드의 '지역 정보 보기'
 *
 * 표시할 내용(PopupContent)은 views/popup-content.js 에서 만든다.
 */
import { queryElements, isNarrowScreen } from './dom.js';
import { renderInfo, setText } from './info-section.js';

/**
 * @typedef {object} PopupAction
 * @property {string} label
 * @property {boolean} [primary]   강조 버튼
 * @property {boolean} [disabled]
 * @property {string} [href]       있으면 새 탭 링크
 * @property {() => void} [onClick]
 *
 * @typedef {object} PopupContent
 * @property {string} id            어떤 지역의 팝업인지 (갱신 판단용)
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [summary]
 * @property {string} [bestSeason]
 * @property {string[]} [highlights]
 * @property {string[]} [foods]
 * @property {string} [note]        안내 문구 (예: 상위 지역 정보 표시 중)
 * @property {PopupAction[]} [actions]
 *
 * @typedef {{x:number, y:number}} Anchor 화면(viewport) 좌표
 */

/** 클릭 위치와 팝업 사이 간격(px) */
const OFFSET = 14;
/** 화면 가장자리 여백(px) */
const EDGE = 12;

export class RegionPopup {
  constructor() {
    this.els = queryElements({
      root: 'region-popup',
      close: 'popup-close',
      subtitle: 'popup-subtitle',
      title: 'popup-title',
      summary: 'popup-summary',
      seasonRow: 'popup-season-row',
      season: 'popup-season',
      highlightsRow: 'popup-highlights-row',
      highlights: 'popup-highlights',
      foodsRow: 'popup-foods-row',
      foods: 'popup-foods',
      note: 'popup-note',
      actions: 'popup-actions',
    });
    /** @type {string|null} 현재 보이는 지역 id */
    this.currentId = null;
    this._bindDismiss();
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 팝업을 보여준다.
   * @param {PopupContent} content
   * @param {Anchor|null} anchor 넓은 화면에서 팝업을 띄울 기준점 (없으면 화면 가운데)
   */
  show(content, anchor = null) {
    this.currentId = content.id;
    this._render(content);
    this._place(anchor);
  }

  /**
   * 같은 지역의 팝업이 열려 있을 때만 내용을 바꾼다 (위치는 그대로).
   * @param {PopupContent} content
   */
  update(content) {
    if (this.isOpen && this.currentId === content.id) this._render(content);
  }

  /** 닫는다. */
  hide() {
    this.els.root.hidden = true;
    this.currentId = null;
  }

  /** 열려 있는지 */
  get isOpen() {
    return !this.els.root.hidden;
  }

  /* ================= 내용 ================= */

  /**
   * 내용을 채운다. 값이 없는 항목은 줄째 숨긴다.
   * @param {PopupContent} c
   */
  _render(c) {
    const e = this.els;
    setText(e.subtitle, c.subtitle);
    e.title.textContent = c.title;
    renderInfo(e, c);
    setText(e.note, c.note);
    e.actions.replaceChildren(...(c.actions || []).map(actionButton));
  }

  /* ================= 위치 ================= */

  /**
   * 화면 크기에 맞춰 시트 또는 카드로 배치한다.
   * @param {Anchor|null} anchor
   */
  _place(anchor) {
    const root = this.els.root;
    const sheet = isNarrowScreen();
    root.classList.toggle('sheet', sheet);
    root.style.left = '';
    root.style.top = '';
    root.hidden = false;
    if (!sheet) this._placeNear(anchor);
  }

  /**
   * 기준점 오른쪽 아래에 두되, 화면을 벗어나면 반대쪽(왼쪽·위쪽)으로 옮긴다.
   * 하단 목록의 여행지를 눌렀을 때는 목록을 가리지 않도록 위쪽에 뜬다.
   * @param {Anchor|null} anchor
   */
  _placeNear(anchor) {
    const root = this.els.root;
    const { width, height } = root.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = anchor || { x: vw / 2 - width / 2 - OFFSET, y: vh / 2 - height / 2 - OFFSET };

    let left = p.x + OFFSET;
    let top = p.y + OFFSET;
    if (left + width > vw - EDGE) left = p.x - OFFSET - width;
    if (top + height > vh - EDGE) top = p.y - OFFSET - height;
    root.style.left = `${Math.max(EDGE, left)}px`;
    root.style.top = `${Math.max(EDGE, top)}px`;
  }

  /* ================= 닫기 ================= */

  /** × 버튼, Esc, 바깥 누르기로 닫히게 한다. */
  _bindDismiss() {
    this.els.close.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && this.isOpen) this.hide();
    });
    document.addEventListener('pointerdown', (ev) => {
      if (!this.isOpen) return;
      const t = ev.target;
      // 팝업 안, 팝업을 여는 버튼(선택한 여행지 이름 등)은 제외
      if (this.els.root.contains(t) || t.closest?.('[data-opens-popup]')) return;
      this.hide();
    });
  }
}

/* ---------------- 내부 함수 ---------------- */

/**
 * 동작 버튼(또는 링크)을 만든다.
 * @param {PopupAction} a
 */
function actionButton(a) {
  const el = a.href ? document.createElement('a') : document.createElement('button');
  el.className = 'btn' + (a.primary ? ' primary' : '');
  el.textContent = a.label;
  if (a.href) {
    el.href = a.href;
    el.target = '_blank';
    el.rel = 'noopener';
  } else {
    el.type = 'button';
    el.disabled = !!a.disabled;
    if (a.onClick) el.addEventListener('click', a.onClick);
  }
  return el;
}
