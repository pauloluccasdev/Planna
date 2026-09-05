import { describe, expect, it } from 'vitest';
import {
  generatePlanningProposal,
  subtractOccupiedIntervals,
  type PlanningCandidate,
} from './planning-engine.js';

const date = (value: string) => new Date(value);
const candidate = (
  overrides: Partial<PlanningCandidate> = {},
): PlanningCandidate => ({
  contentId: 'content-a',
  courseId: 'course-a',
  subjectId: 'subject-a',
  priority: 3,
  requiredSeconds: 3600,
  ...overrides,
});

describe('planning engine', () => {
  it('allocates a content inside a free interval', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-08T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
      candidates: [candidate()],
    });
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({
      contentId: 'content-a',
      plannedDurationSeconds: 3600,
    });
    expect(result.unallocatedSeconds).toBe(0);
  });

  it('splits content across the available days', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-09T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T20:00:00-03:00'),
        },
        {
          startsAt: date('2026-09-08T19:00:00-03:00'),
          endsAt: date('2026-09-08T20:00:00-03:00'),
        },
      ],
      candidates: [candidate({ requiredSeconds: 7200 })],
    });
    expect(result.blocks.map((block) => block.plannedDurationSeconds)).toEqual([
      3600, 3600,
    ]);
  });

  it('places higher priority first when neither content has an event', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-08T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
      candidates: [
        candidate({ contentId: 'low', priority: 1 }),
        candidate({ contentId: 'high', priority: 5 }),
      ],
    });
    expect(result.blocks.map(({ contentId }) => contentId)).toEqual([
      'high',
      'low',
    ]);
  });

  it('allows a nearby event to override manual priority', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-09T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
      candidates: [
        candidate({ contentId: 'high', priority: 5 }),
        candidate({
          contentId: 'exam',
          priority: 1,
          deadline: date('2026-09-08T08:00:00-03:00'),
          academicEventId: 'exam-a',
        }),
      ],
    });
    expect(result.blocks[0].contentId).toBe('exam');
    expect(result.blocks[0].explanationFactors.academicEventId).toBe('exam-a');
  });

  it('reports capacity that could not be allocated before a deadline', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-10T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T20:00:00-03:00'),
        },
      ],
      candidates: [
        candidate({
          requiredSeconds: 7200,
          deadline: date('2026-09-08T08:00:00-03:00'),
        }),
      ],
    });
    expect(result.diagnostics[0]).toMatchObject({
      requiredSeconds: 7200,
      allocatedSeconds: 3600,
      deficitSeconds: 3600,
    });
    expect(result.unallocatedSeconds).toBe(3600);
  });

  it('clips allocations to the requested period', () => {
    const result = generatePlanningProposal({
      periodStart: date('2026-09-07T19:30:00-03:00'),
      periodEnd: date('2026-09-07T20:30:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
      candidates: [candidate({ requiredSeconds: 7200 })],
    });
    expect(result.allocatedSeconds).toBe(3600);
    expect(result.blocks[0]).toMatchObject({
      startsAt: date('2026-09-07T19:30:00-03:00'),
      endsAt: date('2026-09-07T20:30:00-03:00'),
    });
  });

  it('subtracts overlapping occupied ranges without duplicating time', () => {
    const result = subtractOccupiedIntervals(
      [
        {
          startsAt: date('2026-09-07T18:00:00-03:00'),
          endsAt: date('2026-09-07T22:00:00-03:00'),
        },
      ],
      [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T20:30:00-03:00'),
        },
        {
          startsAt: date('2026-09-07T20:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
    );
    expect(result).toEqual([
      {
        startsAt: date('2026-09-07T18:00:00-03:00'),
        endsAt: date('2026-09-07T19:00:00-03:00'),
      },
      {
        startsAt: date('2026-09-07T21:00:00-03:00'),
        endsAt: date('2026-09-07T22:00:00-03:00'),
      },
    ]);
  });

  it('is reproducible with the same inputs', () => {
    const input = {
      periodStart: date('2026-09-07T00:00:00-03:00'),
      periodEnd: date('2026-09-08T00:00:00-03:00'),
      freeIntervals: [
        {
          startsAt: date('2026-09-07T19:00:00-03:00'),
          endsAt: date('2026-09-07T21:00:00-03:00'),
        },
      ],
      candidates: [
        candidate({ contentId: 'b' }),
        candidate({ contentId: 'a' }),
      ],
    };
    expect(generatePlanningProposal(input)).toEqual(
      generatePlanningProposal(input),
    );
  });
});
