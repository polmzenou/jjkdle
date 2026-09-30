import type { Instrumentation } from "next";

/**
 * Hook natif de Next : appelé pour toute erreur levée côté serveur (rendu de
 * page, Route Handler, Server Action, middleware). On alerte l'administration
 * par mail, avec anti-flood (cf. lib/mail/error-throttle.ts).
 *
 * Ce fichier est AUSSI compilé pour l'Edge runtime (middleware), où nodemailer
 * et Prisma n'existent pas. L'import doit rester DANS le bloc
 * `if (NEXT_RUNTIME === "nodejs")` : webpack remplace la variable par une
 * constante et élimine le bloc du bundle Edge. Un `return` anticipé ne suffit
 * pas — le code qui suit reste analysé, et l'import de `node:https` casse le
 * build (« UnhandledSchemeError »).
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportServerError } = await import("@/lib/mail/report-error");
    await reportServerError(error, request, context);
  }
};
