/**
 * 2페이지: 여행지 돌림판.
 *  - 1페이지에서 고른 후보로 돌림판을 돌려 여행지 한 곳을 뽑는다.
 *  - 결과는 항상 결과 팝업으로 보여준다.
 *    · 세부 지역(구·군)이 있으면: '이번 여행지' 팝업의 [세부 지역 돌림판으로 →] (또는 페이지 하단 [다음])
 *    · 세부 지역이 없으면(예: 경주시): 그 자체가 최종 여행지 → '최종 여행지' 팝업, [처음부터 다시]
 */
import { travelSearchUrl } from '../config.js';
import { Wheel } from '../wheel/wheel.js';
import { ResultCard } from '../ui/result-card.js';
import { SpinButton } from '../ui/spin-button.js';
import { STEP } from '../ui/step-indicator.js';
import { queryElements, setDisabled } from '../ui/dom.js';
import { unitPopupContent, celebrate } from './popup-content.js';

export class PickView {
  /**
   * @param {object} deps
   * @param {import('../data/region-repository.js').RegionRepository} deps.repo
   * @param {import('../data/region-info-repository.js').RegionInfoRepository} deps.info
   * @param {import('../model/selection-model.js').SelectionModel} deps.model
   * @param {import('../ui/step-indicator.js').StepIndicator} deps.steps
   * @param {import('../ui/region-popup.js').RegionPopup} deps.popup
   * @param {import('../ui/result-modal.js').ResultModal} deps.resultModal 돌림판 결과 팝업
   * @param {() => void} deps.onBack     후보 선택 페이지로
   * @param {() => void} deps.onNext     세부 지역 돌림판 페이지로
   * @param {() => void} deps.onRestart  처음부터 다시
   */
  constructor({ repo, info, model, steps, popup, resultModal, onBack, onNext, onRestart }) {
    this.repo = repo;
    this.info = info;
    this.model = model;
    this.steps = steps;
    this.popup = popup;
    this.resultModal = resultModal;
    this.onBack = onBack;
    this.onNext = onNext;
    this.onRestart = onRestart;

    this.spinning = false;
    /** 돌림판에 올려진 후보 key 목록 (선택이 바뀌었는지 판단용) */
    this.wheelKeys = [];

    this.els = this._queryElements();
    this.wheel = new Wheel(this.els.wheelCanvas);
    this.result = new ResultCard({
      root: this.els.resultRoot, label: this.els.resultLabel,
      name: this.els.resultName, search: this.els.resultSearch,
    });
    this.spinButton = new SpinButton({ button: this.els.spin, gauge: this.els.gauge }, (power) => this._spin(power));
    this._bindEvents();
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 페이지를 연다.
   * 후보가 바뀌었으면 돌림판을 새로 채우고, 같으면 이전 결과를 그대로 보여준다.
   */
  show() {
    this.els.root.hidden = false;
    this._syncWheelItems();
    this._renderResult();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** 페이지를 숨긴다. */
  hide() {
    this.els.root.hidden = true;
    this.popup.hide();
  }

  /** 웹폰트가 늦게 로드됐을 때 돌림판 글자를 다시 그린다. */
  redraw() {
    this.wheel.draw();
  }

  /* ================= 초기화 ================= */

  /** 이 페이지에서 쓰는 DOM 요소 */
  _queryElements() {
    return queryElements({
      root: 'view-pick',
      wheelCanvas: 'pick-wheel',
      spin: 'btn-spin-pick',
      gauge: 'pick-power',
      resultRoot: 'pick-result',
      resultLabel: 'pick-result-label',
      resultName: 'pick-result-name',
      resultSearch: 'pick-search',
      resultInfo: 'pick-info',
      back: 'btn-back-select',
      next: 'btn-next-detail',
      restart: 'btn-restart-pick',
    });
  }

  /** 버튼 이벤트를 연결한다. */
  _bindEvents() {
    const e = this.els;
    e.back.addEventListener('click', () => !this.spinning && this.onBack());
    e.next.addEventListener('click', () => !this.spinning && this.model.picked && this.onNext());
    e.restart.addEventListener('click', () => !this.spinning && this.onRestart());
    // 결과 카드의 '지역 정보 보기' → 결과 팝업 다시 열기
    e.resultInfo.addEventListener('click', () => {
      if (this.model.picked) this._showResultModal(this.model.picked);
    });
  }

  /* ================= 동작 ================= */

  /** 선택한 후보가 돌림판 항목과 다르면 돌림판을 새로 채운다. */
  _syncWheelItems() {
    const keys = this.model.selected;
    if (sameList(keys, this.wheelKeys)) return;
    this.wheelKeys = keys.slice();
    this.wheel.setItems(keys.map((key) => ({ key, label: this.repo.getUnit(key).label })));
  }

  /**
   * 돌림판 돌리기 → 결과 표시
   * @param {number} power 버튼을 누른 세기 0~1
   */
  async _spin(power) {
    if (this.spinning || this.wheelKeys.length === 0) return;
    this.model.setPicked(null);
    this._renderResult();
    this._setSpinning(true);

    let item;
    try {
      ({ item } = await this.wheel.spin(power));
      // 시·군의 읍·면·동 경계가 아직 오는 중이면 기다린 뒤에 '다음 단계가 있는지' 판단한다
      // (기다리는 동안에도 버튼이 잠겨 있도록 잠금 해제 전에 기다린다)
      await this.repo.townsReady;
    } finally {
      this._setSpinning(false);   // 실패해도 잠금이 풀리도록
    }
    this.model.setPicked(item.key);
    this._renderResult();
    this._showResultModal(item.key);
  }

  /**
   * 세부 지역이 없어 이 결과가 최종 여행지인지
   * @param {string} key unit key
   */
  _isFinal(key) {
    return !this.repo.hasSubunits(key);
  }

  /**
   * 결과 팝업을 띄운다.
   * - 세부 지역 있음: '이번 여행지' + [세부 지역 돌림판으로 →]
   * - 세부 지역 없음: '최종 여행지' + 그 이유 안내
   * @param {string} key unit key
   */
  _showResultModal(key) {
    const unit = this.repo.getUnit(key);
    const final = this._isFinal(key);
    this.resultModal.show({
      final,
      name: unit.name,
      info: unitPopupContent(unit, this.info),
      searchUrl: travelSearchUrl(unit.name),
      note: final ? '나눌 세부 지역이 없어 이곳이 최종 여행지예요.' : '',
      primary: final ? null : {
        label: `${this.repo.subunitKind(key)} 돌림판으로 →`,   // 예: '읍·면·동 돌림판으로 →'
        onClick: () => this.onNext(),
      },
    });
  }

  /* ================= 화면 갱신 ================= */

  /**
   * 결과 카드·다음 버튼·단계 표시를 현재 결과에 맞춘다.
   * - 결과 없음: 결과 카드 숨김, 다음 버튼 비활성
   * - 세부 지역 있음: '이번 여행지는', 다음 버튼 활성
   * - 세부 지역 없음: '최종 여행지', 처음부터 다시 버튼
   */
  _renderResult() {
    const key = this.model.picked;
    const e = this.els;
    this.spinButton.setText(key ? '꾹 눌러 다시 돌리기' : '꾹 눌러 돌리기');

    if (!key) {
      this.result.hide();
      e.next.hidden = false;
      e.next.disabled = true;
      e.restart.hidden = true;
      this.steps.set(STEP.PICK);
      return;
    }

    const unit = this.repo.getUnit(key);
    const hasDetail = !this._isFinal(key);
    this.result.show({
      label: hasDetail ? '이번 여행지는' : '최종 여행지',
      name: hasDetail ? unit.name : celebrate(unit.name),
      searchUrl: travelSearchUrl(unit.name),
    });
    e.next.hidden = !hasDetail;
    e.next.disabled = !hasDetail;
    e.restart.hidden = hasDetail;
    this.steps.set(hasDetail ? STEP.PICK : STEP.DONE);
  }

  /**
   * 회전 중에는 버튼을 막는다.
   * @param {boolean} spinning
   */
  _setSpinning(spinning) {
    this.spinning = spinning;
    setDisabled([this.els.spin, this.els.back, this.els.restart], spinning);
    if (spinning) this.els.next.disabled = true;
  }
}

/** 두 배열의 원소와 순서가 같은지 */
function sameList(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
