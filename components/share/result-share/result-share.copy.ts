import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import { ExtendedResultShareData, ShareCopy } from "./result-share.types";

export function buildCopy(
  data: ExtendedResultShareData,
  locale: AppLocale = data.locale ?? "de",
): ShareCopy {
  const goalsA = Number(data.goalsA ?? 0);
  const goalsB = Number(data.goalsB ?? 0);
  const isDraw = goalsA === goalsB;
  const goalDiff = Math.abs(goalsA - goalsB);

  if (isDraw) {
    return {
      kicker: translate(locale, "resultShare.drawKicker"),
      headline: translate(locale, "resultShare.drawHeadline"),
      subline: translate(locale, "resultShare.drawSubline"),
    };
  }

  if (data.winnerWasShorthanded && data.upsetWin) {
    return {
      kicker: translate(locale, "resultShare.shorthandedUpsetKicker"),
      headline: translate(locale, "resultShare.shorthandedUpsetHeadline"),
      subline:
        translate(locale, "resultShare.shorthandedUpsetSubline"),
    };
  }

  if (data.winnerWasShorthanded) {
    return {
      kicker: translate(locale, "resultShare.shorthandedKicker"),
      headline: translate(locale, "resultShare.shorthandedHeadline"),
      subline: translate(locale, "resultShare.shorthandedSubline"),
    };
  }

  if (data.upsetWin) {
    return {
      kicker: translate(locale, "resultShare.upsetKicker"),
      headline: translate(locale, "resultShare.upsetHeadline"),
      subline: translate(locale, "resultShare.upsetSubline"),
    };
  }

  if (data.dramaticFinish || goalDiff === 1) {
    return {
      kicker: translate(locale, "resultShare.closeKicker"),
      headline: translate(locale, "resultShare.closeHeadline"),
      subline: translate(locale, "resultShare.closeSubline"),
    };
  }

  if (goalDiff >= 4) {
    return {
      kicker: translate(locale, "resultShare.clearKicker"),
      headline: translate(locale, "resultShare.clearHeadline"),
      subline: translate(locale, "resultShare.clearSubline"),
    };
  }

  return {
    kicker: translate(locale, "resultShare.defaultKicker"),
    headline: translate(locale, "resultShare.defaultHeadline"),
    subline: translate(locale, "resultShare.defaultSubline"),
  };
}