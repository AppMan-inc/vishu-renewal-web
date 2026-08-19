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
import {
  emailValidationMessage,
  FORM_FIELD_LIMITS,
} from "@/features/form-validation";

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
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmationRef = useRef<HTMLInputElement>(null);

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
    const firstInvalid = errors.email
      ? emailRef
      : errors.password
        ? passwordRef
        : errors.passwordConfirmation
          ? passwordConfirmationRef
          : null;
    if (firstInvalid) {
      requestAnimationFrame(() => {
        firstInvalid.current?.focus();
        firstInvalid.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

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

  function currentValues() {
    const formData = new FormData(formRef.current ?? undefined);
    return {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      passwordConfirmation: String(formData.get("passwordConfirmation") ?? ""),
    };
  }

  function validateField(field: keyof CustomerSignupErrors) {
    const error = validateCustomerSignup(currentValues())[field];
    setFieldErrors((current) => ({ ...current, [field]: error }));
  }

  function updateShownErrors(field: keyof CustomerSignupErrors) {
    const errors = validateCustomerSignup(currentValues());
    setFieldErrors((current) => {
      const next = { ...current };
      if (current[field]) next[field] = errors[field];
      if (field === "password" && current.passwordConfirmation) {
        next.passwordConfirmation = errors.passwordConfirmation;
      }
      return next;
    });
  }

  return (
    <main className="admin-login-page customer-login-page customer-signup-page">
      <section className="admin-login-form-panel">
        <div className="customer-signup-shell">
          <Brand />
          <div className="admin-login-card">
          <div className="login-icon"><VishuIcon name="person" /></div>
          <p className="eyebrow">CREATE ACCOUNT</p>
          <h2>新規アカウント作成</h2>
          <p className="login-guidance">メールアドレスとパスワードを入力してください。作成後、そのままマイページをご利用いただけます。</p>

          {errorMessage ? (
            <div className="login-error" role="alert">{errorMessage}</div>
          ) : null}

          <form ref={formRef} className="login-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="signup-email">メールアドレス</label>
            <div className={`input-wrap${fieldErrors.email ? " is-invalid" : ""}`}>
              <VishuIcon name="person" />
              <input
                id="signup-email"
                ref={emailRef}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
                onBlur={() => validateField("email")}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (value.length > FORM_FIELD_LIMITS.email) {
                    setFieldErrors((current) => ({
                      ...current,
                      email: emailValidationMessage(value) ?? undefined,
                    }));
                    return;
                  }
                  updateShownErrors("email");
                }}
              />
            </div>
            {fieldErrors.email ? (
              <p className="login-field-error" id="signup-email-error" aria-live="polite">{fieldErrors.email}</p>
            ) : null}

            <label htmlFor="signup-password">パスワード</label>
            <div className={`input-wrap${fieldErrors.password ? " is-invalid" : ""}`}>
              <VishuIcon name="lock" />
              <input
                id="signup-password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="6文字以上"
                minLength={6}
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-help"}
                onBlur={() => validateField("password")}
                onChange={() => updateShownErrors("password")}
              />
            </div>
            {fieldErrors.password ? (
              <p className="login-field-error" id="signup-password-error" aria-live="polite">{fieldErrors.password}</p>
            ) : (
              <p className="login-field-help" id="signup-password-help">6文字以上で入力してください。</p>
            )}

            <label htmlFor="signup-password-confirmation">パスワード（確認）</label>
            <div className={`input-wrap${fieldErrors.passwordConfirmation ? " is-invalid" : ""}`}>
              <VishuIcon name="lock" />
              <input
                id="signup-password-confirmation"
                ref={passwordConfirmationRef}
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                placeholder="もう一度入力"
                minLength={6}
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                aria-describedby={fieldErrors.passwordConfirmation ? "signup-password-confirmation-error" : undefined}
                onBlur={() => validateField("passwordConfirmation")}
                onChange={() => updateShownErrors("passwordConfirmation")}
              />
            </div>
            {fieldErrors.passwordConfirmation ? (
              <p className="login-field-error" id="signup-password-confirmation-error" aria-live="polite">{fieldErrors.passwordConfirmation}</p>
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
        </div>
      </section>
    </main>
  );
}
