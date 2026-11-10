/**
 * 후보 선택 패널 (1페이지).
 *  - 후보 개수 조절 (－ [10] ＋)            : 지도 카드 상단
 *  - 선택 개수 배지 + 선택한 여행지 칩 목록  : 하단 트레이
 *  - 다음 버튼 (개수가 맞을 때만 활성화)      : 하단 트레이
 *
 * 상태는 갖지 않고, render() 에 전달된 값대로 화면을 그린다.
 */
export class SelectionPanel {
  /**
   * @param {object} els
   * @param {HTMLElement} els.count        개수 배지
   * @param {HTMLElement} els.chips        칩 목록 <ul>
   * @param {HTMLInputElement} els.targetInput
   * @param {HTMLButtonElement} els.targetDec
   * @param {HTMLButtonElement} els.targetInc
   * @param {HTMLButtonElement} els.nextButton 다음(여행지 돌림판) 버튼
   * @param {object} handlers
   * @param {(key:string) => void} handlers.onRemove        칩 × 클릭
   * @param {(key:string) => void} handlers.onChipClick     칩 이름 클릭 (정보 보기)
   * @param {(value:number|string) => void} handlers.onTargetChange 후보 개수 변경
   */
  constructor(els, { onRemove, onChipClick, onTargetChange }) {
    this.els = els;
    this.onRemove = onRemove;
    this.onChipClick = onChipClick;
    this.onTargetChange = onTargetChange;
    this._bindTargetControls();
  }

  /**
   * 패널 전체를 다시 그린다.
   * @param {object} p
   * @param {ReturnType<import('../model/selection-model.js').SelectionModel['status']>} p.status
   * @param {{key:string, label:string, name:string}[]} p.units 선택한 지역 (선택 순서)
   * @param {{min:number, max:number}} p.range 후보 개수 범위
   */
  render({ status, units, range }) {
    this._renderCount(status);
    this._renderTarget(status.target, range);
    this._renderChips(units);
    this._renderNextButton(status);
  }

  /* ---------------- 내부 ---------------- */

  /** 후보 개수 －/＋/입력 이벤트를 연결한다. */
  _bindTargetControls() {
    const { targetInput, targetDec, targetInc } = this.els;
    targetDec.addEventListener('click', () => this.onTargetChange(Number(targetInput.value) - 1));
    targetInc.addEventListener('click', () => this.onTargetChange(Number(targetInput.value) + 1));
    targetInput.addEventListener('change', () => this.onTargetChange(targetInput.value));
  }

  /** 개수 배지. 초과하면 경고 색 */
  _renderCount({ count, target, over }) {
    this.els.count.textContent = `${count} / ${target}`;
    this.els.count.classList.toggle('over', over > 0);
  }

  /** 후보 개수 입력·버튼 상태 */
  _renderTarget(target, { min, max }) {
    const { targetInput, targetDec, targetInc } = this.els;
    targetInput.value = target;
    targetInput.min = min;
    targetInput.max = max;
    targetDec.disabled = target <= min;
    targetInc.disabled = target >= max;
  }

  /** 선택한 여행지 칩 목록 */
  _renderChips(units) {
    const list = this.els.chips;
    list.replaceChildren();
    if (units.length === 0) {
      list.append(emptyChip());
      return;
    }
    units.forEach((u, i) => list.append(this._chip(u, i + 1)));
  }

  /**
   * 칩 하나: [번호 이름] [×]
   * 이름을 누르면 여행 정보 팝업, ×를 누르면 해제.
   * @param {{key:string, label:string, name:string}} unit
   * @param {number} order 선택 순서
   */
  _chip(unit, order) {
    const li = document.createElement('li');
    // 지도에서 칠해진 색과 같은 색으로 (어느 지역인지 한눈에 맞춰 보기 쉽게)
    if (unit.color) li.style.setProperty('--chip-color', unit.color);

    const name = document.createElement('button');
    name.type = 'button';
    name.className = 'chip-name';
    name.dataset.opensPopup = '';
    name.title = `${unit.name} 여행 정보`;
    name.textContent = `${order}. ${unit.label}`;
    name.addEventListener('click', (ev) => this.onChipClick(unit.key, ev));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `${unit.name} 선택 해제`);
    remove.addEventListener('click', () => this.onRemove(unit.key));

    li.append(name, remove);
    return li;
  }

  /** 다음 버튼: 개수가 맞을 때만 활성화, 문구로 남은 일을 알려준다. */
  _renderNextButton({ remaining, over, ready }) {
    const btn = this.els.nextButton;
    btn.disabled = !ready;
    setResponsiveLabel(btn, nextButtonText({ remaining, over }));
  }
}

/** 선택이 없을 때의 안내 칩 */
function emptyChip() {
  const li = document.createElement('li');
  li.className = 'empty';
  li.textContent = '지도에서 여행 후보를 눌러 담아 보세요.';
  return li;
}

/**
 * 다음 버튼 문구. 좁은 화면용 짧은 문구(short)도 함께 돌려준다.
 * @param {{remaining:number, over:number}} s
 * @returns {{long:string, short:string}}
 */
function nextButtonText({ remaining, over }) {
  if (remaining > 0) return { long: `${remaining}곳 더 선택하세요`, short: `${remaining}곳 더 선택` };
  if (over > 0) return { long: `${over}곳 초과 — 해제하세요`, short: `${over}곳 초과` };
  return { long: '다음: 여행지 돌림판 →', short: '다음 →' };
}

/**
 * 버튼에 긴 문구·짧은 문구를 함께 넣는다. 화면 폭에 따라 CSS 가 하나만 보여준다 (.lbl-long / .lbl-short).
 * @param {HTMLElement} el
 * @param {{long:string, short:string}} text
 */
function setResponsiveLabel(el, { long, short }) {
  const longEl = document.createElement('span');
  longEl.className = 'lbl-long';
  longEl.textContent = long;
  const shortEl = document.createElement('span');
  shortEl.className = 'lbl-short';
  shortEl.textContent = short;
  el.replaceChildren(longEl, shortEl);
  el.setAttribute('aria-label', long);
}
