"use client";

import { createContext } from "react";

/**
 * Transient state for the no-write QA simulator. Values are only recorded when
 * the real season form is submitted in the simulator, never persisted to a club.
 */
export const OnboardingQaSeasonContext = createContext<{
  start_date: string;
  end_date: string | null;
} | null>(null);
