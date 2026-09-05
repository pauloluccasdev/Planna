export const PLANNING_ALGORITHM_VERSION = 'mvp-v1';

export const PLANNING_PARAMETERS = Object.freeze({
  priorityWeight: 0.35,
  deadlineWeight: 0.65,
  deadlineHorizonDays: 180,
});

export type TimeInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type PlanningCandidate = {
  contentId: string;
  courseId: string;
  subjectId: string;
  priority: number;
  requiredSeconds: number;
  deadline?: Date;
  academicEventId?: string;
  sourceOverdueBlockId?: string;
};

export type ProposedAllocation = {
  contentId: string;
  startsAt: Date;
  endsAt: Date;
  plannedDurationSeconds: number;
  sourceOverdueBlockId?: string;
  explanationFactors: {
    algorithmVersion: string;
    priority: number;
    priorityScore: number;
    deadlineScore: number;
    totalScore: number;
    deadline: string | null;
    academicEventId: string | null;
  };
};

export type CapacityDiagnostic = {
  contentId: string;
  courseId: string;
  subjectId: string;
  academicEventId?: string;
  requiredSeconds: number;
  allocatedSeconds: number;
  deficitSeconds: number;
};

export type PlanningResult = {
  blocks: ProposedAllocation[];
  diagnostics: CapacityDiagnostic[];
  requestedSeconds: number;
  allocatedSeconds: number;
  unallocatedSeconds: number;
};

type ScoredCandidate = PlanningCandidate & {
  priorityScore: number;
  deadlineScore: number;
  totalScore: number;
};

function scoreCandidate(
  candidate: PlanningCandidate,
  periodStart: Date,
): ScoredCandidate {
  const priorityNormalized = (candidate.priority - 1) / 4;
  const priorityScore = priorityNormalized * PLANNING_PARAMETERS.priorityWeight;
  const daysUntilDeadline = candidate.deadline
    ? Math.max(
        0,
        (candidate.deadline.getTime() - periodStart.getTime()) / 86_400_000,
      )
    : null;
  const proximity =
    daysUntilDeadline === null
      ? 0
      : 1 -
        Math.min(daysUntilDeadline, PLANNING_PARAMETERS.deadlineHorizonDays) /
          PLANNING_PARAMETERS.deadlineHorizonDays;
  const deadlineScore = proximity * PLANNING_PARAMETERS.deadlineWeight;
  return {
    ...candidate,
    priorityScore,
    deadlineScore,
    totalScore: priorityScore + deadlineScore,
  };
}

function compareCandidates(left: ScoredCandidate, right: ScoredCandidate) {
  if (left.totalScore !== right.totalScore)
    return right.totalScore - left.totalScore;
  const leftDeadline = left.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightDeadline = right.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
  if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
  if (left.priority !== right.priority) return right.priority - left.priority;
  return left.contentId.localeCompare(right.contentId);
}

export function subtractOccupiedIntervals(
  available: TimeInterval[],
  occupied: TimeInterval[],
): TimeInterval[] {
  const normalizedOccupied = occupied
    .filter(({ startsAt, endsAt }) => startsAt < endsAt)
    .toSorted(
      (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
    )
    .reduce<TimeInterval[]>((merged, interval) => {
      const previous = merged.at(-1);
      if (previous && interval.startsAt <= previous.endsAt) {
        if (interval.endsAt > previous.endsAt)
          previous.endsAt = new Date(interval.endsAt);
      } else {
        merged.push({
          startsAt: new Date(interval.startsAt),
          endsAt: new Date(interval.endsAt),
        });
      }
      return merged;
    }, []);

  return available
    .filter(({ startsAt, endsAt }) => startsAt < endsAt)
    .toSorted(
      (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
    )
    .flatMap((slot) => {
      let fragments = [
        { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) },
      ];
      for (const busy of normalizedOccupied) {
        fragments = fragments.flatMap((fragment) => {
          if (
            busy.endsAt <= fragment.startsAt ||
            busy.startsAt >= fragment.endsAt
          )
            return [fragment];
          const result: TimeInterval[] = [];
          if (busy.startsAt > fragment.startsAt)
            result.push({
              startsAt: fragment.startsAt,
              endsAt: new Date(busy.startsAt),
            });
          if (busy.endsAt < fragment.endsAt)
            result.push({
              startsAt: new Date(busy.endsAt),
              endsAt: fragment.endsAt,
            });
          return result;
        });
      }
      return fragments;
    });
}

export function generatePlanningProposal(input: {
  periodStart: Date;
  periodEnd: Date;
  freeIntervals: TimeInterval[];
  candidates: PlanningCandidate[];
}): PlanningResult {
  const freeIntervals = input.freeIntervals
    .map((interval) => ({
      startsAt: new Date(
        Math.max(interval.startsAt.getTime(), input.periodStart.getTime()),
      ),
      endsAt: new Date(
        Math.min(interval.endsAt.getTime(), input.periodEnd.getTime()),
      ),
    }))
    .filter(({ startsAt, endsAt }) => startsAt < endsAt)
    .toSorted(
      (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
    );
  const candidates = input.candidates
    .filter(
      ({ priority, requiredSeconds }) =>
        Number.isInteger(priority) &&
        priority >= 1 &&
        priority <= 5 &&
        Number.isSafeInteger(requiredSeconds) &&
        requiredSeconds > 0,
    )
    .map((candidate) => scoreCandidate(candidate, input.periodStart))
    .toSorted(compareCandidates);
  const blocks: ProposedAllocation[] = [];
  const diagnostics: CapacityDiagnostic[] = [];

  for (const candidate of candidates) {
    let remainingSeconds = candidate.requiredSeconds;
    let allocatedSeconds = 0;
    for (const slot of freeIntervals) {
      if (remainingSeconds === 0) break;
      const deadline =
        candidate.deadline?.getTime() ?? input.periodEnd.getTime();
      if (slot.startsAt.getTime() >= deadline) continue;
      const usableEnd = Math.min(slot.endsAt.getTime(), deadline);
      const capacitySeconds = Math.floor(
        (usableEnd - slot.startsAt.getTime()) / 1000,
      );
      if (capacitySeconds <= 0) continue;
      const durationSeconds = Math.min(remainingSeconds, capacitySeconds);
      const startsAt = new Date(slot.startsAt);
      const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
      blocks.push({
        contentId: candidate.contentId,
        startsAt,
        endsAt,
        plannedDurationSeconds: durationSeconds,
        ...(candidate.sourceOverdueBlockId
          ? { sourceOverdueBlockId: candidate.sourceOverdueBlockId }
          : {}),
        explanationFactors: {
          algorithmVersion: PLANNING_ALGORITHM_VERSION,
          priority: candidate.priority,
          priorityScore: candidate.priorityScore,
          deadlineScore: candidate.deadlineScore,
          totalScore: candidate.totalScore,
          deadline: candidate.deadline?.toISOString() ?? null,
          academicEventId: candidate.academicEventId ?? null,
        },
      });
      slot.startsAt = endsAt;
      remainingSeconds -= durationSeconds;
      allocatedSeconds += durationSeconds;
    }
    if (remainingSeconds > 0) {
      diagnostics.push({
        contentId: candidate.contentId,
        courseId: candidate.courseId,
        subjectId: candidate.subjectId,
        ...(candidate.academicEventId
          ? { academicEventId: candidate.academicEventId }
          : {}),
        requiredSeconds: candidate.requiredSeconds,
        allocatedSeconds,
        deficitSeconds: remainingSeconds,
      });
    }
  }

  const requestedSeconds = candidates.reduce(
    (sum, candidate) => sum + candidate.requiredSeconds,
    0,
  );
  const allocatedSeconds = blocks.reduce(
    (sum, block) => sum + block.plannedDurationSeconds,
    0,
  );
  return {
    blocks,
    diagnostics,
    requestedSeconds,
    allocatedSeconds,
    unallocatedSeconds: requestedSeconds - allocatedSeconds,
  };
}
