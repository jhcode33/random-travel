/**
 * 후보 선택 상태 (DOM 과 무관한 순수 로직).
 *
 * - target  : 고를 후보 개수
 * - selected: 선택한 지역 key (선택 순서 유지)
 * - picked  : 1차 돌림판에서 뽑힌 key (선택이 바뀌면 지워짐)
 */
import { SELECTION } from '../config.js';

export class SelectionModel {
  /**
   * @param {object} [opts]
   * @param {number} [opts.min]
   * @param {number} [opts.max]
   * @param {number} [opts.initial]
   */
  constructor({ min = SELECTION.MIN_TARGET, max = SELECTION.MAX_TARGET, initial = SELECTION.DEFAULT_TARGET } = {}) {
    this.min = min;
    this.max = max;
    this.target = clamp(initial, min, max);
    /** @type {string[]} */
    this.selected = [];
    /** @type {string|null} */
    this.picked = null;
  }

  /**
   * 현재 진행 상황 요약.
   * @returns {{count:number, target:number, remaining:number, over:number, ready:boolean}}
   */
  status() {
    const count = this.selected.length;
    return {
      count,
      target: this.target,
      remaining: Math.max(0, this.target - count),
      over: Math.max(0, count - this.target),
      ready: count === this.target,
    };
  }

  /** @param {string} key */
  isSelected(key) {
    return this.selected.includes(key);
  }

  /** 더 고를 수 없는지 (목표 개수에 도달) */
  isFull() {
    return this.selected.length >= this.target;
  }

  /**
   * 선택/해제를 토글한다.
   * @param {string} key
   * @returns {'added'|'removed'|'full'} 결과 ('full' 이면 아무것도 바뀌지 않음)
   */
  toggle(key) {
    const i = this.selected.indexOf(key);
    if (i >= 0) {
      this.selected.splice(i, 1);
    } else if (this.isFull()) {
      return 'full';
    } else {
      this.selected.push(key);
    }
    this.picked = null;
    return i >= 0 ? 'removed' : 'added';
  }

  /**
   * 목표 개수를 바꾼다. 범위를 벗어나면 맞춰진다.
   * 이미 고른 수가 더 많아지면 그대로 두고 status().over 로 알린다.
   * @param {number|string} value
   * @returns {number} 적용된 값
   */
  setTarget(value) {
    const n = Math.round(Number(value));
    const valid = String(value).trim() !== '' && Number.isFinite(n);   // 빈 칸·글자는 무시
    this.target = valid ? clamp(n, this.min, this.max) : this.target;
    this.picked = null;
    return this.target;
  }

  /** 선택을 모두 지운다. */
  clear() {
    this.selected = [];
    this.picked = null;
  }

  /**
   * 남은 자리를 무작위로 채운다.
   * @param {string[]} allKeys 고를 수 있는 전체 key
   */
  fillRandom(allKeys) {
    const rest = shuffle(allKeys.filter((k) => !this.isSelected(k)));
    this.selected.push(...rest.slice(0, this.status().remaining));
    this.picked = null;
  }

  /**
   * 1차 돌림판 결과를 기록한다.
   * @param {string|null} key
   */
  setPicked(key) {
    this.picked = key;
  }
}

/* ---------------- 내부 함수 ---------------- */

/** value 를 [min, max] 로 제한 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** 피셔–예이츠 셔플 (원본을 바꾸지 않음) */
function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
