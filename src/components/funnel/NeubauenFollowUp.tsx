"use client";

import type { FachdetailsState } from "@/lib/funnel/types";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import type { StepOption as LibStepOption } from "@/lib/types";

type NeubauenPatch = NonNullable<FachdetailsState["neubauen"]>;

function asLib(o: {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
}): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    emoji: o.emoji,
  };
}

export function NeubauenFollowUpBlock({
  bereiche,
  neubauen,
  onPatch,
}: {
  bereiche: string[];
  neubauen: FachdetailsState["neubauen"];
  onPatch: (p: NeubauenPatch) => void;
}) {
  const b = new Set(bereiche);
  const n = neubauen ?? {};

  if (b.has("keller_dg")) {
    if (!n.rohbau) {
      const opts = [
        {
          value: "ja" as const,
          label: "Ja — Rohbau vorhanden",
          hint: "Wände und Decke stehen bereits",
          emoji: "✅",
        },
        {
          value: "nein" as const,
          label: "Nein — muss erst erstellt werden",
          hint: "→ Beratung nötig, automatische Kalkulation nicht möglich",
          emoji: "🏗️",
        },
      ];
      return (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-text-primary">
            Ist der Rohbau vorhanden?
          </h3>
          <div className="space-y-2">
            {opts.map((o) => (
              <SelectionTile
                key={o.value}
                option={asLib(o)}
                selected={n.rohbau === o.value}
                multi={false}
                onChange={(value, sel) => {
                  onPatch({
                    ...n,
                    rohbau: sel ? (value as "ja" | "nein") : undefined,
                    deckenhoehe: undefined,
                    kellerOderDg: undefined,
                  });
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    if (n.rohbau === "ja" && !n.deckenhoehe) {
      const opts = [
        {
          value: "niedrig" as const,
          label: "Unter 2,00 m",
          hint: "Sehr niedrig — eingeschränkte Nutzung",
          emoji: "📏",
        },
        {
          value: "mittel" as const,
          label: "2,00–2,40 m",
          hint: "Normaler Ausbau möglich",
          emoji: "📐",
        },
        {
          value: "hoch" as const,
          label: "Über 2,40 m",
          hint: "Optimale Raumhöhe",
          emoji: "⬆️",
        },
      ];
      return (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-text-primary">
            Wie hoch ist die Deckenhöhe?
          </h3>
          <div className="space-y-2">
            {opts.map((o) => (
              <SelectionTile
                key={o.value}
                option={asLib(o)}
                selected={n.deckenhoehe === o.value}
                multi={false}
                onChange={(value, sel) => {
                  onPatch({
                    ...n,
                    deckenhoehe: sel
                      ? (value as "niedrig" | "mittel" | "hoch")
                      : undefined,
                    kellerOderDg: undefined,
                  });
                }}
              />
            ))}
          </div>
        </div>
      );
    }
    if (
      n.rohbau === "ja" &&
      n.deckenhoehe &&
      n.deckenhoehe !== "niedrig" &&
      !n.kellerOderDg
    ) {
      const opts = [
        {
          value: "keller" as const,
          label: "Keller",
          hint: "Kellerausbau — gleiche GU-Paket-Logik wie „Zuhause erneuern“",
          emoji: "🪜",
        },
        {
          value: "dach" as const,
          label: "Dachgeschoss",
          hint: "DG-Ausbau — gleiche GU-Paket-Logik wie „Zuhause erneuern“",
          emoji: "🏠",
        },
      ];
      return (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-text-primary">
            Wo soll ausgebaut werden?
          </h3>
          <div className="space-y-2">
            {opts.map((o) => (
              <SelectionTile
                key={o.value}
                option={asLib(o)}
                selected={n.kellerOderDg === o.value}
                multi={false}
                onChange={(value, sel) => {
                  onPatch({
                    ...n,
                    kellerOderDg: sel ? (value as "keller" | "dach") : undefined,
                  });
                }}
              />
            ))}
          </div>
        </div>
      );
    }
  }

  if (b.has("terrasse") && !n.terrasse) {
    const opts = [
      {
        value: "holz" as const,
        label: "Holz / WPC",
        hint: "Klassisch und warm",
        emoji: "🪵",
      },
      {
        value: "stein" as const,
        label: "Naturstein / Fliesen",
        hint: "Langlebig und pflegeleicht",
        emoji: "🪨",
      },
      {
        value: "beton" as const,
        label: "Betonplatten",
        hint: "Günstig und robust",
        emoji: "⬛",
      },
    ];
    return (
      <div className="space-y-3">
        <h3 className="text-[15px] font-semibold text-text-primary">
          Was für eine Terrasse?
        </h3>
        <div className="space-y-2">
          {opts.map((o) => (
            <SelectionTile
              key={o.value}
              option={asLib(o)}
              selected={n.terrasse === o.value}
              multi={false}
              onChange={(value, sel) => {
                onPatch({
                  ...n,
                  terrasse: sel
                    ? (value as "holz" | "stein" | "beton")
                    : undefined,
                });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (b.has("umbau")) {
    if (!n.innen) {
      const opts = [
        {
          value: "durchbruch" as const,
          label: "Wanddurchbruch",
          hint: "Öffnung in bestehender Wand — GU-Paketpreis",
          emoji: "🚪",
        },
        {
          value: "grundriss" as const,
          label: "Grundriss ändern",
          hint: "Wände versetzen oder entfernen",
          emoji: "📐",
        },
        {
          value: "trennwand" as const,
          label: "Neue Trennwand",
          hint: "Raum aufteilen — typisch Trockenbau",
          emoji: "🧱",
        },
      ];
      return (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-text-primary">
            Was soll umgebaut werden?
          </h3>
          <div className="space-y-2">
            {opts.map((o) => (
              <SelectionTile
                key={o.value}
                option={asLib(o)}
                selected={n.innen === o.value}
                multi={false}
                onChange={(value, sel) => {
                  onPatch({
                    ...n,
                    innen: sel
                      ? (value as "durchbruch" | "grundriss" | "trennwand")
                      : undefined,
                    durchbruchAnzahl: undefined,
                    durchbruchTragend: undefined,
                  });
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    if (n.innen === "durchbruch") {
      if (n.durchbruchAnzahl == null) {
        const anzahlOpts = [
          { value: "1", label: "Einer", groesse: 1, emoji: "1️⃣" },
          { value: "2", label: "Zwei", groesse: 2, emoji: "2️⃣" },
          {
            value: "3_plus",
            label: "Drei oder mehr",
            groesse: 3,
            emoji: "➕",
          },
        ];
        return (
          <div className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Wie viele Durchbrüche sind geplant?
            </h3>
            <div className="space-y-2">
              {anzahlOpts.map((o) => (
                <SelectionTile
                  key={o.value}
                  option={asLib(o)}
                  selected={
                    (o.value === "1" && n.durchbruchAnzahl === 1) ||
                    (o.value === "2" && n.durchbruchAnzahl === 2) ||
                    (o.value === "3_plus" && n.durchbruchAnzahl === 3)
                  }
                  multi={false}
                  onChange={(value, sel) => {
                    const hit = anzahlOpts.find((x) => x.value === value);
                    const g =
                      typeof hit?.groesse === "number" ? hit.groesse : 1;
                    onPatch({
                      ...n,
                      durchbruchAnzahl: sel ? g : undefined,
                      durchbruchTragend: sel ? n.durchbruchTragend : undefined,
                    });
                  }}
                />
              ))}
            </div>
          </div>
        );
      }
      if (n.durchbruchTragend === undefined) {
        const statikOpts = [
          {
            value: "tragend" as const,
            label: "Ja, tragend",
            hint: "Statik, Stahlträger, Abfangung",
            emoji: "🏛️",
          },
          {
            value: "nicht_tragend" as const,
            label: "Nein, nicht tragend",
            hint: "Leichtbau oder nicht tragende Trennwand",
            emoji: "🧱",
          },
        ];
        return (
          <div className="space-y-3">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Sind tragende Wände betroffen?
            </h3>
            <div className="space-y-2">
              {statikOpts.map((o) => (
                <SelectionTile
                  key={o.value}
                  option={asLib(o)}
                  selected={
                    o.value === "tragend"
                      ? n.durchbruchTragend === true
                      : n.durchbruchTragend === false
                  }
                  multi={false}
                  onChange={(value, sel) => {
                    onPatch({
                      ...n,
                      durchbruchTragend: sel
                        ? value === "tragend"
                        : undefined,
                    });
                  }}
                />
              ))}
            </div>
          </div>
        );
      }
    }
  }

  return null;
}

export function neubauenFollowUpBlocksPlanung(
  bereiche: string[],
  neubauen: FachdetailsState["neubauen"]
): boolean {
  const b = new Set(bereiche);
  const n = neubauen ?? {};
  if (b.has("keller_dg")) {
    if (!n.rohbau) return true;
    if (n.rohbau === "nein") return false;
    if (n.rohbau === "ja" && !n.deckenhoehe) return true;
    if (n.deckenhoehe === "niedrig") return false;
    if (!n.kellerOderDg) return true;
  }
  if (b.has("terrasse") && !n.terrasse) return true;
  if (b.has("umbau")) {
    if (!n.innen) return true;
    if (n.innen === "durchbruch") {
      if (n.durchbruchAnzahl == null) return true;
      if (n.durchbruchTragend === undefined) return true;
    }
  }
  return false;
}
