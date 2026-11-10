/**
 * 1페이지: 여행 후보 선택.
 *  - 지도에서 지역을 누르면 후보에 담긴다 (다시 누르면 빠짐).
 *  - 선택한 여행지는 하단 트레이에 나열되고, 이름을 누르면 여행 정보 팝업이 뜬다.
 *  - 개수가 맞으면 [다음] 으로 여행지 돌림판 페이지로 이동한다.
 */
import { MAP_OPTIONS } from '../config.js';
import { KoreaMap } from '../map/korea-map.js';
import { SelectionPanel } from '../ui/selection-panel.js';
import { bindZoomControls } from '../ui/zoom-controls.js';
import { STEP } from '../ui/step-indicator.js';
import { queryElements, flash, anchorOf } from '../ui/dom.js';
import { unitPopupContent } from './popup-content.js';

export class SelectView {
  /**
   * @param {object} deps
   * @param {import('../data/region-repository.js').RegionRepository} deps.repo
   * @param {import('../data/region-info-repository.js').RegionInfoRepository} deps.info 여행 정보
   * @param {import('../model/selection-model.js').SelectionModel} deps.model
   * @param {import('../ui/step-indicator.js').StepIndicator} deps.steps
   * @param {import('../ui/region-popup.js').RegionPopup} deps.popup 지역 정보 팝업 (페이지 간 공유)
   * @param {() => void} deps.onNext 여행지 돌림판 페이지로 이동
   */
  constructor({ repo, info, model, steps, popup, onNext }) {
    this.repo = repo;
    this.info = info;
    this.model = model;
    this.steps = steps;
    this.popup = popup;
    this.onNext = onNext;

    this.els = this._queryElements();
    this._createComponents();
    this._bindEvents();
  }

  /* ================= 공개 메서드 ================= */

  /** 페이지를 보이고 지도를 그린다. (보이는 상태에서 그려야 크기를 잴 수 있다) */
  show() {
    this.els.root.hidden = false;
    this.map.render(this.repo.units, this.repo.provinceBorders);
    this._update();
  }

  /** 페이지를 숨긴다. */
  hide() {
    this.els.root.hidden = true;
    this.popup.hide();
  }

  /* ================= 초기화 ================= */

  /** 이 페이지에서 쓰는 DOM 요소 */
  _queryElements() {
    return queryElements({
      root: 'view-select',
      mapSvg: 'select-map',
      mapWrap: 'select-map-wrap',
      count: 'count',
      chips: 'chips',
      targetInput: 'target-count',
      targetDec: 'btn-target-dec',
      targetInc: 'btn-target-inc',
      randomFill: 'btn-random-fill',
      clear: 'btn-clear',
      next: 'btn-next-pick',
    });
  }

  /** 지도·패널을 만든다. */
  _createComponents() {
    const e = this.els;
    this.map = new KoreaMap(e.mapSvg, {
      ...MAP_OPTIONS.select,
      onClick: (f) => this._toggle(f.id),
    });
    this.map.setStateFn((f) => this._regionState(f));
    bindZoomControls(e.mapWrap, this.map);

    this.panel = new SelectionPanel(
      { count: e.count, chips: e.chips, targetInput: e.targetInput,
        targetDec: e.targetDec, targetInc: e.targetInc, nextButton: e.next },
      {
        onRemove: (key) => this._toggle(key),
        onChipClick: (key, ev) => this._showPopup(key, anchorOf(ev.currentTarget)),
        onTargetChange: (v) => this._changeTarget(v),
      },
    );
  }

  /** 버튼 이벤트를 연결한다. */
  _bindEvents() {
    this.els.clear.addEventListener('click', () => this._clear());
    this.els.randomFill.addEventListener('click', () => this._fillRandom());
    this.els.next.addEventListener('click', () => {
      if (this.model.status().ready) this.onNext();
    });
  }

  /* ================= 사용자 동작 ================= */

  /**
   * 지역 선택/해제 (지도에서 지역을 누르거나, 칩의 ×, 팝업의 담기/빼기 버튼). 가득 차서 못 담으면 개수 배지를 흔들어 알린다.
   * @param {string} key unit key
   */
  _toggle(key) {
    if (this.model.toggle(key) === 'full') flash(this.els.count);
    this._update();
  }

  /**
   * 후보 개수 변경.
   * @param {number|string} value
   */
  _changeTarget(value) {
    this.model.setTarget(value);
    this._update();
  }

  /** 선택 초기화 */
  _clear() {
    this.model.clear();
    this._update();
  }

  /** 남은 자리 무작위 채우기 */
  _fillRandom() {
    this.model.fillRandom(this.repo.allUnitKeys());
    this._update();
  }

  /* ================= 화면 갱신 ================= */

  /** 패널·지도 색·단계 표시·팝업 버튼을 현재 상태에 맞춘다. */
  _update() {
    const status = this.model.status();
    this.panel.render({
      status,
      units: this.model.selected.map((key) => this.repo.getUnit(key)),
      range: { min: this.model.min, max: this.model.max },
    });
    this.map.refresh();
    this.steps.set(STEP.SELECT);
    this._refreshPopup();
  }

  /**
   * 지도에서 지역별 표시 상태.
   * @param {object} feature unit Feature
   */
  _regionState(feature) {
    const selected = this.model.isSelected(feature.id);
    return {
      metro: feature.properties.metro,
      selected,
      disabled: !selected && this.model.isFull(),
    };
  }

  /* ================= 지역 정보 팝업 ================= */

  /**
   * 선택 단위의 여행 정보 팝업을 띄운다.
   * @param {string} key unit key
   * @param {{x:number, y:number}|null} anchor 화면 좌표
   */
  _showPopup(key, anchor) {
    this.popup.show(this._popupContent(key), anchor);
  }

  /** 선택 상태가 바뀌면 열려 있는 팝업의 '후보 담기/빼기' 버튼도 갱신한다. */
  _refreshPopup() {
    const id = this.popup.currentId;
    if (id && this.repo.unitByKey.has(id)) this.popup.update(this._popupContent(id));
  }

  /**
   * 팝업 내용: 여행 정보 + 후보 담기/빼기 버튼.
   * @param {string} key unit key
   */
  _popupContent(key) {
    return unitPopupContent(this.repo.getUnit(key), this.info, [this._selectAction(key)]);
  }

  /**
   * 팝업의 후보 담기/빼기 버튼.
   * @param {string} key unit key
   * @returns {import('../ui/region-popup.js').PopupAction}
   */
  _selectAction(key) {
    const toggle = () => this._toggle(key);
    if (this.model.isSelected(key)) return { label: '후보에서 빼기', onClick: toggle };
    if (this.model.isFull()) return { label: '후보가 가득 찼어요', disabled: true };
    return { label: '후보에 담기', primary: true, onClick: toggle };
  }
}
