/**
 * 돌림판 컴포넌트 (Canvas).
 *
 * spin(power) 로 돌린다. power(0~1)는 버튼을 누른 세기이며 시작 속도를 정한다.
 * 회전은 SpinPhysics 가 계산하고(처음엔 빠르고 점점 느려짐, 기둥에 걸리는 막대),
 * 멈춘 위치에서 12시 막대가 가리키는 칸이 결과가 된다.
 */
import { WHEEL_OPTIONS } from '../config.js';
import { drawWheel, FONT_FAMILY } from './wheel-renderer.js';
import { SpinPhysics } from './spin-physics.js';
import { normalizeAngle } from './spin-math.js';

/** 한 프레임에서 계산할 최대 시간 (탭이 숨겨졌다 돌아올 때 순간이동 방지) */
const MAX_FRAME_SEC = 0.05;

export class Wheel {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [options]
   * @param {string} [options.emptyText] 항목이 없을 때 안내 문구
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = { emptyText: '지역을 선택하세요', ...WHEEL_OPTIONS, ...options };

    /** @type {{label: string}[]} */
    this.items = [];
    this.rotation = 0;
    this.flapper = 0;
    this.flapperTip = 0;
    this.winnerIndex = -1;
    this.spinning = false;
    this.size = 0;

    new ResizeObserver(() => this._resize()).observe(canvas);
    this._resize();
  }

  /**
   * 항목을 바꾼다. 당첨 강조는 지워진다.
   * @param {{label: string}[]} items
   */
  setItems(items) {
    this.items = items.slice();
    this.winnerIndex = -1;
    this.draw();
    this._loadFontFor(this.items.map((it) => it.label).join(''));
  }

  /**
   * 라벨에 쓰인 글자의 웹폰트를 내려받은 뒤 다시 그린다.
   * (글꼴을 필요한 글자만 나눠 받기 때문에, 캔버스에만 쓰인 글자는 따로 요청해야 한다)
   * @param {string} text
   */
  _loadFontFor(text) {
    if (!document.fonts?.load || !text) return;
    document.fonts.load(`700 16px ${FONT_FAMILY}`, text)
      .then(() => { if (!this.spinning) this.draw(); })
      .catch(() => {});
  }

  /** 현재 상태로 다시 그린다. (웹폰트 로드 후 등) */
  draw() {
    drawWheel(this.ctx, {
      size: this.size,
      items: this.items,
      rotation: this.rotation,
      flapper: this.flapper,
      flapperTip: this.flapperTip,
      winnerIndex: this.spinning ? -1 : this.winnerIndex,
      emptyText: this.options.emptyText,
    });
  }

  /**
   * 돌림판을 돌린다.
   * @param {number} [power] 버튼 세기 0~1 (클수록 빠르게 출발)
   * @returns {Promise<{index: number, item: object}>} 멈춘 칸
   */
  spin(power = 0.5) {
    if (this.spinning || this.items.length === 0) {
      return Promise.reject(new Error('지금은 돌릴 수 없습니다'));
    }
    const physics = new SpinPhysics(this.items.length, this.rotation);
    physics.launch(this._launchSpeed(power));

    this.spinning = true;
    this.winnerIndex = -1;
    return this._animate(physics).then(() => {
      this.spinning = false;
      this.winnerIndex = physics.index;
      this.rotation = normalizeAngle(physics.rotation);
      this.draw();
      return { index: this.winnerIndex, item: this.items[this.winnerIndex] };
    });
  }

  /**
   * 버튼 세기 → 시작 속도. 같은 세기여도 결과가 달라지도록 무작위로 조금 섞는다.
   * @param {number} power 0~1
   */
  _launchSpeed(power) {
    const { minSpeed, maxSpeed, speedJitter } = this.options;
    const p = Math.min(1, Math.max(0, power));
    const base = minSpeed + (maxSpeed - minSpeed) * p;
    return base * (1 + (Math.random() * 2 - 1) * speedJitter);
  }

  /**
   * 물리 시뮬레이션을 화면 프레임마다 진행하며 그린다.
   * @param {SpinPhysics} physics
   * @returns {Promise<void>} 돌림판과 막대가 모두 멈추면 끝
   */
  _animate(physics) {
    return new Promise((resolve) => {
      let last = performance.now();
      const frame = (now) => {
        const dt = Math.min(MAX_FRAME_SEC, (now - last) / 1000);
        last = now;
        physics.advance(dt);
        this.rotation = physics.rotation;

        // ▼▼▼ 핀 움직임 켜기/끄기 ▼▼▼
        // 아래 두 줄이 켜져 있으면 핀이 기둥에 밀려 휘었다가 천처럼 펴진다.
        // 두 줄을 주석(//) 처리하면 핀이 곧게 고정된다(this.flapper = 0 그대로).
        // (핀 모양만 바뀌고, 돌림판이 기둥에 걸려 느려지는 움직임·결과는 똑같다)
        this.flapper = physics.flapper;
        this.flapperTip = physics.flapperTip;
        // ▲▲▲ 핀 움직임 켜기/끄기 ▲▲▲

        this.draw();
        if (physics.finished) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  /** 캔버스 크기를 화면 크기·기기 픽셀 비율에 맞춘다. */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    this.size = this.canvas.clientWidth || 400;
    this.canvas.width = Math.round(this.size * dpr);
    this.canvas.height = Math.round(this.size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }
}
