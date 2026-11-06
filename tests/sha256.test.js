import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {sha256Hex} from '../src/sha256.js';
for(const v of ['', 'hello', 'काम ₹650', 'a'.repeat(257)])test('SHA-256 offline fallback matches Node cryptography '+v.slice(0,10),()=>assert.equal(sha256Hex(v),createHash('sha256').update(v).digest('hex')));
