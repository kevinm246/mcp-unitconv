import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, handleLine, TOOL_NAME, TOOL_SCHEMA, type JsonRpcRequest } from '../src/server.ts';

function capture(): { lines: string[]; write: (line: string) => void } {
  const lines: string[] = [];
  return { lines, write: (line: string) => lines.push(line) };
}

function parseOne(lines: string[]): any {
  assert.equal(lines.length, 1);
  return JSON.parse(lines[0]);
}

test('initialize replies with protocol info', () => {
  const { lines, write } = capture();
  handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' }, write);
  const msg = parseOne(lines);
  assert.equal(msg.id, 1);
  assert.equal(msg.result.protocolVersion, '2024-11-05');
  assert.deepEqual(msg.result.capabilities, { tools: {} });
});

test('notifications/initialized produces no reply', () => {
  const { lines, write } = capture();
  handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, write);
  assert.equal(lines.length, 0);
});

test('a request with no id produces no reply even for a known method', () => {
  const { lines, write } = capture();
  handleRequest({ jsonrpc: '2.0', method: 'tools/list' }, write);
  assert.equal(lines.length, 0);
});

test('tools/list returns the convert tool schema', () => {
  const { lines, write } = capture();
  handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, write);
  const msg = parseOne(lines);
  assert.deepEqual(msg.result.tools, [TOOL_SCHEMA]);
});

test('tools/call converts and returns text content', () => {
  const { lines, write } = capture();
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: TOOL_NAME, arguments: { value: 1, from: 'km', to: 'm' } },
  };
  handleRequest(req, write);
  const msg = parseOne(lines);
  assert.equal(msg.result.isError, undefined);
  assert.equal(msg.result.content[0].text, '1000 m');
});

test('tools/call reports conversion failures as an error result, not a protocol error', () => {
  const { lines, write } = capture();
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: TOOL_NAME, arguments: { value: 1, from: 'km', to: 'kg' } },
  };
  handleRequest(req, write);
  const msg = parseOne(lines);
  assert.equal(msg.error, undefined);
  assert.equal(msg.result.isError, true);
});

test('tools/call with an unknown tool name is a protocol error', () => {
  const { lines, write } = capture();
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'not-convert', arguments: {} },
  };
  handleRequest(req, write);
  const msg = parseOne(lines);
  assert.equal(msg.error.code, -32602);
});

test('unknown method is a protocol error', () => {
  const { lines, write } = capture();
  handleRequest({ jsonrpc: '2.0', id: 6, method: 'nope' }, write);
  const msg = parseOne(lines);
  assert.equal(msg.error.code, -32601);
});

test('handleLine ignores blank lines', () => {
  const { lines, write } = capture();
  handleLine('   ', write);
  assert.equal(lines.length, 0);
});

test('handleLine reports a parse error for invalid JSON', () => {
  const { lines, write } = capture();
  handleLine('{not json', write);
  const msg = parseOne(lines);
  assert.equal(msg.id, null);
  assert.equal(msg.error.code, -32700);
});

test('handleLine parses and dispatches a well-formed request', () => {
  const { lines, write } = capture();
  handleLine(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list' }), write);
  const msg = parseOne(lines);
  assert.equal(msg.id, 7);
  assert.deepEqual(msg.result.tools, [TOOL_SCHEMA]);
});
