"use client";

import { useState, useTransition } from "react";
import { sendContactAction } from "@/lib/contact/actions";
import {
  CONTACT_LIMITS,
  validateContact,
  type ContactKindInput,
} from "@/lib/contact/validation";

export interface ContactSender {
  username: string;
  email: string;
}

const KINDS: {
  kind: ContactKindInput;
  label: string;
  hint: string;
  accent: string;
}[] = [
  {
    kind: "GENERAL",
    label: "Message à l'équipe",
    hint: "Une question, une remarque pour l'administration.",
    accent: "border-domain bg-domain/15",
  },
  {
    kind: "BUG",
    label: "Signaler un bug",
    hint: "Quelque chose ne marche pas comme prévu.",
    accent: "border-rose-500 bg-rose-500/15",
  },
  {
    kind: "IDEA",
    label: "Proposer une amélioration",
    hint: "Une idée de jeu, de fonctionnalité, d'équilibrage…",
    accent: "border-amber-400 bg-amber-400/15",
  },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-void-800/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-domain disabled:opacity-60";
const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/55";

/**
 * Formulaire de contact (contenu de la modale du footer). Connecté : nom et
 * email viennent du compte et sont verrouillés — la Server Action les impose de
 * toute façon depuis la session.
 */
export function ContactForm({
  sender,
  onSent,
}: {
  sender: ContactSender | null;
  onSent: () => void;
}) {
  const [kind, setKind] = useState<ContactKindInput>("GENERAL");
  const [name, setName] = useState(sender?.username ?? "");
  const [email, setEmail] = useState(sender?.email ?? "");
  const [message, setMessage] = useState("");
  const [bugLocation, setBugLocation] = useState("");
  const [bugSteps, setBugSteps] = useState("");
  const [creditOk, setCreditOk] = useState(true);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { kind, name, email, message, bugLocation, bugSteps, creditOk, website };
    const checked = validateContact(input);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await sendContactAction(input).catch(() => ({
        ok: false,
        error: "Erreur réseau. Réessaie.",
      }));
      if (res.ok) onSent();
      else setError(res.error ?? "L'envoi a échoué.");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <fieldset>
        <legend className={labelClass}>Type de message</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {KINDS.map((k) => {
            const active = k.kind === kind;
            return (
              <label
                key={k.kind}
                className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                  active ? k.accent : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.kind}
                  checked={active}
                  onChange={() => setKind(k.kind)}
                  className="sr-only"
                />
                <span className="block font-display text-sm font-bold text-white">
                  {k.label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-white/50">
                  {k.hint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {kind === "IDEA" && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm text-amber-100">
          <p>
            <span className="font-bold">Ton idée peut te faire créditer !</span>{" "}
            Si elle est retenue et mise en place sur le site, tu pourras être
            crédité(e) comme contributeur.
          </p>
          <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs text-amber-100/85">
            <input
              type="checkbox"
              checked={creditOk}
              onChange={(e) => setCreditOk(e.target.checked)}
              className="h-4 w-4 accent-amber-400"
            />
            J&apos;accepte d&apos;être crédité(e) sous mon pseudo
          </label>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            {sender ? "Pseudo" : "Nom ou pseudo"}
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!sender}
            maxLength={CONTACT_LIMITS.nameMax}
            autoComplete="nickname"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email (pour te répondre)
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!sender}
            maxLength={CONTACT_LIMITS.emailMax}
            autoComplete="email"
            className={inputClass}
          />
        </div>
      </div>

      {kind === "BUG" && (
        <>
          <div>
            <label htmlFor="contact-location" className={labelClass}>
              Page ou jeu concerné
            </label>
            <input
              id="contact-location"
              value={bugLocation}
              onChange={(e) => setBugLocation(e.target.value)}
              maxLength={CONTACT_LIMITS.locationMax}
              placeholder="Ex. JJKdle, boutique, casino — blackjack…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact-steps" className={labelClass}>
              Étapes pour reproduire (facultatif)
            </label>
            <textarea
              id="contact-steps"
              value={bugSteps}
              onChange={(e) => setBugSteps(e.target.value)}
              maxLength={CONTACT_LIMITS.stepsMax}
              rows={3}
              placeholder={"1. Je lance une partie\n2. Je clique sur…\n3. Le jeu se bloque"}
              className={inputClass}
            />
          </div>
        </>
      )}

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={CONTACT_LIMITS.messageMax}
          rows={5}
          className={inputClass}
        />
        <p className="mt-1 text-right text-[11px] text-white/35">
          {message.trim().length} / {CONTACT_LIMITS.messageMax}
        </p>
      </div>

      {/* Pot de miel : hors écran, ignoré des lecteurs d'écran et de l'autofill. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-domain px-6 py-3 font-display text-sm font-black uppercase tracking-[0.2em] text-white shadow-glow transition-colors hover:bg-domain-light disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
