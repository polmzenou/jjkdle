import type { Instrumentation } from "next";

/**
 * Hook natif de Next : appelé pour toute erreur levée côté serveur (rendu de
 * page, Route Handler, Server Action, middleware). On alerte l'administration
 * par mail, avec anti-flood (cf. lib/mail/error-throttle.ts).
 *
 * Le middleware tourne sur l'Edge runtime, où nodemailer et Prisma ne sont pas
 * disponibles : l'import dynamique n'a lieu que sur le runtime Node.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/mail/report-error");
  await reportServerError(error, request, context);
};
