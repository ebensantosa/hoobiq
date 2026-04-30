"use client";
import * as React from "react";
import { Input } from "@hoobiq/ui";

/**
 * Password input with show/hide toggle (eye icon). Wraps the shared
 * Input so styling stays in lockstep with the rest of the form
 * controls. Used by /masuk, /daftar, /lupa-password, and the
 * reset-password confirm form.
 *
 * Accessibility: the toggle is a real <button> with aria-pressed +
 * aria-label so screen readers announce the state. The input keeps
 * its `type` swap (password ↔ text) so password managers still
 * recognise it on first paint.
 */
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Optional ref forwarded to the inner input. */
  inputRef?: React.Ref<HTMLInputElement>;
  invalid?: boolean;
};

export function PasswordField({ inputRef, invalid, className, ...rest }: Props) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type={show ? "text" : "password"}
        invalid={invalid}
        className={(className ?? "") + " pr-11"}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-fg-muted transition-colors hover:text-fg"
        tabIndex={-1}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
