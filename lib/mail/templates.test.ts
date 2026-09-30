import { describe, expect, it } from "vitest";
import {
  adminEventMail,
  contactMail,
  contactSubject,
  errorMail,
  escapeHtml,
} from "./templates";
import { validateContact } from "@/lib/contact/validation";

describe("contactSubject", () => {
  it("précise le type choisi dans l'objet", () => {
    expect(contactSubject("GENERAL")).toBe("Message utilisateur — Administration");
    expect(contactSubject("BUG")).toBe("Message utilisateur — Bug");
    expect(contactSubject("IDEA")).toBe("Message utilisateur — Amélioration");
  });
});

describe("contactMail", () => {
  it("échappe le contenu utilisateur dans le HTML", () => {
    const mail = contactMail({
      kind: "BUG",
      name: "<script>alert(1)</script>",
      email: "a@b.fr",
      message: "Le jeu <b>plante</b> & ne répond plus",
      bugLocation: "JJKdle",
      bugSteps: "1. cliquer",
    });
    expect(mail.subject).toBe("Message utilisateur — Bug");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&lt;b&gt;plante&lt;/b&gt; &amp;");
    expect(mail.text).toContain("Page / jeu : JJKdle");
    expect(mail.text).toContain("Étapes pour reproduire");
  });

  it("mentionne l'accord de crédit pour une idée", () => {
    const mail = contactMail({
      kind: "IDEA",
      name: "Yuji",
      email: "y@j.fr",
      message: "Ajouter un mode survie",
      creditOk: true,
    });
    expect(mail.text).toContain("Accepte d'être crédité : Oui");
  });
});

describe("adminEventMail", () => {
  it("nouvel inscrit : pseudo et email", () => {
    const mail = adminEventMail({
      kind: "user.registered",
      username: "gojo",
      email: "gojo@jujutsu.jp",
      role: "PLAYER",
      totalUsers: 42,
    });
    expect(mail.subject).toBe("[Anime Arcade] Nouvel inscrit : gojo");
    expect(mail.text).toContain("Email : gojo@jujutsu.jp");
  });

  it("jeu désactivé", () => {
    const mail = adminEventMail({
      kind: "game.toggled",
      game: "JJKdle",
      universe: "Jujutsu Kaisen (jjk)",
      enabled: false,
      by: "admin",
    });
    expect(mail.subject).toBe("[Anime Arcade] Jeu OFF : JJKdle (Jujutsu Kaisen (jjk))");
    expect(mail.text).toContain("Nouvel état : DÉSACTIVÉ");
  });
});

describe("errorMail", () => {
  it("tronque la stack et annonce les occurrences", () => {
    const mail = errorMail({
      message: "boom",
      path: "/jjk/games",
      method: "GET",
      stack: "x".repeat(5000),
      environment: "production",
      occurrences: 3,
    });
    expect(mail.text).toContain("3 fois");
    expect(mail.text).toContain("(tronquée)");
  });
});

describe("escapeHtml", () => {
  it("échappe les guillemets", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});

describe("validateContact", () => {
  const base = {
    kind: "GENERAL",
    name: "Megumi",
    email: "Megumi@Fushiguro.JP",
    message: "Bonjour, j'ai une question sur les boosters.",
  };

  it("accepte un message valide et normalise l'email", () => {
    const r = validateContact(base);
    expect(r.ok && r.value.email).toBe("megumi@fushiguro.jp");
  });

  it("refuse un type inconnu, un email invalide, un message trop court", () => {
    expect(validateContact({ ...base, kind: "SPAM" }).ok).toBe(false);
    expect(validateContact({ ...base, email: "pas-un-mail" }).ok).toBe(false);
    expect(validateContact({ ...base, message: "court" }).ok).toBe(false);
  });

  it("ignore les champs bug hors type BUG et le crédit hors IDEA", () => {
    const r = validateContact({ ...base, bugLocation: "x", creditOk: true });
    expect(r.ok && r.value.bugLocation).toBe(null);
    expect(r.ok && r.value.creditOk).toBe(false);
  });
});
