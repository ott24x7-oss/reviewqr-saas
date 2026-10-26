import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import type { ComponentType } from "react";
import { blockReviewAfterError } from "../review/prompt";
import { scrubSentryEvent, sentryIdentity } from "./scrub";

let started = false;

export function sentryDsn() {
  return (process.env.EXPO_PUBLIC_SENTRY_DSN || "").trim();
}

/** Starts Sentry only when EXPO_PUBLIC_SENTRY_DSN is set. A missing native module does not crash the app. */
export function initSentry() {
  const dsn = sentryDsn();
  if (!dsn || started) return false;
  try {
    const version = Constants.expoConfig?.version || "0.0.0";
    const versionCode = Number(Constants.expoConfig?.android?.versionCode || 0);
    const identity = sentryIdentity(version, versionCode);
    Sentry.init({
      dsn,
      enabled: true,
      sendDefaultPii: false,
      release: identity.release,
      dist: identity.dist,
      beforeSend(event) {
        blockReviewAfterError();
        return scrubSentryEvent(event);
      }
    });
    started = true;
    return true;
  } catch {
    return false;
  }
}

export function wrapRoot(component: ComponentType) {
  if (!sentryDsn()) return component;
  try {
    return Sentry.wrap(component);
  } catch {
    return component;
  }
}
