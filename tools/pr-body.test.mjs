import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseIssues, renderBody, checkBody } from './pr-body.mjs';

test('single and combined issues render standalone closing lines', () => {
  assert.deepEqual(parseIssues(' 5 , 6,7 '), [5, 6, 7]);
  assert.equal(renderBody('12', 'Summary\n'), 'Summary\n\nCloses #12\n');
  const body = renderBody('5,6,7', 'Summary\n\nRelated to #8');
  assert.equal(body, 'Summary\n\nRelated to #8\n\nCloses #5\nCloses #6\nCloses #7\n');
  assert.deepEqual(checkBody('5,6,7', body), [5, 6, 7]);
});

test('malformed, empty, unsafe and duplicate approved sets fail', () => {
  for (const value of ['', ' ', '5,', ',5', '5,,6', '5 x', '-1', '0', '9007199254740993', '5,05', '5, 5']) assert.throws(() => parseIssues(value));
});

test('missing, extra, repeated and non-standalone closing references fail', () => {
  for (const body of ['Closes #5', 'Closes #5, relates to #6 and #7', 'Closes #5\nCloses #6\nCloses #6\nCloses #7', 'Closes #5\nCloses #6\nCloses #7\nFixes #8', 'Closes #5\nCloses #6\nCloses #7 and more', 'Closes #5\nCloses #6\n```\nCloses #7\n```']) assert.throws(() => checkBody('5,6,7', body));
  assert.throws(() => renderBody('5', 'Already fixes #5'));
  assert.throws(() => checkBody('12', 'Closes #12\nCloses #13'));
});
