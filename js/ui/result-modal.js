/**
 * 돌림판 결과 팝업 (화면 가운데 모달).
 *
 * 두 가지 모양
 *  - 이번 여행지 (여행지 돌림판 결과, 세부 지역 있음): [세부 지역 돌림판으로] 버튼
 *  - 최종 여행지 (세부 지역 돌림판 결과, 또는 세부 지역이 없는 시·군): 이름 양옆에 🎉, [확인] 버튼
 *
 * 브라우저 기본 <dialog> 를 써서 배경 어둡게 하기·Esc 닫기·포커스 가두기를 처리한다.
 */
import { queryElements } from './dom.js';
import { renderInfo, setText } from './info-section.js';

export class ResultModal {
  /**
   * @param {() => void} onRestart '처음부터 다시' 를 눌렀을 때
   */
  constructor(onRestart) {
    this.els = queryElements({
      root: 'result-modal',
      label: 'result-modal-label',
      name: 'result-modal-name',
      note: 'result-modal-note',
      summary: 'result-modal-summary',
      seasonRow: 'result-modal-season-row',
      season: 'result-modal-season',
      highlightsRow: 'result-modal-highlights-row',
      highlights: 'result-modal-highlights',
      foodsRow: 'result-modal-foods-row',
      foods: 'result-modal-foods',
      search: 'result-modal-search',
      restart: 'result-modal-restart',
      primary: 'result-modal-primary',
    });
    /** @type {(() => void)|null} 주 버튼을 눌렀을 때 추가로 할 일 (예: 다음 페이지로) */
    this.onPrimary = null;
    this._bindEvents(onRestart);
  }

  /**
   * 결과를 보여준다.
   * @param {object} p
   * @param {boolean} p.final        최종 여행지인지 (🎉 표시, '최종 여행지' 문구)
   * @param {string} p.name          여행지 이름 (예: '부산광역시 해운대구')
   * @param {import('./info-section.js').InfoData} p.info 여행 정보
   * @param {string} p.searchUrl     여행 정보 검색 링크
   * @param {string} [p.note]        안내 문구
   * @param {{label:string, onClick?:() => void}} [p.primary] 주 버튼 (기본: 확인)
   */
  show({ final, name, info, searchUrl, note = '', primary = null }) {
    const e = this.els;
    e.root.classList.toggle('is-final', final);
    e.label.textContent = final ? '최종 여행지' : '이번 여행지';
    e.name.textContent = name;
    setText(e.note, note);
    renderInfo(e, info || {});
    e.search.href = searchUrl;

    e.primary.textContent = primary?.label || '확인';
    this.onPrimary = primary?.onClick || null;

    if (!e.root.open) e.root.showModal();
    e.primary.focus();
  }

  /** 닫는다. */
  close() {
    if (this.els.root.open) this.els.root.close();
  }

  /**
   * 버튼과 배경 클릭을 연결한다.
   * @param {() => void} onRestart
   */
  _bindEvents(onRestart) {
    const e = this.els;
    e.primary.addEventListener('click', () => {
      const next = this.onPrimary;
      this.close();
      if (next) next();
    });
    e.restart.addEventListener('click', () => {
      this.close();
      onRestart();
    });
    // 어두운 배경(모달 바깥)을 누르면 닫기
    e.root.addEventListener('click', (ev) => {
      if (ev.target === e.root) this.close();
    });
  }
}
