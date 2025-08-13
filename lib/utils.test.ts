import test from 'node:test'
import assert from 'node:assert/strict'
import { truncateEthAddress } from './utils.ts'

// Basic tests for truncateEthAddress

test('returns same address when length short', () => {
  const addr = '0x1234'
  assert.strictEqual(truncateEthAddress(addr, 3, 3), addr)
})

test('truncates long address with default lengths', () => {
  const addr = '0x1234567890abcdef1234567890abcdef12345678'
  const expected = '0x1234...5678'
  assert.strictEqual(truncateEthAddress(addr), expected)
})
