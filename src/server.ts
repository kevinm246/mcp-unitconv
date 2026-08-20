#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { convert, supportedUnits } from './units.ts';

/**
 * Minimal MCP server over stdio: newline-delimited JSON-RPC 2.0, no framing headers.
 * Written against the raw protocol instead of the SDK so this package stays
 * dependency-free.
 */

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

const TOOL_NAME = 'convert';

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description:
    'Convert a numeric value between units of the same dimension (length, mass, time, temperature).',
  inputSchema: {
    type: 'object',
    properties: {
      value: { type: 'number', description: 'the quantity to convert' },
      from: { type: 'string', description: `unit to convert from, one of: ${supportedUnits().join(', ')}` },
      to: { type: 'string', description: `unit to convert to, one of: ${supportedUnits().join(', ')}` },
    },
    required: ['value', 'from', 'to'],
  },
};

function reply(id: JsonRpcRequest['id'], result: unknown): void {
  if (id === undefined) return; // notifications carry no id and expect no response
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function replyError(id: JsonRpcRequest['id'], code: number, message: string): void {
  if (id === undefined) return;
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

function handleToolCall(req: JsonRpcRequest): void {
  const params = req.params ?? {};
  if (params.name !== TOOL_NAME) {
    replyError(req.id, -32602, `unknown tool: ${String(params.name)}`);
    return;
  }
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  try {
    const result = convert(Number(args.value), String(args.from), String(args.to));
    reply(req.id, { content: [{ type: 'text', text: `${result.value} ${result.to}` }] });
  } catch (err) {
    // conversion failures are tool results, not protocol errors
    reply(req.id, {
      content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    });
  }
}

function handleRequest(req: JsonRpcRequest): void {
  switch (req.method) {
    case 'initialize':
      reply(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'mcp-unitconv', version: '0.1.0' },
      });
      return;
    case 'notifications/initialized':
      return;
    case 'tools/list':
      reply(req.id, { tools: [TOOL_SCHEMA] });
      return;
    case 'tools/call':
      handleToolCall(req);
      return;
    default:
      replyError(req.id, -32601, `unknown method: ${req.method}`);
  }
}

const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req: JsonRpcRequest;
  try {
    req = JSON.parse(trimmed);
  } catch {
    replyError(null, -32700, 'parse error');
    return;
  }
  handleRequest(req);
});
