/**
 * 돌림판 회전 물리(SpinPhysics) 검사.
 * - 공정성: 결과가 특정 칸에 몰리지 않는다 (카이제곱 검정)
 * - 회전 시간: 빠른 구간·느린 구간·아주 느린 구간이 정해 둔 범위 안에 있다
 * - 핀: 반대쪽으로 튕기지 않고(휨 값이 0 이상), 한 프레임에 급하게 움직이지 않는다
 *
 * 난수는 시드를 고정해서 매번 같은 결과가 나오게 한다 (CI 에서 가끔 실패하는 일이 없도록).
 * WHEEL_PHYSICS 를 일부러 바꿔 시간이 달라졌다면 아래 TIMING 범위도 함께 고친다.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpinPhysics } from '../js/wheel/spin-physics.js';
import { TAU, indexAtPointer } from '../js/wheel/spin-math.js';
import { WHEEL_OPTIONS } from '../js/config.js';
import { seededRandom } from './helpers.js';

/** 빠른 구간 기준 속도: 초당 반 바퀴 (rad/s) */
const FAST_SPEED = Math.PI;
/** 아주 느린 구간 기준 속도 (rad/s) */
const CRAWL_SPEED = 0.6;
/** 화면 한 프레임 (초) */
const FRAME = 1 / 60;

/** 칸 10개·중간 세기 기준 허용 범위 (초) */
const TIMING = {
  fast: [8, 14],
  slow: [24, 40],
  crawl: [6, 13],
};

/**
 * 한 번 돌려 본다 (Wheel 의 시작 속도 계산과 같은 방식).
 * @param {number} count 칸 수
 * @param {number} power 0~1
 * @param {() => number} rand 난수
 */
function spin(count, power, rand) {
  const { minSpeed, maxSpeed, speedJitter } = WHEEL_OPTIONS;
  const physics = new SpinPhysics(count, rand() * TAU);
  const base = minSpeed + (maxSpeed - minSpeed) * power;
  physics.launch(base * (1 + (rand() * 2 - 1) * speedJitter));

  const r = { fast: 0, slow: 0, crawl: 0, minBend: 0, maxStep: 0 };
  let prevBend = 0;
  while (!physics.finished) {
    physics.advance(FRAME);
    const w = Math.abs(physics.omega);
    if (w > FAST_SPEED) r.fast += FRAME; else r.slow += FRAME;
    if (w < CRAWL_SPEED && !physics.stopped) r.crawl += FRAME;
    r.minBend = Math.min(r.minBend, physics.flapper, physics.flapperTip);
    r.maxStep = Math.max(r.maxStep, Math.abs(physics.flapper - prevBend));
    prevBend = physics.flapper;
  }
  r.index = physics.index;
  r.timedOut = physics.elapsed > physics.p.maxSec;
  return r;
}

/** 가운데 값 */
function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s[s.length >> 1];
}

/**
 * 카이제곱 임계값 (유의수준 0.001) — Wilson–Hilferty 근사.
 * @param {number} df 자유도
 */
function chiSquareCritical(df) {
  const z = 3.09;
  return df * (1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df))) ** 3;
}

test('포인터가 가리키는 칸 계산', () => {
  assert.equal(indexAtPointer(0, 4), 0);
  assert.equal(indexAtPointer(-0.1, 4), 0);
  assert.equal(indexAtPointer(0.1, 4), 3);        // 시계 방향으로 조금 돌면 마지막 칸이 12시로
  assert.equal(indexAtPointer(-TAU / 4 - 0.01, 4), 1);
});

for (const count of [2, 7, 10, 40]) {
  test(`공정성: ${count}칸`, () => {
    const rand = seededRandom(1000 + count);
    const N = count * 60;
    const hits = new Array(count).fill(0);
    for (let i = 0; i < N; i++) hits[spin(count, rand(), rand).index]++;
    const expected = N / count;
    const chi = hits.reduce((s, h) => s + (h - expected) ** 2 / expected, 0);
    const limit = chiSquareCritical(count - 1);
    assert.ok(chi < limit, `카이제곱 ${chi.toFixed(1)} ≥ 임계값 ${limit.toFixed(1)} (칸별: ${hits.join(',')})`);
  });
}

test('회전 시간: 칸 10개·중간 세기', () => {
  const rand = seededRandom(42);
  const runs = Array.from({ length: 40 }, () => spin(10, 0.5, rand));
  assert.ok(runs.every((r) => !r.timedOut), '최대 회전 시간(maxSec) 안에 멈춰야 함');
  for (const [phase, [lo, hi]] of Object.entries(TIMING)) {
    const m = median(runs.map((r) => r[phase]));
    assert.ok(m >= lo && m <= hi, `${phase} 구간 ${m.toFixed(1)}초 (허용 ${lo}~${hi}초)`);
  }
});

test('핀: 반대쪽으로 튕기지 않고 부드럽게 움직인다', () => {
  const rand = seededRandom(7);
  for (const count of [4, 10, 40]) {
    for (let i = 0; i < 10; i++) {
      const r = spin(count, rand(), rand);
      assert.ok(r.minBend >= 0, `${count}칸: 핀이 반대로 휨 (${r.minBend})`);
      assert.ok(r.maxStep < 0.3, `${count}칸: 한 프레임에 핀이 ${r.maxStep.toFixed(2)}rad 움직임`);
    }
  }
});
