import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

type CorrelatedRequest = Request & { requestId?: string };

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveRequestId(request: CorrelatedRequest) {
  if (request.requestId) return request.requestId;
  const received = request.header('x-request-id');
  request.requestId =
    received && requestIdPattern.test(received) ? received : randomUUID();
  return request.requestId;
}

@Injectable()
export class RequestCorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();
    const requestId = resolveRequestId(request);
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      map((payload: unknown) => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return { data: payload, meta: { request_id: requestId } };
        }
        const objectPayload = payload as Record<string, unknown>;
        const currentMeta =
          objectPayload.meta && typeof objectPayload.meta === 'object'
            ? (objectPayload.meta as Record<string, unknown>)
            : {};
        return {
          ...objectPayload,
          meta: { ...currentMeta, request_id: requestId },
        };
      }),
    );
  }
}

@Catch()
export class RequestCorrelationExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();
    const requestId = resolveRequestId(request);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as Record<string, unknown>)
        : {};
    const domainError =
      body.error && typeof body.error === 'object'
        ? (body.error as Record<string, unknown>)
        : null;
    const error = domainError ?? {
      code:
        status === HttpStatus.BAD_REQUEST
          ? 'VALIDATION_ERROR'
          : status === HttpStatus.INTERNAL_SERVER_ERROR
            ? 'INTERNAL_ERROR'
            : `HTTP_${status}`,
      message:
        status === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Não foi possível concluir a solicitação.'
          : typeof body.message === 'string'
            ? body.message
            : 'A solicitação não pôde ser concluída.',
      ...(Array.isArray(body.message) ? { details: body.message } : {}),
    };

    response.setHeader('x-request-id', requestId);
    response.status(status).json({
      error,
      meta: { request_id: requestId },
    });
  }
}
