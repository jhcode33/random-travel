/**
 * 돌림판 결과 카드.
 *  - 안내 문구 (예: '이번 여행지는', '최종 여행지 🎉')
 *  - 결과 이름
 *  - 여행 정보 검색 링크 (선택)
 */

export class ResultCard {
  /**
   * @param {object} els
   * @param {HTMLElement} els.root
   * @param {HTMLElement} els.label
   * @param {HTMLElement} els.name
   * @param {HTMLAnchorElement} els.search
   */
  constructor(els) {
    this.els = els;
  }

  /**
   * 결과를 보여준다.
   * @param {object} p
   * @param {string} p.label      안내 문구
   * @param {string} p.name       결과 이름
   * @param {string|null} p.searchUrl 검색 링크 (null 이면 숨김)
   */
  show({ label, name, searchUrl = null }) {
    this.els.label.textContent = label;
    this.els.name.textContent = name;
    this.els.search.hidden = !searchUrl;
    if (searchUrl) this.els.search.href = searchUrl;
    this.els.root.hidden = false;
    // 돌림판 아래에 있어 화면 밖일 수 있으므로 보이게 스크롤 (이미 보이면 움직이지 않음)
    this.els.root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** 숨긴다. */
  hide() {
    this.els.root.hidden = true;
  }

  /** 보이는 중인지 */
  get visible() {
    return !this.els.root.hidden;
  }
}
