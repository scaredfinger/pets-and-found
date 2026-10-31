import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { greeting } from './index.ts'

test('greets a trimmed name and defaults to world', () => {
  assert.equal(greeting('  Cinderling  '), 'Hello, Cinderling!')
  assert.equal(greeting('  '), 'Hello, world!')
  assert.equal(greeting(), 'Hello, world!')
})
