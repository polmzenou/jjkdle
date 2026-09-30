/**
 * Gabarits des mails envoyés à l'administration. Module PUR (aucun accès
 * réseau/DB) : testable sans SMTP, cf. templates.test.ts.
 *
 * Tout mail = un titre, un tableau clé/valeur et éventuellement des blocs de
 * texte libre. Tout contenu venu d'un utilisateur passe par `escapeHtml`.
 */

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export type Row = [label: string, value: string | number | null | undefined];

export interface Block {
  title: string;
  body: string;
  /** Police à chasse fixe (stack d'erreur). */
  mono?: boolean;
}

const BRAND = "Anime Arcade";
/** Préfixe des notifications automatiques (pas des messages de contact). */
export const NOTIFY_PREFIX = `[${BRAND}]`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDateFr(date: Date): string {
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  });
}

const show = (v: Row[1]) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

/** Construit un mail (HTML + texte brut) à partir de lignes et de blocs. */
export function renderMail(opts: {
  subject: string;
  title: string;
  accent?: string;
  intro?: string;
  rows?: Row[];
  blocks?: Block[];
  date?: Date;
}): RenderedMail {
  const accent = opts.accent ?? "#7c3aed";
  const date = opts.date ?? new Date();
  const rows = (opts.rows ?? []).filter(([, v]) => v !== undefined);
  const blocks = opts.blocks ?? [];

  const rowsHtml = rows
    .map(
      ([label, value]) => `<tr>
  <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
  <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600">${escapeHtml(show(value))}</td>
</tr>`,
    )
    .join("");

  const blocksHtml = blocks
    .map(
      (b) => `<h3 style="margin:24px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:${accent}">${escapeHtml(b.title)}</h3>
<div style="white-space:pre-wrap;word-break:break-word;background:#f3f4f6;border-radius:8px;padding:12px 14px;font-size:${b.mono ? "12px" : "14px"};line-height:1.5;color:#111827;${b.mono ? "font-family:ui-monospace,Menlo,Consolas,monospace" : ""}">${escapeHtml(b.body)}</div>`,
    )
    .join("");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
  <div style="background:#0b0b12;border-radius:12px 12px 0 0;padding:16px 20px;border-bottom:4px solid ${accent}">
    <span style="color:#fff;font-weight:900;letter-spacing:.2em;text-transform:uppercase;font-size:13px">${BRAND}</span>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:20px;border:1px solid #e5e7eb;border-top:0">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111827">${escapeHtml(opts.title)}</h2>
    ${opts.intro ? `<p style="margin:0 0 16px;color:#374151;font-size:14px">${escapeHtml(opts.intro)}</p>` : ""}
    ${rowsHtml ? `<table role="presentation" style="border-collapse:collapse">${rowsHtml}</table>` : ""}
    ${blocksHtml}
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:11px;margin:12px 0 0">${escapeHtml(formatDateFr(date))} · mail automatique</p>
</div></body></html>`;

  const text = [
    opts.title,
    "=".repeat(Math.min(opts.title.length, 60)),
    ...(opts.intro ? [opts.intro, ""] : []),
    ...rows.map(([l, v]) => `${l} : ${show(v)}`),
    ...blocks.map((b) => `\n── ${b.title} ──\n${b.body}`),
    "",
    `${formatDateFr(date)} · mail automatique ${BRAND}`,
  ].join("\n");

  return { subject: opts.subject, html, text };
}

// ── Formulaire de contact ──────────────────────────────────────────────────

export type ContactKind = "GENERAL" | "BUG" | "IDEA";

/** Libellé du type, repris dans l'OBJET du mail (« Message utilisateur — Bug »). */
export const CONTACT_KIND_LABEL: Record<ContactKind, string> = {
  GENERAL: "Administration",
  BUG: "Bug",
  IDEA: "Amélioration",
};

const CONTACT_KIND_TITLE: Record<ContactKind, string> = {
  GENERAL: "Message à l'équipe d'administration",
  BUG: "Signalement de bug",
  IDEA: "Proposition d'amélioration",
};

const CONTACT_ACCENT: Record<ContactKind, string> = {
  GENERAL: "#7c3aed",
  BUG: "#dc2626",
  IDEA: "#f59e0b",
};

export interface ContactMailInput {
  kind: ContactKind;
  name: string;
  email: string;
  message: string;
  /** Pseudo du compte si l'expéditeur est connecté. */
  username?: string | null;
  profileUrl?: string | null;
  universe?: string | null;
  userAgent?: string | null;
  /** Bug : page / jeu concerné. */
  bugLocation?: string | null;
  /** Bug : étapes pour reproduire. */
  bugSteps?: string | null;
  /** Idée : accepte d'être crédité sous son pseudo. */
  creditOk?: boolean;
  date?: Date;
}

export function contactSubject(kind: ContactKind): string {
  return `Message utilisateur — ${CONTACT_KIND_LABEL[kind]}`;
}

export function contactMail(input: ContactMailInput): RenderedMail {
  const rows: Row[] = [
    ["Type", CONTACT_KIND_TITLE[input.kind]],
    ["Nom", input.name],
    ["Email", input.email],
    ["Compte", input.username ? input.username : "Visiteur (non connecté)"],
  ];
  if (input.profileUrl) rows.push(["Profil", input.profileUrl]);
  if (input.universe) rows.push(["Univers", input.universe]);
  if (input.kind === "BUG") rows.push(["Page / jeu", input.bugLocation]);
  if (input.kind === "IDEA") {
    rows.push(["Accepte d'être crédité", input.creditOk ? "Oui" : "Non"]);
  }
  if (input.userAgent) rows.push(["Navigateur", input.userAgent]);

  const blocks: Block[] = [];
  if (input.kind === "BUG" && input.bugSteps) {
    blocks.push({ title: "Étapes pour reproduire", body: input.bugSteps });
  }
  blocks.push({ title: "Message", body: input.message });

  return renderMail({
    subject: contactSubject(input.kind),
    title: CONTACT_KIND_TITLE[input.kind],
    accent: CONTACT_ACCENT[input.kind],
    intro: "Répondre à ce mail écrit directement à l'expéditeur.",
    rows,
    blocks,
    date: input.date,
  });
}

// ── Notifications d'administration ────────────────────────────────────────

export type AdminEvent =
  | {
      kind: "user.registered";
      username: string;
      email: string;
      role: string;
      totalUsers: number;
    }
  | {
      kind: "game.toggled";
      game: string;
      universe: string;
      enabled: boolean;
      by: string;
    }
  | {
      kind: "maintenance.toggled";
      universe: string;
      enabled: boolean;
      message?: string;
      by: string;
    }
  | { kind: "casino.toggled"; enabled: boolean; by: string }
  | {
      kind: "user.role";
      username: string;
      email: string;
      from: string;
      to: string;
      by: string;
    }
  | { kind: "user.deleted"; username: string; email: string; by: string }
  | { kind: "user.renamed"; from: string; to: string; by: string }
  | { kind: "universe.created"; slug: string; name: string; by: string }
  | {
      kind: "universe.renamed";
      slug: string;
      from: string;
      to: string;
      by: string;
    }
  | { kind: "universe.deleted"; slug: string; name: string; by: string };

const onOff = (enabled: boolean) => (enabled ? "ACTIVÉ" : "DÉSACTIVÉ");

export function adminEventMail(event: AdminEvent, date?: Date): RenderedMail {
  const s = (subject: string) => `${NOTIFY_PREFIX} ${subject}`;
  switch (event.kind) {
    case "user.registered":
      return renderMail({
        subject: s(`Nouvel inscrit : ${event.username}`),
        title: "Nouvel utilisateur inscrit",
        accent: "#16a34a",
        rows: [
          ["Pseudo", event.username],
          ["Email", event.email],
          ["Rôle attribué", event.role],
          ["Total d'inscrits", event.totalUsers],
        ],
        date,
      });
    case "game.toggled":
      return renderMail({
        subject: s(`Jeu ${event.enabled ? "ON" : "OFF"} : ${event.game} (${event.universe})`),
        title: `Jeu ${event.enabled ? "réactivé" : "désactivé"}`,
        accent: event.enabled ? "#16a34a" : "#dc2626",
        rows: [
          ["Jeu", event.game],
          ["Univers", event.universe],
          ["Nouvel état", onOff(event.enabled)],
          ["Par", event.by],
        ],
        date,
      });
    case "maintenance.toggled":
      return renderMail({
        subject: s(`Maintenance ${event.enabled ? "ON" : "OFF"} (${event.universe})`),
        title: `Mode maintenance ${event.enabled ? "activé" : "désactivé"}`,
        accent: event.enabled ? "#f59e0b" : "#16a34a",
        rows: [
          ["Univers", event.universe],
          ["Nouvel état", onOff(event.enabled)],
          ["Par", event.by],
        ],
        blocks: event.message
          ? [{ title: "Message affiché aux joueurs", body: event.message }]
          : [],
        date,
      });
    case "casino.toggled":
      return renderMail({
        subject: s(`Casino ${event.enabled ? "ouvert" : "fermé"}`),
        title: `Casino ${event.enabled ? "ouvert" : "fermé"}`,
        accent: event.enabled ? "#16a34a" : "#dc2626",
        rows: [
          ["Nouvel état", onOff(event.enabled)],
          ["Par", event.by],
        ],
        date,
      });
    case "user.role":
      return renderMail({
        subject: s(`Rôle modifié : ${event.username} (${event.from} → ${event.to})`),
        title: "Changement de rôle",
        rows: [
          ["Joueur", event.username],
          ["Email", event.email],
          ["Ancien rôle", event.from],
          ["Nouveau rôle", event.to],
          ["Par", event.by],
        ],
        date,
      });
    case "user.deleted":
      return renderMail({
        subject: s(`Compte supprimé : ${event.username}`),
        title: "Compte supprimé",
        accent: "#dc2626",
        rows: [
          ["Pseudo", event.username],
          ["Email", event.email],
          ["Par", event.by],
        ],
        date,
      });
    case "user.renamed":
      return renderMail({
        subject: s(`Joueur renommé : ${event.from} → ${event.to}`),
        title: "Joueur renommé par le super-admin",
        rows: [
          ["Ancien pseudo", event.from],
          ["Nouveau pseudo", event.to],
          ["Par", event.by],
        ],
        date,
      });
    case "universe.created":
      return renderMail({
        subject: s(`Univers créé : ${event.name}`),
        title: "Nouvel univers",
        accent: "#16a34a",
        rows: [
          ["Nom", event.name],
          ["Slug", event.slug],
          ["Par", event.by],
        ],
        date,
      });
    case "universe.renamed":
      return renderMail({
        subject: s(`Univers renommé : ${event.from} → ${event.to}`),
        title: "Univers renommé",
        rows: [
          ["Slug", event.slug],
          ["Ancien nom", event.from],
          ["Nouveau nom", event.to],
          ["Par", event.by],
        ],
        date,
      });
    case "universe.deleted":
      return renderMail({
        subject: s(`Univers supprimé : ${event.name}`),
        title: "Univers supprimé",
        accent: "#dc2626",
        rows: [
          ["Nom", event.name],
          ["Slug", event.slug],
          ["Par", event.by],
        ],
        date,
      });
  }
}

// ── Erreurs serveur ───────────────────────────────────────────────────────

export interface ErrorMailInput {
  message: string;
  path: string;
  method: string;
  routeType?: string;
  routePath?: string;
  digest?: string;
  stack?: string;
  environment: string;
  /** Occurrences depuis le dernier mail pour cette erreur. */
  occurrences: number;
  date?: Date;
}

const MAX_STACK = 4000;

export function errorMail(input: ErrorMailInput): RenderedMail {
  const shortMessage =
    input.message.length > 80 ? `${input.message.slice(0, 77)}…` : input.message;
  const blocks: Block[] = [{ title: "Message", body: input.message }];
  if (input.stack) {
    blocks.push({
      title: "Stack",
      body:
        input.stack.length > MAX_STACK
          ? `${input.stack.slice(0, MAX_STACK)}\n… (tronquée)`
          : input.stack,
      mono: true,
    });
  }
  return renderMail({
    subject: `${NOTIFY_PREFIX} Erreur serveur : ${shortMessage}`,
    title: "Erreur serveur",
    accent: "#dc2626",
    intro:
      input.occurrences > 1
        ? `Cette erreur s'est produite ${input.occurrences} fois depuis la dernière alerte.`
        : "Première occurrence de cette erreur (les suivantes sont regroupées pendant 30 min).",
    rows: [
      ["Chemin", input.path],
      ["Méthode", input.method],
      ["Type de rendu", input.routeType],
      ["Route", input.routePath],
      ["Digest", input.digest],
      ["Environnement", input.environment],
    ],
    blocks,
    date: input.date,
  });
}

// ── Résumé quotidien ──────────────────────────────────────────────────────

export interface DigestInput {
  newUsers: { username: string; email: string }[];
  totalUsers: number;
  gamesPlayed: { game: string; count: number }[];
  contacts: Record<ContactKind, number>;
  unmailedContacts: number;
  errors: { message: string; path: string; count: number }[];
  disabledGames: { universe: string; game: string }[];
  maintenance: string[];
  casinoOpen: boolean;
  date?: Date;
}

export function digestMail(input: DigestInput): RenderedMail {
  const totalGames = input.gamesPlayed.reduce((n, g) => n + g.count, 0);
  const totalContacts =
    input.contacts.GENERAL + input.contacts.BUG + input.contacts.IDEA;
  const list = (lines: string[], empty: string) =>
    lines.length ? lines.join("\n") : empty;

  return renderMail({
    subject: `${NOTIFY_PREFIX} Résumé des dernières 24 h`,
    title: "Résumé quotidien",
    intro: "Activité du site sur les dernières 24 heures.",
    rows: [
      ["Nouveaux inscrits", input.newUsers.length],
      ["Total d'inscrits", input.totalUsers],
      ["Parties jouées", totalGames],
      ["Messages de contact", totalContacts],
      ["Erreurs distinctes", input.errors.length],
      ["Casino", input.casinoOpen ? "Ouvert" : "Fermé"],
    ],
    blocks: [
      {
        title: "Nouveaux inscrits",
        body: list(
          input.newUsers.map((u) => `• ${u.username} — ${u.email}`),
          "Aucun.",
        ),
      },
      {
        title: "Parties par jeu",
        body: list(
          input.gamesPlayed
            .filter((g) => g.count > 0)
            .map((g) => `• ${g.game} : ${g.count}`),
          "Aucune partie enregistrée.",
        ),
      },
      {
        title: "Messages de contact",
        body:
          `• Administration : ${input.contacts.GENERAL}\n` +
          `• Bugs : ${input.contacts.BUG}\n` +
          `• Améliorations : ${input.contacts.IDEA}` +
          (input.unmailedContacts
            ? `\n⚠ ${input.unmailedContacts} message(s) archivé(s) mais NON envoyé(s) par mail (voir la table ContactMessage).`
            : ""),
      },
      {
        title: "Erreurs serveur",
        body: list(
          input.errors.map((e) => `• ×${e.count} ${e.path} — ${e.message}`),
          "Aucune erreur. 🎉",
        ),
      },
      {
        title: "État du site",
        body:
          `Jeux désactivés : ${
            input.disabledGames.length
              ? input.disabledGames.map((g) => `${g.game} (${g.universe})`).join(", ")
              : "aucun"
          }\n` +
          `Univers en maintenance : ${
            input.maintenance.length ? input.maintenance.join(", ") : "aucun"
          }`,
      },
    ],
    date: input.date,
  });
}
