/**
 * 모든 JS 파일이 문법 오류 없이 ES 모듈로 읽히는지 검사한다.
 * (변수 이름 중복 같은 실수로 페이지 전체가 멈추는 것을 막는다)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './helpers.js';

/** dir 아래의 .js 파일 전체 */
function listJs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listJs(full);
    return name.endsWith('.js') ? [full] : [];
  });
}

const files = listJs(path.join(ROOT, 'js'));

test('js 폴더에 검사할 파일이 있다', () => {
  assert.ok(files.length > 10, `JS 파일 수: ${files.length}`);
});

for (const file of files) {
  test(`문법 검사: ${path.relative(ROOT, file)}`, () => {
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });
}
