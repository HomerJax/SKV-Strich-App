/* eslint-disable @next/next/no-img-element */
import { buildCopy } from "./result-share.copy";
import {
  getClubLogoUrl,
  getDisplayClubName,
  getScoreModel,
  renderBrandFooter,
  renderClubBadge,
  renderPhotoOrFallback,
} from "./result-share.helpers";
import { buildPalette, hexToRgba } from "./result-share.palette";
import { ExtendedResultShareData } from "./result-share.types";

export function PosterLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "poster");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 34,
        gap: 24,
        color: palette.textPrimary,
        background: `
          radial-gradient(circle at 18% 12%, ${palette.accentGlow}, transparent 24%),
          linear-gradient(180deg, #F6F2EA 0%, #EEE8DE 100%)
        `,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {renderClubBadge({
          clubName,
          clubLogoUrl,
          palette,
          dark: false,
          strikrLogoUrl: data.strikrLogoUrl,
        })}

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 800 }}>
            {copy.kicker}
          </div>
          <div style={{ fontSize: 16 }}>{data.date}</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, gap: 24 }}>
        <div style={{ width: "42%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontSize: 102, fontWeight: 900 }}>
            {score.goalsA}:{score.goalsB}
          </div>

          <div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>
              {copy.headline}
            </div>
            <div style={{ fontSize: 18, opacity: 0.7 }}>
              {copy.subline}
            </div>
          </div>

          {renderBrandFooter({
            palette,
            dark: false,
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>

        <div style={{ width: "58%", borderRadius: 34, overflow: "hidden" }}>
          {renderPhotoOrFallback({
            winnerPhotoUrl: data.winnerPhotoUrl,
            palette,
            dark: false,
            width: 720,
            height: 960,
            borderRadius: 34,
          })}
        </div>
      </div>
    </div>
  );
}

export function StickerLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "sticker");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 28,
        background: "#0C111A",
        color: "#fff",
      }}
    >
      <div style={{ position: "relative", borderRadius: 38, overflow: "hidden" }}>
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1200,
          height: 1440,
          borderRadius: 38,
        })}

        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)"
        }} />

        <div style={{ position: "absolute", top: 24, left: 24, right: 24 }}>
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>

        <div style={{
          position: "absolute",
          bottom: 40,
          left: 30,
          right: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end"
        }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              {copy.kicker}
            </div>
            <div style={{ fontSize: 42, fontWeight: 900 }}>
              {copy.headline}
            </div>
          </div>

          <div style={{
            fontSize: 72,
            fontWeight: 900,
            background: "rgba(0,0,0,0.6)",
            padding: "12px 20px",
            borderRadius: 16
          }}>
            {score.goalsA}:{score.goalsB}
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: 10,
          left: 20
        }}>
          {renderBrandFooter({
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>
      </div>
    </div>
  );
}

export function FloodlightLayout({ data }: { data: ExtendedResultShareData }) {
  const clubName = getDisplayClubName(data);
  const clubLogoUrl = getClubLogoUrl(data);
  const copy = buildCopy(data);
  const palette = buildPalette(data.clubPrimaryColor, "floodlight");
  const score = getScoreModel(data);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 26,
        background: "#05070B",
        color: "#fff",
      }}
    >
      <div style={{ position: "relative", borderRadius: 42, overflow: "hidden" }}>
        {renderPhotoOrFallback({
          winnerPhotoUrl: data.winnerPhotoUrl,
          palette,
          dark: true,
          width: 1200,
          height: 1440,
          borderRadius: 42,
        })}

        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent 60%)"
        }} />

        <div style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          display: "flex",
          justifyContent: "space-between"
        }}>
          {renderClubBadge({
            clubName,
            clubLogoUrl,
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}

          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {data.date}
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: 40,
          left: 30,
          right: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end"
        }}>
          <div style={{ maxWidth: "60%" }}>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              {copy.kicker}
            </div>

            <div style={{ fontSize: 56, fontWeight: 900 }}>
              {copy.headline}
            </div>

            <div style={{
              marginTop: 10,
              padding: 12,
              background: "rgba(0,0,0,0.6)",
              borderRadius: 12
            }}>
              {copy.subline}
            </div>
          </div>

          <div style={{
            fontSize: 90,
            fontWeight: 900,
            background: "rgba(0,0,0,0.7)",
            padding: "20px 28px",
            borderRadius: 20
          }}>
            {score.goalsA}:{score.goalsB}
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: 10,
          left: 20
        }}>
          {renderBrandFooter({
            palette,
            dark: true,
            strikrLogoUrl: data.strikrLogoUrl,
          })}
        </div>
      </div>
    </div>
  );
}