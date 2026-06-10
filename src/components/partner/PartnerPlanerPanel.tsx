"use client";

import { CalendarDays, Check, ListTodo, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  createPartnerTodo,
  deletePartnerTodo,
  togglePartnerTodo,
} from "@/app/actions/partner-todos";
import {
  groupPartnerTermine,
  type PartnerTerminItem,
} from "@/lib/partner/build-partner-termine";
import type { PartnerTodoItem } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

type PlanerTab = "termine" | "aufgaben";

export function PartnerPlanerPanel({
  termine,
  todos: initialTodos,
  onNavigate,
}: {
  termine: PartnerTerminItem[];
  todos: PartnerTodoItem[];
  onNavigate: (section: PartnerTerminItem["section"], selectedId?: string) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<PlanerTab>("termine");
  const [todos, setTodos] = useState(initialTodos);
  const [newTodo, setNewTodo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  const terminGroups = groupPartnerTermine(termine);
  const offeneTodos = todos.filter((t) => !t.erledigt);
  const erledigteTodos = todos.filter((t) => t.erledigt);

  function refresh() {
    router.refresh();
  }

  function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const titel = newTodo.trim();
    if (!titel) return;

    startTransition(async () => {
      const res = await createPartnerTodo(titel);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewTodo("");
      refresh();
    });
  }

  function handleToggle(todo: PartnerTodoItem) {
    setError(null);
    const next = !todo.erledigt;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, erledigt: next } : t))
    );

    startTransition(async () => {
      const res = await togglePartnerTodo(todo.id, next);
      if (!res.ok) {
        setTodos(initialTodos);
        setError(res.error);
        return;
      }
      refresh();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    setTodos((prev) => prev.filter((t) => t.id !== id));

    startTransition(async () => {
      const res = await deletePartnerTodo(id);
      if (!res.ok) {
        setTodos(initialTodos);
        setError(res.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="portal-text-section text-text-primary">Planer</h2>
        <p className="portal-text-body text-text-secondary">
          Termine aus deinen Zuweisungen und eigene Aufgaben.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-border-light bg-muted/30 p-1">
        <TabButton
          active={tab === "termine"}
          onClick={() => setTab("termine")}
          icon={CalendarDays}
          label="Termine"
          count={termine.length}
        />
        <TabButton
          active={tab === "aufgaben"}
          onClick={() => setTab("aufgaben")}
          icon={ListTodo}
          label="Aufgaben"
          count={offeneTodos.length}
        />
      </div>

      {error ? (
        <p className="portal-text-body rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
      ) : null}

      {tab === "termine" ? (
        <div className="space-y-4">
          {termine.length === 0 ? (
            <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Keine Termine oder offenen Fristen — alles erledigt.
            </p>
          ) : (
            terminGroups.map((group) => (
              <section key={group.label} className="space-y-2">
                <p className="portal-text-label text-text-tertiary">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((termin) => (
                    <li key={termin.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(termin.section, termin.selectedId)}
                        className={cn(
                          "w-full rounded-xl border border-border-light bg-surface-card px-4 py-3 text-left transition-colors hover:border-accent/30 hover:bg-accent-light/20",
                          termin.dringend && "border-amber-200 bg-amber-50/40"
                        )}
                      >
                        <p className="portal-text-body font-semibold text-text-primary">
                          {termin.titel}
                        </p>
                        {termin.untertitel ? (
                          <p className="portal-text-meta mt-0.5 text-text-secondary">
                            {termin.untertitel}
                          </p>
                        ) : null}
                        {termin.datumLabel && termin.sortDatum == null ? (
                          <p className="portal-text-meta mt-1 text-amber-800">{termin.datumLabel}</p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Neue Aufgabe …"
              maxLength={280}
              className="portal-text-body min-h-[44px] flex-1 rounded-xl border border-border-default bg-surface-card px-3 text-text-primary outline-none ring-accent focus:ring-2"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !newTodo.trim()}
              className="btn-pill-primary portal-btn-compact shrink-0 !px-4"
            >
              Hinzufügen
            </button>
          </form>

          {todos.length === 0 ? (
            <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Noch keine Aufgaben — tippe oben eine neue ein.
            </p>
          ) : (
            <ul className="space-y-1">
              {offeneTodos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  pending={pending}
                  onToggle={() => handleToggle(todo)}
                  onDelete={() => handleDelete(todo.id)}
                />
              ))}
              {erledigteTodos.length > 0 ? (
                <>
                  <li className="portal-text-label pt-3 text-text-tertiary">Erledigt</li>
                  {erledigteTodos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      pending={pending}
                      onToggle={() => handleToggle(todo)}
                      onDelete={() => handleDelete(todo.id)}
                    />
                  ))}
                </>
              ) : null}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CalendarDays;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "portal-text-body flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold transition-colors",
        active ? "bg-surface-card text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
      {count > 0 ? (
        <span className={cn("tag text-[11px]", active ? "bg-accent-light text-accent" : "bg-muted text-text-tertiary")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function TodoRow({
  todo,
  pending,
  onToggle,
  onDelete,
}: {
  todo: PartnerTodoItem;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted/30">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={todo.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          todo.erledigt
            ? "border-accent bg-accent text-white"
            : "border-border-default bg-surface-card hover:border-accent"
        )}
      >
        {todo.erledigt ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "portal-text-body min-w-0 flex-1 text-left text-text-primary",
          todo.erledigt && "text-text-tertiary line-through"
        )}
      >
        {todo.titel}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label="Aufgabe löschen"
        className="rounded-lg p-1.5 text-text-tertiary opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}
