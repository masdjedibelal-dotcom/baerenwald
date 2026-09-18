"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalActionMenu } from "@/components/shared/PortalActionMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import { PortalEntityList } from "@/components/shared/PortalEntityList";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenSectionCard,
} from "@/components/shared/PortalEinstellungenUi";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalInlineLoading } from "@/components/shared/PortalInlineLoading";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

export type ObjektKontaktVorOrt = {
  id: string;
  rolle: string;
  name: string;
  telefon?: string | null;
  email?: string | null;
  notiz?: string | null;
};

/** Wie CRM: kein Hausmeister hier — der hat die eigene Karte. */
const ROLLEN = [
  { id: "beirat", label: "Beirat" },
  { id: "dienstleister", label: "Dienstleister" },
  { id: "notfall", label: "Notfall" },
  { id: "makler", label: "Makler / Versicherung" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;

const LIST_COLS = [
  { key: "name", label: "Name", width: "minmax(0, 1.2fr)" },
  { key: "rolle", label: "Rolle", width: "minmax(0, 0.9fr)" },
  { key: "kontakt", label: "Kontakt", width: "minmax(0, 1.4fr)" },
] as const;

function rolleLabel(rolle: string): string {
  return ROLLEN.find((r) => r.id === rolle)?.label ?? rolle;
}

type Props = {
  objektId: string;
};

/**
 * Kontakte vor Ort — Desktop-Tabelle / Mobile-Cards (CRM-Parität).
 */
export function OrganisationObjektKontaktePanel({ objektId }: Props) {
  const [items, setItems] = useState<ObjektKontaktVorOrt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<ObjektKontaktVorOrt | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ObjektKontaktVorOrt | null>(
    null
  );

  const [rolle, setRolle] = useState<string>("beirat");
  const [name, setName] = useState("");
  const [telefon, setTelefon] = useState("");
  const [email, setEmail] = useState("");
  const [notiz, setNotiz] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/org/objekte/kontakte?objektId=${encodeURIComponent(objektId)}`
      );
      const json = (await res.json()) as {
        kontakte?: ObjektKontaktVorOrt[];
        error?: string;
      };
      if (!res.ok) {
        portalToastError("Kontakte nicht geladen", json.error);
        setItems([]);
        return;
      }
      setItems(
        (json.kontakte ?? []).filter(
          (k) => (k.rolle ?? "").toLowerCase() !== "hausmeister"
        )
      );
    } catch {
      portalToastError("Kontakte nicht geladen");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openNeu() {
    setEdit(null);
    setRolle("beirat");
    setName("");
    setTelefon("");
    setEmail("");
    setNotiz("");
    setEditOpen(true);
  }

  function openBearbeiten(k: ObjektKontaktVorOrt) {
    setEdit(k);
    setRolle(
      ROLLEN.some((r) => r.id === k.rolle) ? k.rolle : "sonstiges"
    );
    setName(k.name);
    setTelefon(k.telefon ?? "");
    setEmail(k.email ?? "");
    setNotiz(k.notiz ?? "");
    setEditOpen(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditOpen(false);
  }

  async function saveEdit() {
    const n = name.trim();
    if (!n) {
      portalToastError("Name fehlt");
      return;
    }
    setSaving(true);
    try {
      if (edit) {
        const res = await fetch("/api/org/objekte/kontakte", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: edit.id,
            rolle,
            name: n,
            telefon,
            email,
            notiz,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Kontakt nicht gespeichert", json.error);
          return;
        }
      } else {
        const res = await fetch("/api/org/objekte/kontakte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objektId,
            rolle,
            name: n,
            telefon,
            email,
            notiz,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          portalToastError("Kontakt nicht angelegt", json.error);
          return;
        }
      }
      setEditOpen(false);
      orgPortalToast.saved();
      await load();
    } catch {
      portalToastError("Kontakt nicht gespeichert");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/org/objekte/kontakte?id=${encodeURIComponent(removeTarget.id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Kontakt nicht entfernt", json.error);
        return;
      }
      setRemoveTarget(null);
      orgPortalToast.saved();
      await load();
    } catch {
      portalToastError("Kontakt nicht entfernt");
    } finally {
      setSaving(false);
    }
  }

  const rows = useMemo(
    () =>
      items.map((k) => {
        const kontaktZeile =
          [k.telefon?.trim(), k.email?.trim()].filter(Boolean).join(" · ") ||
          "—";
        const rolleTxt = rolleLabel(k.rolle);
        return {
          id: k.id,
          title: k.name,
          badge: (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
              {rolleTxt}
            </span>
          ),
          meta: (
            <div className="space-y-0.5">
              <p>{kontaktZeile}</p>
              {k.notiz?.trim() ? (
                <p className="text-[12.5px] text-text-tertiary">
                  {k.notiz.trim()}
                </p>
              ) : null}
            </div>
          ),
          cells: [
            <>
              {k.name}
              {k.notiz?.trim() ? (
                <span className="mt-0.5 block text-[12px] font-normal text-text-tertiary">
                  {k.notiz.trim()}
                </span>
              ) : null}
            </>,
            rolleTxt,
            kontaktZeile,
          ],
          onClick: () => openBearbeiten(k),
          menu: (
            <PortalActionMenu
              title={k.name}
              triggerLabel="Kontakt-Menü"
              variant="popover"
              items={[
                {
                  label: "Bearbeiten",
                  onClick: () => openBearbeiten(k),
                },
                {
                  label: "Entfernen",
                  danger: true,
                  dividerBefore: true,
                  onClick: () => setRemoveTarget(k),
                },
              ]}
            />
          ),
        };
      }),
    [items]
  );

  return (
    <>
      <EinstellungenSectionCard
        title={
          items.length ? `Kontakte vor Ort · ${items.length}` : "Kontakte vor Ort"
        }
        onAdd={openNeu}
        addLabel="Kontakt hinzufügen"
      >
        {loading ? (
          <PortalInlineLoading label="Kontakte werden geladen" />
        ) : items.length === 0 ? (
          <PortalInboxEmpty title="Noch keine Kontakte" compact />
        ) : (
          <PortalEntityList
            columns={[...LIST_COLS]}
            rows={rows}
            ariaLabel="Kontakte vor Ort"
          />
        )}
      </EinstellungenSectionCard>

      <EinstellungenEditModal
        open={editOpen}
        title={edit ? "Kontakt bearbeiten" : "Kontakt hinzufügen"}
        onClose={closeEdit}
        onSave={() => void saveEdit()}
        saving={saving}
      >
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-text-primary">
            Rolle
          </span>
          <select
            className="portal-field w-full"
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
          >
            {ROLLEN.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <EinstellungenEdField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Max Mustermann"
          autoComplete="name"
        />
        <EinstellungenEdField
          label="Telefon"
          value={telefon}
          onChange={setTelefon}
          placeholder="z. B. 089 …"
          type="tel"
          autoComplete="tel"
        />
        <EinstellungenEdField
          label="E-Mail"
          value={email}
          onChange={setEmail}
          placeholder="name@firma.de"
          type="email"
          autoComplete="email"
        />
        <EinstellungenEdField
          label="Notiz"
          value={notiz}
          onChange={setNotiz}
          placeholder="Optional"
        />
      </EinstellungenEditModal>

      <PortalConfirmDialog
        open={Boolean(removeTarget)}
        title="Kontakt entfernen?"
        description={
          removeTarget
            ? `${removeTarget.name} wird von diesem Objekt entfernt.`
            : ""
        }
        confirmLabel="Entfernen"
        confirmVariant="danger"
        loading={saving}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
