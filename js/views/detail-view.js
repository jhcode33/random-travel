/**
 * 3페이지: 세부 지역 돌림판.
 * 여행지 돌림판에서 뽑힌 지역의 세부 지역(구·군)을 돌림판으로 정한다.
 * 왼쪽(휴대폰에서는 위)에 세부 지역 지도, 오른쪽(아래)에 돌림판.
 */
import { MAP_OPTIONS, travelSearchUrl } from '../config.js';
import { KoreaMap } from '../map/korea-map.js';
import { Wheel } from '../wheel/wheel.js';
import { ResultCard } from '../ui/result-card.js';
import { SpinButton } from '../ui/spin-button.js';
import { bindZoomControls } from '../ui/zoom-controls.js';
import { STEP } from '../ui/step-indicator.js';
import { queryElements, setDisabled } from '../ui/dom.js';
import { subunitPopupContent, celebrate } from './popup-content.js';

export class DetailView {
  /**
   * @param {object} deps
   * @param {import('../data/region-repository.js').RegionRepository} deps.repo
   * @param {import('../data/region-info-repository.js').RegionInfoRepository} deps.info 여행 정보
   * @param {import('../ui/step-indicator.js').StepIndicator} deps.steps
   * @param {import('../ui/region-popup.js').RegionPopup} deps.popup 지역 정보 팝업 (화면 간 공유)
   * @param {import('../ui/result-modal.js').ResultModal} deps.resultModal 돌림판 결과 팝업
   * @param {() => void} deps.onBack     여행지 돌림판 페이지로 돌아가기
   * @param {() => void} deps.onRestart  처음부터 다시
   */
  constructor({ repo, info, steps, popup, resultModal, onBack, onRestart }) {
    this.repo = repo;
    this.info = info;
    this.steps = steps;
    this.popup = popup;
    this.resultModal = resultModal;
    this.onBack = onBack;
    this.onRestart = onRestart;

    this.unitKey = null;
    this.features = [];
    this.winnerId = null;
    this.spinning = false;

    this.els = this._queryElements();
    this._createComponents();
    this._bindEvents();
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 세부 지역 화면을 연다.
   * @param {string} unitKey 1차 돌림판에서 뽑힌 지역
   */
  open(unitKey) {
    this.unitKey = unitKey;
    this.features = this.repo.getSubunits(unitKey);
    this.winnerId = null;

    this.popup.hide();
    this.els.root.hidden = false;
    this._renderHeader();
    this.result.hide();
    this.spinButton.setText('꾹 눌러 돌리기');
    this.map.render(this.features);
    this.wheel.setItems(this.features.map((f) => ({ id: f.id, label: f.properties.name })));
    this.steps.set(STEP.DETAIL);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** 화면을 숨긴다. */
  hide() {
    this.els.root.hidden = true;
    this.popup.hide();
  }

  /** 웹폰트가 늦게 로드됐을 때 돌림판 글자를 다시 그린다. */
  redraw() {
    this.wheel.draw();
  }

  /* ================= 초기화 ================= */

  /** 이 화면에서 쓰는 DOM 요소 */
  _queryElements() {
    return queryElements({
      root: 'view-detail',
      title: 'detail-title',
      count: 'detail-count',
      legendKind: 'detail-legend-kind',
      mapSvg: 'detail-map',
      mapWrap: 'detail-map-wrap',
      wheelCanvas: 'detail-wheel',
      spin: 'btn-spin-detail',
      gauge: 'detail-power',
      back: 'btn-back-pick',
      restart: 'btn-restart',
      resultInfo: 'detail-info',
      resultRoot: 'detail-result',
      resultLabel: 'detail-result-label',
      resultName: 'detail-result-name',
      resultSearch: 'detail-search',
    });
  }

  /** 지도·돌림판·결과 카드를 만든다. */
  _createComponents() {
    const e = this.els;
    this.map = new KoreaMap(e.mapSvg, MAP_OPTIONS.detail);
    this.map.setStateFn((f) => this._regionState(f));
    bindZoomControls(e.mapWrap, this.map);

    this.wheel = new Wheel(e.wheelCanvas);
    this.spinButton = new SpinButton({ button: e.spin, gauge: e.gauge }, (power) => this._spin(power));
    this.result = new ResultCard({
      root: e.resultRoot, label: e.resultLabel, name: e.resultName, search: e.resultSearch,
    });
  }

  /** 버튼 이벤트를 연결한다. */
  _bindEvents() {
    this.els.back.addEventListener('click', () => !this.spinning && this.onBack());
    this.els.restart.addEventListener('click', () => !this.spinning && this.onRestart());
    // 결과 카드의 '지역 정보 보기' → 최종 여행지 팝업 다시 열기
    this.els.resultInfo.addEventListener('click', () => {
      if (this.winnerId) this._showFinal(this.winnerId);
    });
  }

  /**
   * 최종 여행지 팝업을 띄운다.
   * @param {string} featureId 당첨된 세부 지역 id
   */
  _showFinal(featureId) {
    const feature = this.features.find((f) => f.id === featureId);
    if (!feature) return;
    const unit = this.repo.getUnit(this.unitKey);
    const fullName = `${unit.name} ${feature.properties.name}`;
    this.resultModal.show({
      final: true,
      name: fullName,
      info: subunitPopupContent(unit, feature, this.info),
      searchUrl: travelSearchUrl(fullName),
    });
  }

  /* ================= 동작 ================= */

  /**
   * 세부 지역 돌림판 돌리기 → 결과 강조·확대
   * @param {number} power 버튼을 누른 세기 0~1
   */
  async _spin(power) {
    if (this.spinning || this.features.length === 0) return;
    this.winnerId = null;
    this.result.hide();
    this.steps.set(STEP.DETAIL);
    this.map.refresh();
    this.map.resetZoom();
    this._setSpinning(true);

    let item;
    try {
      ({ item } = await this.wheel.spin(power));
    } finally {
      this._setSpinning(false);   // 실패해도 잠금이 풀리도록
    }
    this.winnerId = item.id;
    this.map.refresh();
    this.map.zoomToFeature(item.id);
    this._showResult(item.label);
    this._showFinal(item.id);
  }

  /* ================= 화면 갱신 ================= */

  /** 제목과 세부 지역 수 */
  _renderHeader() {
    this.els.title.textContent = `${this.repo.getUnit(this.unitKey).name} 지도`;
    this.els.count.textContent = `${this.features.length}곳`;
    this.els.legendKind.textContent = this.repo.subunitKind(this.unitKey);   // 구·군 / 구 / 읍·면·동
  }

  /**
   * 최종 결과를 보여준다.
   * @param {string} subName 세부 지역 이름
   */
  _showResult(subName) {
    const fullName = `${this.repo.getUnit(this.unitKey).name} ${subName}`;
    this.spinButton.setText('꾹 눌러 다시 돌리기');
    this.result.show({ label: '최종 여행지', name: celebrate(fullName), searchUrl: travelSearchUrl(fullName) });
    this.steps.set(STEP.DONE);
  }

  /**
   * 회전 중에는 버튼을 막는다.
   * @param {boolean} spinning
   */
  _setSpinning(spinning) {
    this.spinning = spinning;
    setDisabled([this.els.spin, this.els.back, this.els.restart], spinning);
  }

  /**
   * 지도에서 지역별 표시 상태: 당첨 지역 강조, 나머지는 흐리게.
   * @param {object} feature
   */
  _regionState(feature) {
    return {
      winner: feature.id === this.winnerId,
      dim: !!this.winnerId && feature.id !== this.winnerId,
    };
  }
}
