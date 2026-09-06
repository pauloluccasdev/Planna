import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { RequestCorrelationExceptionFilter } from './request-correlation.js';

describe('RequestCorrelationExceptionFilter', () => {
  it('does not expose internal exception details', () => {
    const json = vi.fn();
    const setHeader = vi.fn();
    const response = {
      setHeader,
      status: vi.fn(() => ({ json })),
    };
    const request = { header: vi.fn(() => undefined) };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    new RequestCorrelationExceptionFilter().catch(
      new Error('database secret detail'),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível concluir a solicitação.',
      },
      meta: { request_id: expect.any(String) },
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain(
      'database secret detail',
    );
    expect(setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });
});
