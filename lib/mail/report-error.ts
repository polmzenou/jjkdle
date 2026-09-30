import "server-only";
import { sendMail } from "./send";
import { errorMail } from "./templates";
import { recordError } from "./error-throttle";

/**
 * Signale une erreur serveur par mail (appelé par `onRequestError`, cf.
 * instrumentation.ts). Ignoré hors production, sauf `NOTIFY_IN_DEV=1` — en dev,
 * chaque faute de frappe partirait sinon dans la boîte mail. Ne lève jamais.
 */
export async function reportServerError(
  error: unknown,
  request: { path: string; method: string },
  context: { routeType?: string; routePath?: string },
): Promise<void> {
  if (process.env.NODE_ENV !== "production" && process.env.NOTIFY_IN_DEV !== "1") {
    return;
  }
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const digest = (err as Error & { digest?: string }).digest;
    // Erreurs de contrôle de flux de Next (notFound, redirect…) : pas des bugs.
    if (digest && /^(NEXT_|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT)/.test(digest)) {
      return;
    }
    const path = context.routePath ?? request.path.split("?")[0];
    const decision = await recordError(path, err.message);
    if (!decision.send) return;

    await sendMail(
      errorMail({
        message: err.message || "(sans message)",
        path: request.path,
        method: request.method,
        routeType: context.routeType,
        routePath: context.routePath,
        digest,
        stack: err.stack,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "?",
        occurrences: decision.occurrences,
      }),
    );
  } catch (e) {
    console.error("[mail] reportServerError a échoué :", e);
  }
}
