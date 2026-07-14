"use client";

import { useState } from "react";

export function ConfirmButton({
  action,
  message = "Tem certeza? Esta ação não pode ser desfeita.",
  className = "btn-danger",
  children,
  hidden,
}: {
  action: () => Promise<void>;
  message?: string;
  className?: string;
  children: React.ReactNode;
  hidden?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Confirmar ação
            </h3>
            <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">{message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </button>
              <form
                action={async () => {
                  setPending(true);
                  await action();
                }}
              >
                {hidden &&
                  Object.entries(hidden).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                <button type="submit" className="btn-danger" disabled={pending}>
                  {pending ? "Processando..." : "Confirmar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
