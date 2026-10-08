"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "@/components/cards/CardIcons";
import { ContactForm, type ContactSender } from "./ContactForm";

/**
 * Lien « Contact » du footer + sa modale. SEUL point d'entrée du formulaire de
 * contact (pas de page dédiée). Se ferme via la croix, un clic hors du panneau
 * ou Échap ; après un envoi réussi, un message de confirmation s'affiche puis
 * la modale se referme d'elle-même.
 */
export function ContactButton({
  sender,
  className,
}: {
  sender: ContactSender | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  // Remonter le formulaire à chaque ouverture (champs vides après un envoi).
  const [formKey, setFormKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  useEffect(() => {
    if (!sent) return;
    const t = window.setTimeout(close, 2500);
    return () => window.clearTimeout(t);
  }, [sent, close]);

  function openModal() {
    setSent(false);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        className={className}
      >
        Contact
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={close}
                className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 sm:items-center sm:p-6"
              >
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="contact-title"
                  tabIndex={-1}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-void-900 p-5 shadow-[0_24px_80px_-20px_rgb(var(--color-domain)/0.45)] outline-none sm:rounded-3xl sm:p-7"
                >
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Fermer"
                    className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <CloseIcon />
                  </button>
                  <h2
                    id="contact-title"
                    className="pr-12 font-display text-xl font-black uppercase tracking-[0.12em] text-white"
                  >
                    Nous contacter
                  </h2>
                  <p className="mb-5 mt-1 text-sm text-white/50">
                    Ton message arrive directement dans la boîte de l&apos;équipe.
                  </p>
                  {sent ? (
                    <div className="py-10 text-center">
                      <p className="font-display text-lg font-bold text-white">
                        Message envoyé, merci !
                      </p>
                      <p className="mt-1 text-sm text-white/50">
                        L&apos;équipe te répondra par mail si besoin.
                      </p>
                    </div>
                  ) : (
                    <ContactForm
                      key={formKey}
                      sender={sender}
                      onSent={() => setSent(true)}
                    />
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
