/**
 * 테스트 공용 도우미 (브라우저 없이 Node 에서 앱 모듈을 돌리기 위한 준비).
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** 저장소 최상위 폴더 */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 저장소 안의 JSON 파일을 읽는다.
 * @param {string} rel 저장소 기준 경로 (예: 'data/region-info.json')
 */
export async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
}

/**
 * 브라우저 전역을 흉내 낸다.
 * - fetch: 앱이 상대 경로로 부르는 데이터 파일을 디스크에서 읽어 준다.
 * - topojson: 경계 모양은 테스트에 필요 없으므로 합친 개수만 기록하는 가짜.
 */
export function installBrowserStubs() {
  globalThis.fetch = async (url) => {
    const body = await readFile(path.join(ROOT, String(url)), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) };
  };
  globalThis.topojson = {
    merge: (_topology, geometries) => ({ type: 'MultiPolygon', coordinates: [], parts: geometries.length }),
    mesh: () => ({ type: 'MultiLineString', coordinates: [] }),
  };
}

/**
 * 시드가 있는 난수 (mulberry32). 테스트 결과가 매번 같도록 Math.random 대신 쓴다.
 * @param {number} seed
 * @returns {() => number} 0 이상 1 미만
 */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
