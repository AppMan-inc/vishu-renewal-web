"use client";

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import {
  claimCustomerSignupSubmission,
  createCustomerAccount,
  customerLoginHref,
  customerSignupDestination,
  customerSignupErrorMessage,
  type CustomerSignupErrors,
  type CustomerSignupValues,
  validateCustomerSignup,
} from "@/features/auth/customer-signup";
import { firebaseAuth } from "@/lib/firebase/client";
import { siteAssetPath } from "@/lib/site-path";

export function CustomerSignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CustomerSignupErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedNavigation = useRef(false);
  const submissionInProgress = useRef(false);
  const isMounted = useRef(true);

  const navigateAsCustomer = useCallback(() => {
    if (hasStartedNavigation.current) return;
    hasStartedNavigation.current = true;
    router.replace(customerSignupDestination(returnTo));
  }, [returnTo, router]);

  useEffect(() => {
    isMounted.current = true;
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        firebaseAuth(),
        (user) => {
          if (user) {
            navigateAsCustomer();
            return;
          }
          setIsCheckingAuth(false);
        },
        () => setIsCheckingAuth(false),
      );
    } catch {
      queueMicrotask(() => {
        if (isMounted.current) setIsCheckingAuth(false);
      });
    }

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [navigateAsCustomer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current || hasStartedNavigation.current) return;

    const formData = new FormData(event.currentTarget);
    const values: CustomerSignupValues = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(
        formData.get("passwordConfirmation") ?? "",
      ),
    };
    const errors = validateCustomerSignup(values);

    setFieldErrors(errors);
    setErrorMessage(null);
    if (Object.keys(errors).length > 0) return;

    if (
      !claimCustomerSignupSubmission(
        submissionInProgress,
        hasStartedNavigation,
      )
    ) {
      return;
    }
    setIsSubmitting(true);

    try {
      await createCustomerAccount(firebaseAuth(), values);
      navigateAsCustomer();
    } catch (error) {
      submissionInProgress.current = false;
      if (!isMounted.current) return;
      setErrorMessage(customerSignupErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  const isPending = isCheckingAuth || isSubmitting;

  return (
    <main className="admin-login-page customer-login-page customer-signup-page">
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
          <p className="eyebrow">CREATE YOUR ACCOUNT</p>
          <h1>
            <span className="login-headline-line">いつものきれいを、</span>
            <span className="login-headline-line">もっと身近に。</span>
          </h1>
          <p>アカウントを作成すると、ご予約やプロフィールをひとつのマイページで確認できます。</p>
        </div>
        <p className="login-panel-note">FOR SALON GUESTS · SECURE BOOKING</p>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="login-icon"><VishuIcon name="person" /></div>
          <p className="eyebrow">CREATE ACCOUNT</p>
          <h2>新規アカウント作成</h2>
          <p className="login-guidance">メールアドレスとパスワードを入力してください。作成後、そのままマイページをご利用いただけます。</p>

          {errorMessage ? (
            <div className="login-error" role="alert">{errorMessage}</div>
          ) : null}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="signup-email">メールアドレス</label>
            <div className="input-wrap">
              <VishuIcon name="person" />
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
              />
            </div>
            {fieldErrors.email ? (
              <p className="login-field-error" id="signup-email-error">{fieldErrors.email}</p>
            ) : null}

            <label htmlFor="signup-password">パスワード</label>
            <div className="input-wrap">
              <VishuIcon name="lock" />
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="6文字以上"
                minLength={6}
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-help"}
              />
            </div>
            {fieldErrors.password ? (
              <p className="login-field-error" id="signup-password-error">{fieldErrors.password}</p>
            ) : (
              <p className="login-field-help" id="signup-password-help">6文字以上で入力してください。</p>
            )}

            <label htmlFor="signup-password-confirmation">パスワード（確認）</label>
            <div className="input-wrap">
              <VishuIcon name="lock" />
              <input
                id="signup-password-confirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                placeholder="もう一度入力"
                minLength={6}
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                aria-describedby={fieldErrors.passwordConfirmation ? "signup-password-confirmation-error" : undefined}
              />
            </div>
            {fieldErrors.passwordConfirmation ? (
              <p className="login-field-error" id="signup-password-confirmation-error">{fieldErrors.passwordConfirmation}</p>
            ) : null}

            <button className="button button-primary" type="submit" disabled={isPending}>
              {isSubmitting ? "作成中…" : "アカウントを作成"}
              <VishuIcon name="arrow" />
            </button>
          </form>

          <p className="signup-login-prompt">
            すでにアカウントをお持ちですか？
            <Link href={customerLoginHref(returnTo)}>ログイン</Link>
          </p>

          <Link className="back-link" href="/">
            <VishuIcon name="arrow" />
            トップページへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
