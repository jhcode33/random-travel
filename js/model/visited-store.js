/**
 * 이미 다녀온 여행지 목록.
 *
 * - 다녀온 곳은 후보로 고를 수 없고, '무작위 채우기'에서도 빠진다.
 * - 브라우저(localStorage)에 저장해서 다음에 열어도 유지된다.
 *   저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 이번 방문 동안만 기억한다.
 */

/** 저장 키 (형식이 바뀌면 버전을 올린다) */
const STORAGE_KEY = 'random-travel.visited.v1';

export class VisitedStore {
  /**
   * @param {Storage|null} [storage] 기본: window.localStorage
   */
  constructor(storage = safeLocalStorage()) {
    this.storage = storage;
    /** @type {Set<string>} 다녀온 지역 unit key */
    this.keys = new Set(this._load());
  }

  /**
   * 다녀온 곳인지
   * @param {string} key unit key
   */
  has(key) {
    return this.keys.has(key);
  }

  /** 다녀온 곳 수 */
  get size() {
    return this.keys.size;
  }

  /**
   * 다녀온 곳으로 표시하거나 해제한다.
   * @param {string} key unit key
   * @returns {boolean} 바꾼 뒤 다녀온 곳인지
   */
  toggle(key) {
    if (this.keys.has(key)) this.keys.delete(key);
    else this.keys.add(key);
    this._save();
    return this.keys.has(key);
  }

  /** 모두 지운다. */
  clear() {
    this.keys.clear();
    this._save();
  }

  /**
   * 저장된 목록을 읽는다. 알 수 없는 key 는 isValid 로 걸러낼 수 있다.
   * @param {(key:string) => boolean} isValid
   */
  retainOnly(isValid) {
    let changed = false;
    for (const key of [...this.keys]) {
      if (!isValid(key)) { this.keys.delete(key); changed = true; }
    }
    if (changed) this._save();
  }

  /* ---------------- 저장 ---------------- */

  /** @returns {string[]} */
  _load() {
    try {
      const list = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(list) ? list.filter((k) => typeof k === 'string') : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify([...this.keys]));
    } catch {
      // 저장 공간을 쓸 수 없어도 화면 동작에는 영향 없음
    }
  }
}

/** localStorage 를 안전하게 가져온다 (접근만으로 오류가 나는 환경 대비). */
function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
