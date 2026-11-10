/**
 * 꾹 눌러서 힘을 모으는 돌림판 버튼.
 *
 * - 누르고 있는 동안 힘 게이지가 0 → 1 → 0 … 으로 왕복한다 (원하는 순간에 떼기).
 * - 떼면 그때의 힘(0~1)으로 onRelease(power) 를 호출한다.
 * - 마우스·터치·키보드(Space/Enter) 모두 지원.
 */
import { WHEEL_OPTIONS } from '../config.js';

/** 짧게 톡 눌러도 이 정도 힘은 들어간다 */
const MIN_POWER = 0.08;

export class SpinButton {
  /**
   * @param {object} els
   * @param {HTMLButtonElement} els.button
   * @param {HTMLElement} els.gauge      힘 게이지 바깥 요소 (.power-meter)
   * @param {(power:number) => void} onRelease
   */
  constructor({ button, gauge }, onRelease) {
    this.button = button;
    this.gauge = gauge;
    this.fill = gauge.querySelector('.power-fill');
    this.onRelease = onRelease;
    this.chargeMs = WHEEL_OPTIONS.chargeMs;

    this.charging = false;
    this.startedAt = 0;
    this.power = 0;
    this.idleText = button.textContent;

    this._bindPointer();
    this._bindKeyboard();
  }

  /**
   * 평상시 버튼 문구를 바꾼다 (예: '다시 돌리기').
   * @param {string} text
   */
  setText(text) {
    this.idleText = text;
    if (!this.charging) this.button.textContent = text;
  }

  /* ================= 입력 ================= */

  /** 마우스·터치 */
  _bindPointer() {
    const b = this.button;
    b.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      b.setPointerCapture?.(ev.pointerId);   // 손가락이 버튼 밖으로 나가도 계속 충전
      this._start();
    });
    b.addEventListener('pointerup', () => this._release());
    b.addEventListener('pointercancel', () => this._cancel());
    b.addEventListener('contextmenu', (ev) => ev.preventDefault()); // 길게 누를 때 메뉴 방지
  }

  /** 키보드: Space / Enter 를 누르고 있다가 떼기 */
  _bindKeyboard() {
    const isKey = (ev) => ev.key === ' ' || ev.key === 'Enter';
    this.button.addEventListener('keydown', (ev) => {
      if (!isKey(ev)) return;
      ev.preventDefault();
      if (!ev.repeat) this._start();
    });
    this.button.addEventListener('keyup', (ev) => {
      if (!isKey(ev)) return;
      ev.preventDefault();
      this._release();
    });
  }

  /* ================= 충전 ================= */

  /** 힘 모으기 시작 */
  _start() {
    if (this.button.disabled || this.charging) return;
    this.charging = true;
    this.startedAt = performance.now();
    this.button.classList.add('charging');
    this.gauge.classList.add('active');
    this.button.textContent = '놓으면 출발!';
    this._tick();
  }

  /** 누르고 있는 동안 게이지를 갱신한다. */
  _tick() {
    if (!this.charging) return;
    this.power = powerAt(performance.now() - this.startedAt, this.chargeMs);
    this.fill.style.width = `${Math.round(this.power * 100)}%`;
    requestAnimationFrame(() => this._tick());
  }

  /** 손을 떼면 출발 */
  _release() {
    if (!this.charging) return;
    const power = Math.max(MIN_POWER, this.power);
    this._reset();
    this.onRelease(power);
  }

  /** 충전 취소 (터치가 끊긴 경우 등) */
  _cancel() {
    if (this.charging) this._reset();
  }

  /** 버튼·게이지를 평상시 상태로 */
  _reset() {
    this.charging = false;
    this.button.classList.remove('charging');
    this.gauge.classList.remove('active');
    this.fill.style.width = '0%';
    this.button.textContent = this.idleText;
  }
}

/**
 * 누른 시간 → 힘. 0 → 1 → 0 으로 왕복한다.
 * @param {number} elapsedMs
 * @param {number} periodMs 0 → 1 걸리는 시간
 */
export function powerAt(elapsedMs, periodMs) {
  const phase = (elapsedMs / periodMs) % 2;
  return phase <= 1 ? phase : 2 - phase;
}
