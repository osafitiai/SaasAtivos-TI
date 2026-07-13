"use client";

import { useActionState } from "react";
import { changePassword, type ActionState } from "./actions";

const initial: ActionState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {state.success}
        </div>
      )}
      <div>
        <label className="label">Senha atual</label>
        <input name="current" type="password" required className="input" />
      </div>
      <div>
        <label className="label">Nova senha</label>
        <input name="next" type="password" required className="input" />
      </div>
      <div>
        <label className="label">Confirmar nova senha</label>
        <input name="confirm" type="password" required className="input" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Salvando..." : "Alterar senha"}
      </button>
    </form>
  );
}
