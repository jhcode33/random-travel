/**
 * 돌림판 회전 물리 시뮬레이션 (DOM 없음).
 *
 * 실제 돌림판처럼
 *  - 처음엔 빠르고 점점 느려진다: 축 마찰(일정) + 공기 저항(속도에 비례)
 *  - 칸 경계마다 기둥이 있고, 12시의 막대(플래퍼)가 기둥에 걸린다.
 *    기둥이 막대를 밀고 지나가려면 힘이 필요해서, 느릴 때는 '넘어갈 듯 말 듯' 하다가
 *    넘어가거나, 못 넘고 뒤로 살짝 되돌아온다.
 *  - 핀은 돌림판이 도는 방향(시계 방향)으로만 휜다. 기둥이 지나가면 천이 기둥을 스치고 지나가듯
 *    반대쪽으로 튕기지 않고 부드럽게 제자리로 돌아온다 (반동 없음).
 *
 * 결과는 미리 정하지 않고, 멈춘 위치(포인터가 가리키는 칸)로 정해진다.
 * 시작 속도에 무작위 값을 섞으므로 결과는 고르게 퍼진다.
 */
import { WHEEL_PHYSICS } from '../config.js';
import { TAU, nearestPeg, pegOffset, indexAtPointer } from './spin-math.js';

/** crossSpeed 가 기준으로 하는 칸 수 */
const REF_COUNT = 10;

/** value 를 [min, max] 로 제한 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class SpinPhysics {
  /**
   * @param {number} count    칸 수
   * @param {number} rotation 현재 회전 각도
   * @param {Partial<typeof WHEEL_PHYSICS>} [params]
   */
  constructor(count, rotation, params = {}) {
    this.p = { ...WHEEL_PHYSICS, ...params };
    this.count = count;
    this.seg = TAU / count;

    /** 기둥이 막대에 닿는 각도 폭: 칸이 좁으면 칸 폭의 40% 로 줄인다 */
    this.contactWidth = Math.min(this.p.contactWidth, this.seg * 0.4);
    /**
     * 기둥 탄성: 이 속도보다 느리면 넘지 못하도록 (½ω² = ½·k·w).
     * 기둥을 넘을 때마다 ½·crossSpeed² 만큼 힘을 잃으므로, 칸이 많으면 기둥 하나의 저항을 줄여
     * 한 바퀴에 잃는 힘이 칸 수와 상관없이 비슷하게 한다.
     */
    const crossSpeed = clamp(this.p.crossSpeed * Math.sqrt(REF_COUNT / count), 0.8, 2.6);
    this.pegStiffness = (crossSpeed ** 2) / this.contactWidth;
    /** 기둥 하나를 넘는 데 필요한 힘(에너지): 막대를 끝까지 밀어 올리는 높이 */
    this.barrierEnergy = 0.5 * crossSpeed ** 2;
    /**
     * 기둥에 닿아 있는 동안의 마찰.
     * 닿아 있는 시간 비율(contactWidth / seg)로 나눠서, 칸이 많든 적든 평균 마찰이 같게 한다.
     */
    this.contactFriction = this.p.pegFriction * (this.seg / this.contactWidth);

    this.rotation = rotation;
    this.omega = 0;            // 돌림판 각속도
    this.flapper = 0;          // 핀 휨 정도 (0 이상, 양수 = 끝이 도는 방향인 오른쪽으로)
    /** @type {{index:number, side:number}|null} 핀에 걸린 기둥 (side 는 항상 -1: 왼쪽에서 들어옴) */
    this.engaged = null;
    this.elapsed = 0;
    this.stopped = true;
  }

  /* ================= 공개 메서드 ================= */

  /**
   * 돌림판을 밀어서 출발시킨다.
   * @param {number} speed 시작 각속도 (rad/s, 양수 = 시계 방향)
   */
  launch(speed) {
    this.omega = speed;
    this.elapsed = 0;
    this.stopped = false;
  }

  /**
   * dt 초만큼 시뮬레이션을 진행한다. 안정성을 위해 작은 간격으로 나눠 계산한다.
   * @param {number} dt 초
   */
  advance(dt) {
    const h = this.p.stepSec;
    for (let t = 0; t < dt; t += h) this._step(Math.min(h, dt - t));
  }

  /** 돌림판과 막대가 모두 멈췄는지 */
  get finished() {
    const flapperQuiet = this.flapper < 0.003;
    return (this.stopped && (flapperQuiet || this.engaged)) || this.elapsed > this.p.maxSec;
  }

  /** 포인터가 가리키는 칸 */
  get index() {
    return indexAtPointer(this.rotation, this.count);
  }

  /* ================= 한 단계 계산 ================= */

  /** @param {number} h 초 */
  _step(h) {
    this.elapsed += h;
    this._updateContact();
    const torque = this._pegTorque();
    this._integrateWheel(torque, h);
    this._integrateFlapper(h);
  }

  /**
   * 막대에 걸린 기둥을 갱신한다.
   * - 걸린 기둥이 막대를 넘어가면(부호가 바뀜) 풀리고, 휘었던 막대가 돌림판을 앞으로 밀어준다.
   * - 못 넘고 되돌아 나가면 풀리면서 대부분의 속도를 잃는다 (흔들리지 않고 곧 멈추게).
   * - 걸린 게 없으면, 막대 쪽으로 다가오는 가장 가까운 기둥이 접촉 폭 안에 들어올 때 건다.
   */
  _updateContact() {
    const w = this.contactWidth;
    if (this.engaged) {
      const d = pegOffset(this.rotation, this.engaged.index, this.count);
      if (this.engaged.side * d <= 0) this._onPegPassed();
      else if (Math.abs(d) >= w) this._onPegBouncedBack();
      return;
    }
    const { index, offset } = nearestPeg(this.rotation, this.count);
    // 핀은 도는 방향(시계 방향)으로만 휜다: 시계 방향으로 돌면서 왼쪽에서 다가오는 기둥만 건다.
    // (되돌아갈 때 오른쪽 기둥에 걸려 핀이 반대로 꺾이는 일이 없도록)
    const approachingClockwise = offset < 0 && this.omega > 0;
    if (Math.abs(offset) < w && approachingClockwise) this.engaged = { index, side: -1 };
  }

  /**
   * 기둥이 막대를 넘어갔다.
   * 막대에 쌓였던 힘의 일부(pegRestitution)가 돌림판을 다시 밀어준다.
   * 그래서 기둥 하나를 넘을 때 실제로 잃는 힘은 작고, 넘을 때마다 '꽉 막혔다가 툭 넘어가는' 느낌이 난다.
   * 마지막 몇 개의 기둥은 남은 힘이 넘는 데 필요한 힘과 거의 같아 간신히 넘어간다.
   */
  _onPegPassed() {
    const dir = -this.engaged.side;                       // 넘어간 방향
    const kick = 2 * this.p.pegRestitution * this.barrierEnergy;
    this.omega = dir * Math.sqrt(this.omega ** 2 + kick);
    this.stopped = false;
    this.engaged = null;
  }

  /** 기둥이 막대를 못 넘고 되돌아 나갔다: 속도를 대부분 잃는다. */
  _onPegBouncedBack() {
    this.omega *= this.p.bounceKeep;
    this.engaged = null;
  }

  /** 걸린 기둥이 얼마나 깊이 막대를 밀고 있는지 (0 ~ 1) */
  _contactDepth() {
    if (!this.engaged) return 0;
    const d = pegOffset(this.rotation, this.engaged.index, this.count);
    return Math.max(0, 1 - Math.abs(d) / this.contactWidth);
  }

  /** 막대가 기둥을 되미는 힘: 기둥이 들어온 쪽으로 밀어낸다. */
  _pegTorque() {
    if (!this.engaged) return 0;
    return this.engaged.side * this.pegStiffness * this._contactDepth();
  }

  /**
   * 돌림판 각속도·각도 갱신.
   * 마찰은 운동 반대 방향. 거의 멈춘 상태에서 막대의 힘이 마찰보다 작으면 그대로 멈춘다.
   * @param {number} torque 막대가 미는 힘
   * @param {number} h 초
   */
  _integrateWheel(torque, h) {
    const friction = this.p.friction + (this.engaged ? this.contactFriction : 0);

    if (Math.abs(this.omega) < 1e-3) {
      if (Math.abs(torque) <= friction) {   // 정지 마찰이 이김 → 정지
        this.omega = 0;
        this.stopped = true;
        return;
      }
      this.stopped = false;
      this.omega += (torque - Math.sign(torque) * friction) * h;
    } else {
      const before = this.omega;
      // 공기 저항: 속도에 비례(drag) + 속도의 제곱에 비례(dragQuad)
      //  → 빠를 땐 크게 줄고, 느려지면 거의 줄지 않아 느린 구간이 길어진다.
      const air = this.p.drag * this.omega + this.p.dragQuad * this.omega * Math.abs(this.omega);
      this.omega += (torque - Math.sign(this.omega) * friction - air) * h;
      // 마찰만으로 방향이 뒤집히지는 않는다
      if (Math.sign(before) !== Math.sign(this.omega) && Math.abs(torque) <= friction) this.omega = 0;
    }
    this.rotation += this.omega * h;
  }

  /**
   * 막대 기울기 갱신.
   * 기둥에 닿아 있으면 기둥에 밀린 만큼 기울고, 풀리면 스프링처럼 흔들리며 돌아온다.
   * @param {number} h 초
   */
  _integrateFlapper(h) {
    if (this.engaged) {
      // 기둥에 닿아 있는 동안: 기둥이 민 만큼 도는 방향(오른쪽)으로 휜다
      this.flapper = this.p.flapperMax * this._contactDepth();
      return;
    }
    // 기둥이 지나간 뒤: 천처럼 반대쪽으로 튕기지 않고 부드럽게 곧게 펴진다 (지수 감소, 0 밑으로 내려가지 않음)
    this.flapper *= Math.exp(-h / this.p.flapperReturnSec);
    if (this.flapper < 1e-4) this.flapper = 0;
  }
}
