import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

export type IdempotencyContext = {
  key: string;
  operation: string;
  requestHash: string;
};

const idempotencyKeyPattern = /^[A-Za-z0-9_-]{8,128}$/;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function prepareIdempotency(
  key: string | undefined,
  operation: string,
  payload: unknown,
): IdempotencyContext | null {
  if (key === undefined) return null;
  if (!idempotencyKeyPattern.test(key)) {
    throw new UnprocessableEntityException({
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message:
          'A chave de idempotência deve ter de 8 a 128 caracteres seguros.',
      },
    });
  }
  return {
    key,
    operation,
    requestHash: createHash('sha256')
      .update(JSON.stringify(canonicalize(payload)))
      .digest('hex'),
  };
}

export async function findIdempotentResult(
  transaction: TransactionClient,
  studentId: string,
  context: IdempotencyContext | null,
) {
  if (!context) return null;
  const record = await transaction.idempotencyRecord.findUnique({
    where: {
      studentId_operation_idempotencyKey: {
        studentId,
        operation: context.operation,
        idempotencyKey: context.key,
      },
    },
    select: { requestHash: true, resultReference: true },
  });
  if (!record) return null;
  if (record.requestHash !== context.requestHash) {
    throw new ConflictException({
      error: {
        code: 'IDEMPOTENCY_KEY_REUSED',
        message: 'Esta chave já foi utilizada com dados diferentes.',
      },
    });
  }
  if (
    !record.resultReference ||
    typeof record.resultReference !== 'object' ||
    Array.isArray(record.resultReference)
  ) {
    throwIdempotencyResultUnavailable();
  }
  return record.resultReference as Record<string, unknown>;
}

export function recordIdempotentResult(
  transaction: TransactionClient,
  studentId: string,
  context: IdempotencyContext | null,
  resultReference: Prisma.InputJsonObject,
) {
  if (!context) return Promise.resolve();
  return transaction.idempotencyRecord.create({
    data: {
      studentId,
      operation: context.operation,
      idempotencyKey: context.key,
      requestHash: context.requestHash,
      resultReference,
    },
  });
}

export function throwIdempotencyResultUnavailable(): never {
  throw new ConflictException({
    error: {
      code: 'IDEMPOTENCY_RESULT_UNAVAILABLE',
      message: 'O resultado anterior desta operação não está disponível.',
    },
  });
}
