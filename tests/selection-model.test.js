/**
 * 후보 선택 상태(SelectionModel) 검사.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectionModel } from '../js/model/selection-model.js';

test('개수만큼만 담기고, 가득 차면 full 을 돌려준다', () => {
  const m = new SelectionModel({ min: 2, max: 40, initial: 2 });
  m.toggle('a');
  m.toggle('b');
  assert.ok(m.isFull());
  assert.equal(m.toggle('c'), 'full');
  assert.ok(!m.isSelected('c'));
  assert.ok(m.status().ready);
});

test('다시 누르면 빠진다', () => {
  const m = new SelectionModel({ min: 2, max: 40, initial: 3 });
  m.toggle('a');
  m.toggle('a');
  assert.ok(!m.isSelected('a'));
});

test('후보 개수는 범위 안으로 맞춰지고, 빈 값·숫자 아닌 값은 무시한다', () => {
  const m = new SelectionModel({ min: 2, max: 40, initial: 10 });
  m.setTarget(100);
  assert.equal(m.status().target, 40);
  m.setTarget(0);
  assert.equal(m.status().target, 2);
  m.setTarget(7);
  m.setTarget('');
  m.setTarget('abc');
  assert.equal(m.status().target, 7);
});

test('무작위 채우기는 남은 자리만 겹치지 않게 채운다', () => {
  const m = new SelectionModel({ min: 2, max: 40, initial: 5 });
  m.toggle('a');
  const all = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  m.fillRandom(all);
  assert.equal(m.selected.length, 5);
  assert.equal(new Set(m.selected).size, 5);
  assert.ok(m.isSelected('a'));
  assert.ok(m.selected.every((k) => all.includes(k)));
});
