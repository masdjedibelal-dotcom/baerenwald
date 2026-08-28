"use client";

import { useCallback, useEffect, useState } from "react";

import { PortalActionMenu } from "@/components/shared/PortalActionMenu";
import { PortalConfirmDialog } from "@/components/shared/PortalDetailUi";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
} from "@/components/shared/PortalEinstellungenUi";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
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

function rolleLabel(rolle: string): string {
  return ROLLEN.find((r) => r.id === rolle)?.label ?? rolle;
}

function dash(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "—";
}

type Props = {
  objektId: string;
};

/**
 * Kontakte vor Ort (Beirat, Notfall, …) — Card unter Hausmeister, analog CRM.
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

  return (
    <>
      <EinstellungenSectionCard
        title="Kontakte vor Ort"
        onAdd={openNeu}
        addLabel="Kontakt hinzufügen"
      >
        {loading ? (
          <p className="text-[13px] text-text-secondary">Laden…</p>
        ) : items.length === 0 ? (
          <PortalInboxEmpty title="Noch keine Kontakte" compact />
        ) : (
          <ul className="divide-y divide-border-light">
            {items.map((k) => {
              const kontaktZeile = [k.telefon?.trim(), k.email?.trim()]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={k.id}
                  className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold text-text-primary">
                        {k.name}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                        {rolleLabel(k.rolle)}
                      </span>
                    </div>
                    <EinstellungenPfList className="mt-1">
                      <EinstellungenPfRow
                        label="Kontakt"
                        value={dash(kontaktZeile)}
                      />
                      {k.notiz?.trim() ? (
                        <EinstellungenPfRow
                          label="Notiz"
                          value={k.notiz.trim()}
                        />
                      ) : null}
                    </EinstellungenPfList>
                  </div>
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
                </li>
              );
            })}
          </ul>
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
