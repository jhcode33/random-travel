/**
 * 돌림판 Canvas 그리기 함수 모음.
 * 상태를 갖지 않으며, Wheel 클래스가 매 프레임 drawWheel() 을 호출한다.
 *
 * 구성 (바깥 → 안쪽)
 *  - 테두리 + 칸 경계마다 기둥(peg)
 *  - 칸과 라벨: 라벨은 항상 '바깥 → 안쪽' 방향으로 쓰여 돌아가도 방향이 바뀌지 않는다
 *  - 가운데 원
 *  - 12시 방향 막대(플래퍼): 기둥에 걸려 휘었다가 튕겨 돌아온다
 */
import { TAU } from './spin-math.js';

const COLORS = {
  rim: '#1f2a24',
  empty: '#eef3e8',
  emptyText: '#66746b',
  text: '#1f2a24',
  winner: '#ffd166',          // 당첨 칸: 진한 파스텔 노랑 (검정 글자가 잘 보임)
  winnerText: '#1f2a24',
  winnerEdge: '#1f2a24',
  divider: 'rgba(255,255,255,.85)',
  hub: '#ffffff',
  peg: '#fff7d6',
  pegEdge: '#8a6d1f',
  flapper: '#1f2a24',
  flapperTip: '#ff6b4a',
  pivot: '#ffc23d',
};
/** 돌림판 글꼴 (페이지와 같은 Pretendard) */
export const FONT_FAMILY = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

/* 크기 비율 (캔버스 한 변 대비) */
const RIM_PAD = 0.075;      // 바깥 여백 (막대가 들어갈 자리)
const RIM_WIDTH = 0.022;    // 테두리 두께
const PEG_INSET = 0.02;     // 기둥이 테두리 안쪽으로 들어간 정도
const PEG_RADIUS = 0.013;
const HUB_RATIO = 0.07;     // 가운데 원 반지름
const LABEL_GAP = 0.03;     // 라벨과 기둥·가운데 원 사이 여백
const FLAPPER = { pivotY: 0.03, tipY: 0.125, baseWidth: 0.034, tipWidth: 0.012 };

/**
 * 돌림판 전체를 그린다.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} s
 * @param {number} s.size          캔버스 한 변(CSS px)
 * @param {{label:string}[]} s.items
 * @param {number} s.rotation      회전 각도(라디안)
 * @param {number} s.winnerIndex   강조할 칸 (-1 이면 없음)
 * @param {number} s.flapper       핀 몸통 휨(라디안, 양수 = 오른쪽)
 * @param {number} [s.flapperTip]  핀 끝 휨 (몸통보다 늦게 따라옴. 없으면 몸통과 같음)
 * @param {string} s.emptyText     항목이 없을 때 안내 문구
 */
export function drawWheel(ctx, { size, items, rotation, winnerIndex, flapper, flapperTip = flapper, emptyText }) {
  const g = geometry(size);
  ctx.clearRect(0, 0, size, size);
  drawRim(ctx, g);

  if (items.length === 0) {
    drawEmpty(ctx, g, emptyText);
  } else {
    drawSegments(ctx, g, items, rotation, winnerIndex);
    drawPegs(ctx, g, items.length, rotation);
  }
  drawHub(ctx, g);
  drawFlapper(ctx, g, flapper, flapperTip);
}

/**
 * 칸 색상: 파스텔 톤.
 * 밝기를 82~88% 로 높게 유지해서 어떤 색이든 검정 글자가 잘 보인다.
 * 색상환을 칸 수만큼 고르게 나누고, 이웃 칸은 밝기를 조금 달리해 구분한다.
 * @param {number} i 칸 번호
 * @param {number} n 전체 칸 수
 */
export function segmentColor(i, n) {
  const hue = (i * 360) / n + 10;
  return `hsl(${hue}, 78%, ${i % 2 ? 82 : 87}%)`;
}

/* ================= 기하 ================= */

/** 크기에 따른 반지름·위치 계산 */
function geometry(size) {
  const c = size / 2;
  const r = c - size * RIM_PAD;                 // 칸 반지름
  const pegR = r - size * PEG_INSET;            // 기둥이 놓이는 반지름
  const hubR = size * HUB_RATIO;
  const inner = hubR + size * LABEL_GAP;        // 라벨 띠 안쪽
  const outer = pegR - size * LABEL_GAP;        // 라벨 띠 바깥쪽
  return {
    size, c, r, pegR, hubR,
    label: { center: (inner + outer) / 2, width: outer - inner },
  };
}

/* ================= 그리기 ================= */

/** 바깥 테두리 */
function drawRim(ctx, { c, r, size }) {
  ctx.beginPath();
  ctx.arc(c, c, r + size * RIM_WIDTH, 0, TAU);
  ctx.fillStyle = COLORS.rim;
  ctx.fill();
}

/** 항목이 없을 때의 빈 판과 안내 문구 */
function drawEmpty(ctx, { c, r, size }, text) {
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.fillStyle = COLORS.empty;
  ctx.fill();
  ctx.fillStyle = COLORS.emptyText;
  ctx.font = `500 ${Math.round(size / 24)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c, c + size / 7);
}

/** 모든 칸과 라벨 */
function drawSegments(ctx, g, items, rotation, winnerIndex) {
  const n = items.length;
  const seg = TAU / n;
  const start = rotation - Math.PI / 2;                  // 0번 칸이 12시에서 시작
  const fontPx = labelFontSize(g, n);

  items.forEach((item, i) => {
    const a0 = start + i * seg;
    const isWinner = i === winnerIndex;
    drawSegment(ctx, g, a0, seg, isWinner ? COLORS.winner : segmentColor(i, n), n);
    drawLabel(ctx, g, a0 + seg / 2, item.label, fontPx, isWinner ? COLORS.winnerText : COLORS.text);
  });
  if (winnerIndex >= 0 && winnerIndex < n) drawWinnerEdge(ctx, g, start + winnerIndex * seg, seg);
}

/** 당첨 칸 테두리를 굵게 그려 강조한다. */
function drawWinnerEdge(ctx, { c, r, size }, a0, seg) {
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, r, a0, a0 + seg);
  ctx.closePath();
  ctx.lineWidth = Math.max(2, size * 0.008);
  ctx.strokeStyle = COLORS.winnerEdge;
  ctx.stroke();
}

/** 라벨 글자 최소 크기(px). 이보다 작으면 읽을 수 없다 */
const MIN_LABEL_PX = 7;

/**
 * 칸 수에 따른 라벨 글자 크기.
 * 칸이 많거나 돌림판이 작으면 칸 폭이 좁아 옆 칸 글자와 겹치므로,
 * 라벨 띠 안쪽(가운데 원 쪽)의 칸 폭에 맞춰 글자 크기를 줄인다.
 * @param {ReturnType<typeof geometry>} g
 * @param {number} n 칸 수
 */
function labelFontSize({ size, label }, n) {
  const preferred = Math.min(size / 22, (size * 2.2) / n + 6);
  const innerRadius = label.center - label.width / 4;      // 글자가 지나가는 비교적 안쪽 지점
  const slotWidth = (TAU * innerRadius) / n;                // 그 지점의 칸 폭(px)
  return Math.max(MIN_LABEL_PX, Math.min(preferred, slotWidth * 0.82));
}

/** 부채꼴 한 칸 */
function drawSegment(ctx, { c, r }, a0, seg, color, n) {
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, r, a0, a0 + seg);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = COLORS.divider;
  ctx.lineWidth = n > 30 ? 1 : 2;
  ctx.stroke();
}

/**
 * 칸 라벨. 항상 바깥(테두리) 쪽에서 시작해 안쪽(가운데)으로 쓰인다.
 * 돌림판이 돌아도 뒤집지 않으므로 글자 방향이 일정하다.
 * @param {number} mid 칸 가운데 각도
 */
function drawLabel(ctx, { c, label }, mid, text, fontPx, color) {
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(mid + Math.PI);          // +x 축이 가운데를 향하도록 (바깥 → 안쪽)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `700 ${fontPx}px ${FONT_FAMILY}`;
  ctx.fillText(truncate(ctx, text, label.width), -label.center, 0);
  ctx.restore();
}

/** 최대 폭을 넘으면 말줄임표로 줄인다. */
function truncate(ctx, text, maxWidth) {
  let s = text;
  while (ctx.measureText(s).width > maxWidth && s.length > 2) s = s.slice(0, -2) + '…';
  return s;
}

/** 칸 경계마다 기둥 */
function drawPegs(ctx, { c, pegR, size }, n, rotation) {
  const seg = TAU / n;
  const radius = size * PEG_RADIUS;
  for (let i = 0; i < n; i++) {
    const a = rotation - Math.PI / 2 + i * seg;
    const x = c + pegR * Math.cos(a);
    const y = c + pegR * Math.sin(a);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = COLORS.peg;
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.strokeStyle = COLORS.pegEdge;
    ctx.stroke();
  }
}

/** 가운데 원 */
function drawHub(ctx, { c, hubR }) {
  ctx.beginPath();
  ctx.arc(c, c, hubR, 0, TAU);
  ctx.fillStyle = COLORS.hub;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLORS.rim;
  ctx.stroke();
}

/**
 * 12시 방향 핀. 위쪽 받침에 고정되어 있고, 몸통만 휘어진다(돌림판과 함께 돌지 않음).
 * 기둥에 밀리면 도는 방향으로 휘었다가, 기둥이 지나가면 천 자락처럼 끝이 늦게 따라오며 곧게 펴진다.
 * @param {number} base 몸통이 휜 정도(라디안). 양수면 오른쪽으로
 * @param {number} tip  끝이 휜 정도(라디안)
 */
function drawFlapper(ctx, { c, size }, base, tip) {
  const angle = { base, tip };
  const pivotY = size * FLAPPER.pivotY;
  const len = size * (FLAPPER.tipY - FLAPPER.pivotY);
  const path = flapperOutline(len, angle, size * FLAPPER.baseWidth / 2, size * FLAPPER.tipWidth / 2);

  ctx.save();
  ctx.translate(c, pivotY);

  // 몸통 (휘어진 핀)
  ctx.shadowColor = 'rgba(0,0,0,.3)';
  ctx.shadowBlur = size * 0.01;
  ctx.shadowOffsetY = size * 0.004;
  ctx.beginPath();
  path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = COLORS.flapper;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 끝 표시 (핀 끝을 따라 움직임)
  const tipDot = flapperPoint(len, angle, 0.93);
  ctx.beginPath();
  ctx.arc(tipDot[0], tipDot[1], size * FLAPPER.tipWidth * 0.5, 0, TAU);
  ctx.fillStyle = COLORS.flapperTip;
  ctx.fill();

  // 고정 받침 + 나사 (움직이지 않음)
  const mountW = size * FLAPPER.baseWidth * 1.5;
  const mountH = size * 0.022;
  ctx.fillStyle = COLORS.flapper;
  roundRect(ctx, -mountW / 2, -mountH * 0.75, mountW, mountH, mountH / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * FLAPPER.baseWidth * 0.32, 0, TAU);
  ctx.fillStyle = COLORS.pivot;
  ctx.fill();
  ctx.restore();
}

/**
 * 휘어진 핀 중심선 위의 점. 아래로 매달린 외팔보처럼, 받침 쪽은 곧고 끝으로 갈수록 많이 휜다.
 * 휨 정도는 받침 쪽은 몸통 값, 끝으로 갈수록 끝 값에 가까워져서 천 자락처럼 끝이 늦게 따라온다.
 * @param {number} len   핀 길이
 * @param {{base:number, tip:number}} bendAngles 몸통·끝이 휜 정도
 * @param {number} t     0(받침) ~ 1(끝)
 * @returns {[number, number]} 받침 기준 좌표 (y 는 아래가 +)
 */
function flapperPoint(len, bendAngles, t) {
  const angle = bendAngles.base + (bendAngles.tip - bendAngles.base) * t * t;
  const bend = 1.5 * t * t - 0.5 * t * t * t;            // 외팔보 처짐 모양 (t=1 에서 1)
  const x = len * Math.sin(angle) * bend;
  const y = len * t * (1 - (1 - Math.cos(angle)) * t * t * 0.9);  // 휘면 끝이 살짝 올라감
  return [x, y];
}

/**
 * 핀 몸통 외곽선 (받침은 넓고 끝은 좁은 휘어진 띠 + 둥근 끝).
 * @param {number} len
 * @param {{base:number, tip:number}} angle 몸통·끝이 휜 정도
 * @param {number} baseHalf 받침 쪽 반폭
 * @param {number} tipHalf  끝 쪽 반폭
 * @returns {Array<[number, number]>}
 */
function flapperOutline(len, angle, baseHalf, tipHalf) {
  const STEPS = 16;
  const left = [];
  const right = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const [x, y] = flapperPoint(len, angle, t);
    const [x2, y2] = flapperPoint(len, angle, Math.min(1, t + 0.01));
    const [x1, y1] = flapperPoint(len, angle, Math.max(0, t - 0.01));
    const tx = x2 - x1, ty = y2 - y1;
    const n = Math.hypot(tx, ty) || 1;
    const nx = -ty / n, ny = tx / n;                       // 중심선의 수직 방향
    const half = baseHalf + (tipHalf - baseHalf) * t;
    left.push([x + nx * half, y + ny * half]);
    right.push([x - nx * half, y - ny * half]);
  }
  // 끝을 둥글게: 마지막 두 점 사이를 반원 근사
  const [ex, ey] = flapperPoint(len, angle, 1);
  const [px, py] = flapperPoint(len, angle, 0.98);
  const dx = ex - px, dy = ey - py, dn = Math.hypot(dx, dy) || 1;
  const cap = [ex + (dx / dn) * tipHalf, ey + (dy / dn) * tipHalf];
  return [...left, cap, ...right.reverse()];
}

/** 모서리가 둥근 사각형 경로 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
