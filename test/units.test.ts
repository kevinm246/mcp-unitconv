import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, dimensionOf, supportedUnits } from '../src/units.ts';

test('length: km to m', () => {
  const r = convert(1, 'km', 'm');
  assert.equal(r.value, 1000);
  assert.equal(r.dimension, 'length');
});

test('length: mi to ft', () => {
  const r = convert(1, 'mi', 'ft');
  assert.ok(Math.abs(r.value - 5280) < 1e-6);
});

test('mass: kg to lb', () => {
  const r = convert(1, 'kg', 'lb');
  assert.ok(Math.abs(r.value - 2.20462262185) < 1e-9);
});

test('time: h to s', () => {
  const r = convert(2, 'h', 's');
  assert.equal(r.value, 7200);
});

test('same unit round-trips exactly', () => {
  assert.equal(convert(42, 'm', 'm').value, 42);
});

test('temperature: C to F', () => {
  assert.equal(convert(100, 'C', 'F').value, 212);
});

test('temperature: F to C', () => {
  assert.equal(convert(32, 'F', 'C').value, 0);
});

test('temperature: C to K', () => {
  assert.ok(Math.abs(convert(0, 'C', 'K').value - 273.15) < 1e-9);
});

test('temperature result carries dimension "temperature"', () => {
  assert.equal(convert(0, 'C', 'F').dimension, 'temperature');
});

test('dimension mismatch throws', () => {
  assert.throws(() => convert(1, 'km', 'kg'));
});

test('unknown source unit throws', () => {
  assert.throws(() => convert(1, 'parsec', 'm'));
});

test('unknown target unit throws', () => {
  assert.throws(() => convert(1, 'm', 'parsec'));
});

test('non-finite value throws', () => {
  assert.throws(() => convert(NaN, 'm', 'km'));
  assert.throws(() => convert(Infinity, 'm', 'km'));
});

test('dimensionOf finds the right dimension', () => {
  assert.equal(dimensionOf('kg'), 'mass');
  assert.equal(dimensionOf('ms'), 'time');
});

test('dimensionOf returns null for unknown units', () => {
  assert.equal(dimensionOf('parsec'), null);
  assert.equal(dimensionOf('C'), null);
});

test('supportedUnits lists every table entry plus the temperature units', () => {
  const units = supportedUnits();
  assert.ok(units.includes('km'));
  assert.ok(units.includes('lb'));
  assert.ok(units.includes('ms'));
  assert.ok(units.includes('C'));
  assert.ok(units.includes('F'));
  assert.ok(units.includes('K'));
});
