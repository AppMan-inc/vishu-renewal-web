"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import {
  customerPasswordResetErrorMessage,
  passwordResetEmailValidationMessage,
  requestCustomerPasswordReset,
} from "@/features/auth/customer-password-reset";
import { customerLoginHref } from "@/features/auth/customer-signup";
import { FORM_FIELD_LIMITS } from "@/features/form-validation";
import { firebaseAuth } from "@/lib/firebase/client";
import { siteAssetPath } from "@/lib/site-path";

export function CustomerPasswordReset() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submissionInProgress = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const loginHref = customerLoginHref(returnTo);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;

    const validationMessage = passwordResetEmailValidationMessage(email);
    setEmailError(validationMessage);
    setErrorMessage(null);
    if (validationMessage) {
      requestAnimationFrame(() => emailRef.current?.focus());
      return;
    }

    const normalizedEmail = email.trim();
    submissionInProgress.current = true;
    setIsLoading(true);
    try {
      await requestCustomerPasswordReset(firebaseAuth(), normalizedEmail);
      setSentEmail(normalizedEmail);
    } catch (error) {
      setErrorMessage(customerPasswordResetErrorMessage(error));
    } finally {
      submissionInProgress.current = false;
      setIsLoading(false);
    }
  }

  return (
    <main className="admin-login-page customer-login-page password-reset-page">
      <section
        className="admin-login-brand-panel"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(41, 38, 33, .12), rgba(41, 38, 33, .72)), url("${siteAssetPath("/images/salon-vishu-hero.jpg")}")`,
        }}
      >
        <div className="login-panel-decoration" aria-hidden="true">
          <VishuIcon name="leaf" />
        </div>
        <Brand />
        <div className="login-brand-copy">
          <p className="eyebrow">PASSWORD RESET</p>
          <h1>
            <span className="login-headline-line">安心して、</span>
            <span className="login-headline-line">もう一度ログイン。</span>
          </h1>
          <p>登録したメールアドレスへ、安全なパスワード再設定リンクをお送りします。</p>
        </div>
        <p className="login-panel-note">FOR SALON GUESTS · SECURE ACCOUNT</p>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="login-icon">
            <VishuIcon name={sentEmail ? "mail" : "lock"} />
          </div>
          <p className="eyebrow">PASSWORD RESET</p>
          <h2>{sentEmail ? "メールをご確認ください" : "パスワードを再設定"}</h2>
          <p className="login-guidance password-reset-guidance">
            {sentEmail
              ? `${sentEmail} にパスワード再設定用のメールを送信しました。`
              : "登録したメールアドレスを入力してください。パスワードを変更するためのリンクをお送りします。"}
          </p>

          {sentEmail ? (
            <div className="password-reset-complete" aria-live="polite">
              <p className="password-reset-note">
                メールが届かない場合は、迷惑メールフォルダと入力したアドレスをご確認ください。
              </p>
              <Link className="button button-primary" href={loginHref}>
                ログイン画面へ戻る
                <VishuIcon name="arrow" />
              </Link>
              <button
                className="password-reset-text-button"
                type="button"
                onClick={() => {
                  setSentEmail(null);
                  setErrorMessage(null);
                  requestAnimationFrame(() => emailRef.current?.focus());
                }}
              >
                別のメールアドレスで再送する
              </button>
            </div>
          ) : (
            <>
              {errorMessage ? (
                <div className="login-error" role="alert">{errorMessage}</div>
              ) : null}
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="password-reset-email">メールアドレス</label>
                <div className={`input-wrap${emailError ? " is-invalid" : ""}`}>
                  <VishuIcon name="mail" />
                  <input
                    id="password-reset-email"
                    name="email"
                    type="email"
                    ref={emailRef}
                    value={email}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    maxLength={FORM_FIELD_LIMITS.email}
                    aria-invalid={Boolean(emailError)}
                    aria-describedby={emailError ? "password-reset-email-error" : undefined}
                    onBlur={(event) => {
                      setEmailError(passwordResetEmailValidationMessage(event.currentTarget.value));
                    }}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setEmail(value);
                      if (emailError) setEmailError(passwordResetEmailValidationMessage(value));
                    }}
                  />
                </div>
                {emailError ? (
                  <p className="login-field-error" id="password-reset-email-error" aria-live="polite">
                    {emailError}
                  </p>
                ) : null}
                <button className="button button-primary" type="submit" disabled={isLoading}>
                  {isLoading ? "送信中…" : "再設定メールを送信"}
                  <VishuIcon name="arrow" />
                </button>
              </form>
              <Link className="back-link password-reset-back-link" href={loginHref}>
                <VishuIcon name="arrow" />
                ログイン画面へ戻る
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
