/**
 * 돌림판 각도 계산 (순수 함수).
 *
 * 각도 규칙
 *  - rotation 은 라디안. 0이면 0번 칸이 12시 방향에서 시작한다.
 *  - rotation 이 커지면 돌림판이 시계 방향으로 돈다.
 *  - 칸 i 의 시작 경계(기둥 i)는 12시 포인터 기준 (rotation + i·seg) 만큼 시계 방향에 있다.
 */

export const TAU = Math.PI * 2;

/**
 * 각도를 [0, 2π) 범위로 맞춘다.
 * @param {number} angle 라디안
 */
export function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

/**
 * 각도를 (-π, π] 범위로 맞춘다. (어느 쪽으로 얼마나 떨어져 있는지)
 * @param {number} angle 라디안
 */
export function signedAngle(angle) {
  const a = normalizeAngle(angle);
  return a > Math.PI ? a - TAU : a;
}

/**
 * 12시 포인터가 현재 가리키는 칸 번호.
 * @param {number} rotation
 * @param {number} count 칸 수
 */
export function indexAtPointer(rotation, count) {
  return Math.floor(normalizeAngle(-rotation) / (TAU / count)) % count;
}

/**
 * 포인터에 가장 가까운 기둥(칸 경계)과 그 상대 각도.
 * 음수면 기둥이 포인터 왼쪽(아직 지나가지 않음), 양수면 오른쪽(지나감).
 *
 * @param {number} rotation
 * @param {number} count 칸 수
 * @returns {{index:number, offset:number}}
 */
export function nearestPeg(rotation, count) {
  const seg = TAU / count;
  const raw = Math.round(-rotation / seg);
  const index = ((raw % count) + count) % count;
  return { index, offset: pegOffset(rotation, index, count) };
}

/**
 * 기둥 index 의 포인터 기준 상대 각도 (-π, π].
 * @param {number} rotation
 * @param {number} index
 * @param {number} count
 */
export function pegOffset(rotation, index, count) {
  return signedAngle(rotation + index * (TAU / count));
}
