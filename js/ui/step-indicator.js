/**
 * 상단 단계 표시 (① 후보 선택 → ② 여행지 돌림판 → ③ 세부 지역 돌림판).
 */
export const STEP = Object.freeze({
  SELECT: 1,
  PICK: 2,
  DETAIL: 3,
  /** 모든 단계 완료 (세부 지역이 없어 2단계에서 최종 결과가 나온 경우 등) */
  DONE: 4,
});

export class StepIndicator {
  /**
   * @param {HTMLElement[]} items 단계 순서대로의 <li> 요소
   */
  constructor(items) {
    this.items = items;
  }

  /**
   * 현재 단계를 표시한다. 이전 단계는 완료로 표시된다.
   * @param {number} step STEP 값 (1부터, DONE 이면 모두 완료)
   */
  set(step) {
    this.items.forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
      el.classList.toggle('done', i + 1 < step);
    });
  }
}
