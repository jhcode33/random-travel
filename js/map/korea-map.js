/**
 * 확대/축소 가능한 D3 지도 컴포넌트.
 *
 * - 마우스 휠·핀치 확대, 드래그 이동
 * - 지역 클릭 콜백
 * - 지역별 상태 클래스(selected, winner …) 적용
 * - 라벨은 확대해도 글자 크기가 거의 일정하고, 겹치지 않게 배치
 *
 * 전역 `d3` 가 필요하다.
 */
import { fitTarget, labelAnchor, screenExtent, transformToFit } from './geo-utils.js';
import { chooseVisibleLabels } from './label-layout.js';

/** 지역 <path> 에 붙일 수 있는 상태 클래스 */
const STATE_CLASSES = ['metro', 'selected', 'disabled', 'dim', 'winner'];
/** 진한 배경이 되어 라벨을 흰 글씨로 바꿀 상태 (winner 는 밝은 금색이라 제외) */
const DARK_STATES = ['selected'];
/** 라벨을 항상 보여줄 상태 */
const FORCE_LABEL_STATES = ['selected', 'winner'];

/** 지도 가장자리 최소 여백(px): 가장자리 지역 라벨(약 4글자)의 절반 폭 */
const MIN_PADDING_PX = 30;

const DEFAULT_OPTIONS = {
  onClick: null,          // (feature, MouseEvent) => void
  fontSize: 13,           // 확대 1배일 때 라벨 글자 크기
  minLabelPx: 26,         // 이보다 작게 보이는 지역은 라벨 생략
  maxZoom: 14,
  trimIslands: false,     // 화면 맞춤 시 작은 섬 제외
  showAllLabels: false,
  padding: 0.05,          // 화면 가장자리 여백 비율
};

export class KoreaMap {
  /**
   * @param {SVGSVGElement} svgEl 지도를 그릴 <svg>
   * @param {Partial<typeof DEFAULT_OPTIONS>} options
   */
  constructor(svgEl, options = {}) {
    this.svgEl = svgEl;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.features = [];
    this.outline = null;
    this.size = { w: 0, h: 0 };
    /** @type {Map<string, {anchor:number[], extent:number, forced:boolean, dark:boolean}>} */
    this.meta = new Map();
    /** @type {(feature) => Record<string, boolean>} */
    this.stateFn = () => ({});

    this._createLayers();
    this._setupZoom();
    this._observeResize();
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 지역들을 그린다. 이전 내용은 교체되고 확대 상태는 초기화된다.
   * @param {object[]} features GeoJSON Feature 목록 (id 필수)
   * @param {object|null} outline 굵게 그릴 경계선 (GeoJSON)
   */
  render(features, outline = null) {
    this.features = features;
    this.outline = outline;
    this.size = this._measure();

    this._setupProjection();
    this._computeMeta();
    this._drawRegions();
    this._drawOutline();
    this._drawLabels();

    this.resetZoom(false);
    this.refresh();
  }

  /**
   * 지역별 상태를 정하는 함수를 등록한다.
   * @param {(feature) => Record<string, boolean>} fn 예: f => ({ selected: true })
   */
  setStateFn(fn) {
    this.stateFn = fn;
    this.refresh();
  }

  /** 상태 함수를 다시 적용해 색·라벨을 갱신한다. */
  refresh() {
    this._applyStates();
    this._applyZoomStyles(d3.zoomTransform(this.svgEl).k);
  }

  /**
   * 현재 배율에서 factor 만큼 확대/축소한다.
   * @param {number} factor 1보다 크면 확대
   */
  zoomBy(factor) {
    this.svg.transition().duration(300).call(this.zoom.scaleBy, factor);
  }

  /**
   * 처음 크기로 되돌린다.
   * @param {boolean} animate
   */
  resetZoom(animate = true) {
    const target = animate ? this.svg.transition().duration(500) : this.svg;
    target.call(this.zoom.transform, d3.zoomIdentity);
  }

  /**
   * 특정 지역으로 확대한다.
   * @param {string} id Feature id
   * @param {number} maxScale 최대 배율
   */
  zoomToFeature(id, maxScale = 6) {
    const feature = this.features.find((f) => f.id === id);
    if (!feature) return;
    const t = transformToFit(this.path, feature, this.size, maxScale);
    this.svg.transition().duration(900).call(this.zoom.transform, t);
  }

  /* ================= 초기화 ================= */

  /** SVG 레이어(지역 → 경계선 → 라벨 순)를 만든다. */
  _createLayers() {
    this.svg = d3.select(this.svgEl);
    this.root = this.svg.append('g');
    this.regionLayer = this.root.append('g').attr('class', 'regions');
    this.outlinePath = this.root.append('path').attr('class', 'outline');
    this.labelLayer = this.root.append('g');
  }

  /** d3.zoom 을 연결한다 (더블클릭 확대는 끔: 빠른 선택과 충돌). */
  _setupZoom() {
    this.zoom = d3.zoom()
      .scaleExtent([1, this.options.maxZoom])
      .on('zoom', (ev) => this._onZoom(ev.transform));
    this.svg.call(this.zoom).on('dblclick.zoom', null);
  }

  /**
   * 지도 영역 크기가 실제로 바뀔 때만 다시 그린다.
   * (휴대폰에서 스크롤 시 주소창이 숨겨지며 생기는 작은 변화로 확대 상태가 초기화되지 않도록)
   */
  _observeResize() {
    let timer;
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!this.features.length) return;
        const next = this._measure();
        if (Math.abs(next.w - this.size.w) < 2 && Math.abs(next.h - this.size.h) < 2) return;
        this.render(this.features, this.outline);
      }, 150);
    }).observe(this.svgEl);
  }

  /** 현재 <svg> 크기. 숨겨져 있을 때를 대비해 최소값을 둔다. */
  _measure() {
    const r = this.svgEl.getBoundingClientRect();
    return { w: Math.max(200, r.width), h: Math.max(200, r.height) };
  }

  /* ================= 그리기 ================= */

  /** 투영과 path 생성기를 화면 크기에 맞춘다. */
  _setupProjection() {
    const { w, h } = this.size;
    // 가장자리 지역의 이름이 잘리지 않도록 최소 여백을 둔다
    const pad = Math.max(MIN_PADDING_PX, Math.min(w, h) * this.options.padding);
    this.svg.attr('viewBox', `0 0 ${w} ${h}`);
    this.zoom.translateExtent([[-w * 0.25, -h * 0.25], [w * 1.25, h * 1.25]]);

    const target = fitTarget(this.features, this.options.trimIslands);
    this.projection = d3.geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], target);
    this.path = d3.geoPath(this.projection);
  }

  /** 라벨 위치·지역 크기를 미리 계산한다. */
  _computeMeta() {
    this.meta = new Map(this.features.map((f) => [f.id, {
      anchor: labelAnchor(this.path, f),
      extent: screenExtent(this.path, f),
      forced: false,
      dark: false,
    }]));
  }

  /** 지역 <path> 를 그리고 클릭·툴팁을 연결한다. */
  _drawRegions() {
    const onClick = this.options.onClick;
    this.regionLayer.selectAll('path')
      .data(this.features, (d) => d.id)
      .join('path')
      .attr('class', 'region')
      .attr('d', this.path)
      .on('click', (ev, d) => {
        if (!ev.defaultPrevented && onClick) onClick(d, ev);
      })
      .selectAll('title').data((d) => [d]).join('title')
      .text((d) => d.properties.name);
  }

  /** 시·도 경계선 같은 추가 선을 그린다. */
  _drawOutline() {
    this.outlinePath.attr('d', this.outline ? this.path(this.outline) : null);
  }

  /** 라벨 <text> 를 그린다. */
  _drawLabels() {
    this.labelLayer.selectAll('text')
      .data(this.features, (d) => d.id)
      .join('text')
      .attr('class', 'label')
      .attr('x', (d) => this.meta.get(d.id).anchor[0])
      .attr('y', (d) => this.meta.get(d.id).anchor[1])
      .text((d) => d.properties.short);
  }

  /* ================= 상태·확대 반영 ================= */

  /** stateFn 결과를 클래스와 라벨 메타 정보에 반영한다. */
  _applyStates() {
    const stateFn = this.stateFn;
    const meta = this.meta;
    this.regionLayer.selectAll('path').each(function (d) {
      const state = stateFn(d) || {};
      const el = d3.select(this);
      STATE_CLASSES.forEach((c) => el.classed(c, !!state[c]));

      const m = meta.get(d.id);
      if (m) {
        m.dark = DARK_STATES.some((c) => state[c]);
        m.forced = FORCE_LABEL_STATES.some((c) => state[c]);
      }
    });
    this.labelLayer.selectAll('text').classed('on-dark', (d) => meta.get(d.id)?.dark);
  }

  /**
   * d3.zoom 이벤트 처리.
   * @param {d3.ZoomTransform} t
   */
  _onZoom(t) {
    this.root.attr('transform', t);
    this._applyZoomStyles(t.k);
  }

  /**
   * 배율에 맞춰 선 굵기·글자 크기·라벨 표시 여부를 조정한다.
   * @param {number} k 현재 배율
   */
  _applyZoomStyles(k) {
    const fontSize = this.options.fontSize / Math.pow(k, 0.85); // 확대할수록 약간만 커지게
    const visible = this._visibleLabelIds(k, fontSize * k);

    this.regionLayer.selectAll('path').attr('stroke-width', 1 / k);
    this.outlinePath.attr('stroke-width', 2.2 / k);
    this.labelLayer.selectAll('text')
      .attr('font-size', fontSize)
      .attr('stroke-width', 3 / k)
      .attr('display', (d) => (visible.has(d.id) ? null : 'none'));
  }

  /**
   * 표시할 라벨 id 집합을 구한다.
   * @param {number} k 배율
   * @param {number} fontPx 화면상 글자 크기
   */
  _visibleLabelIds(k, fontPx) {
    const items = this.features.map((f) => {
      const m = this.meta.get(f.id);
      return {
        id: f.id,
        text: f.properties.short,
        anchor: m.anchor,
        extent: m.extent,
        forced: m.forced,
        preferred: !!f.properties.alwaysLabel,
      };
    });
    return chooseVisibleLabels(items, {
      k, fontPx, minLabelPx: this.options.minLabelPx, showAll: this.options.showAllLabels,
    });
  }
}
