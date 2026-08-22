"use client";

import * as React from "react";

import { Group, Spec, SpecGrid, generalStyles as styles } from "./shell";
import {
  borders,
  breakpoints,
  neutral,
  primary,
  radii,
  semantic,
  shadows,
  spacing,
  surfaces,
  textColors,
  typeScale,
} from "./tokens";

function Ramp({ swatches, prefix }: { swatches: typeof primary; prefix: string }) {
  return (
    <div className={styles.ramp}>
      {swatches.map((swatch) => (
        <div className={styles.rampStep} key={swatch.step}>
          <span className={styles.rampChip} style={{ background: swatch.value }} />
          <strong>{prefix}-{swatch.step}</strong>
          <code>{swatch.value}</code>
          {swatch.note ? <small>{swatch.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

export function FoundationSection() {
  return (
    <>
      <Group title="Primary / Brand" hint="primary-50 → primary-900">
        <Ramp swatches={primary} prefix="primary" />
      </Group>

      <Group title="Neutral / Gray" hint="neutral-0 → neutral-1000">
        <Ramp swatches={neutral} prefix="neutral" />
      </Group>

      <Group title="Semantic / Status" hint="each ramp carries -light, -default, -dark">
        <div className={styles.semanticGrid}>
          {semantic.map((entry) => (
            <article className={styles.semanticCard} key={entry.name}>
              <div className={styles.semanticHead}>
                <strong>{entry.name}</strong>
                <span>{entry.role}</span>
              </div>
              <div className={styles.semanticBar}>
                <span style={{ background: entry.light }}>light</span>
                <span style={{ background: entry.default, color: "#fff" }}>default</span>
                <span style={{ background: entry.dark, color: "#fff" }}>dark</span>
              </div>
              <div className={styles.semanticValues}>
                <code>{entry.light}</code>
                <code>{entry.default}</code>
                <code>{entry.dark}</code>
              </div>
            </article>
          ))}
        </div>
      </Group>

      <Group title="Background & Surface" hint="bg-base · bg-subtle · bg-elevated · bg-overlay">
        <div className={styles.tokenList}>
          {surfaces.map((token) => (
            <div className={styles.tokenRow} key={token.step}>
              <span
                className={styles.tokenChip}
                style={{
                  background: token.value,
                  boxShadow: token.step === "bg-elevated" ? "var(--mo-shadow-elevated)" : undefined,
                }}
              />
              <strong>{token.step}</strong>
              <code>{token.value}</code>
              <small>{token.note}</small>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Text Colors" hint="text-primary → text-link">
        <div className={styles.tokenList}>
          {textColors.map((token) => (
            <div className={styles.tokenRow} key={token.step}>
              <span
                className={styles.tokenSample}
                style={{
                  color: token.value,
                  background: token.step === "text-inverse" ? "#31302E" : undefined,
                }}
              >
                Ag
              </span>
              <strong>{token.step}</strong>
              <code>{token.value}</code>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Border & Divider" hint="border-default · border-subtle · border-focus">
        <div className={styles.tokenList}>
          {borders.map((token) => (
            <div className={styles.tokenRow} key={token.step}>
              <span className={styles.tokenBorder} style={{ borderColor: token.value }} />
              <strong>{token.step}</strong>
              <code>{token.value}</code>
            </div>
          ))}
        </div>
      </Group>

      <Group title="Typography" hint="Roboto · heading, body, label, caption">
        <div className={styles.typeList}>
          {typeScale.map((token) => (
            <div className={styles.typeRow} key={token.token}>
              <div className={styles.typeMeta}>
                <strong>{token.token}</strong>
                <span>
                  {token.size} / {token.line} · {token.weight} · {token.tracking}
                </span>
              </div>
              <p
                style={{
                  fontSize: token.size,
                  lineHeight: `${token.line}px`,
                  fontWeight: token.weight,
                  letterSpacing: token.tracking,
                }}
              >
                {token.sample}
              </p>
            </div>
          ))}
        </div>
      </Group>

      <SpecGrid columns={2}>
        <Spec label="Spacing — 8px base rhythm">
          <div className={styles.spacingList}>
            {spacing.map((step) => (
              <div className={styles.spacingRow} key={step.token}>
                <code>{step.token}</code>
                <span className={styles.spacingBar} style={{ width: step.value * 2 }} />
                <span>{step.value}px</span>
              </div>
            ))}
          </div>
        </Spec>

        <Spec label="Border radius">
          <div className={styles.radiusRow}>
            {radii.map((radius) => (
              <div key={radius.token}>
                <span className={styles.radiusBox} style={{ borderRadius: radius.value }} />
                <strong>{radius.token}</strong>
                <code>{radius.value}</code>
                <small>{radius.use}</small>
              </div>
            ))}
          </div>
        </Spec>

        <Spec label="Elevation & depth">
          <div className={styles.shadowRow}>
            {shadows.map((shadow) => (
              <article key={shadow.token} style={{ boxShadow: shadow.value === "none" ? undefined : shadow.value }}>
                <strong>{shadow.token}</strong>
                <small>{shadow.use}</small>
              </article>
            ))}
          </div>
        </Spec>

        <Spec label="Grid & breakpoints">
          <div className={styles.breakpointList}>
            {breakpoints.map((point) => (
              <div key={point.name}>
                <strong>{point.name}</strong>
                <code>{point.width}</code>
                <small>{point.change}</small>
              </div>
            ))}
          </div>
        </Spec>
      </SpecGrid>
    </>
  );
}
