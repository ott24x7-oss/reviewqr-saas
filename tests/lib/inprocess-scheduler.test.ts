import { describe, expect, it } from "vitest";
import {
  decideInProcessJobsTick,
  INPROCESS_ENQUEUE_INTERVAL_MS
} from "../../lib/jobs/inprocess-scheduler-policy";

describe("in-process jobs scheduler policy", () => {
  it("enqueues on the first tick and then only every five minutes", () => {
    expect(
      decideInProcessJobsTick({
        now: 1_000_000,
        lastEnqueueAt: null,
        tickRunning: false,
        externalWorkerFresh: false
      }).enqueue
    ).toBe(true);

    expect(
      decideInProcessJobsTick({
        now: 1_000_000 + INPROCESS_ENQUEUE_INTERVAL_MS - 1,
        lastEnqueueAt: 1_000_000,
        tickRunning: false,
        externalWorkerFresh: false
      }).enqueue
    ).toBe(false);
    expect(
      decideInProcessJobsTick({
        now: 1_000_000 + INPROCESS_ENQUEUE_INTERVAL_MS,
        lastEnqueueAt: 1_000_000,
        tickRunning: false,
        externalWorkerFresh: false
      }).enqueue
    ).toBe(true);
  });

  it("keeps enqueueing while backing off queue draining for a fresh external worker", () => {
    expect(
      decideInProcessJobsTick({
        now: 2_000_000,
        lastEnqueueAt: null,
        tickRunning: false,
        externalWorkerFresh: true
      })
    ).toEqual({ start: true, enqueue: true, drain: false });
  });

  it("skips every part of a tick while another tick is running", () => {
    expect(
      decideInProcessJobsTick({
        now: 3_000_000,
        lastEnqueueAt: null,
        tickRunning: true,
        externalWorkerFresh: false
      })
    ).toEqual({ start: false, enqueue: false, drain: false });
  });
});
