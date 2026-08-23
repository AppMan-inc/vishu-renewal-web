"use client";

import {
  GoogleAuthProvider,
  getRedirectResult,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import type { AuthError, UserCredential } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import { AdminApiError, checkAdminAccess } from "@/features/admin/admin-api";
import { firebaseAuth } from "@/lib/firebase/client";
import { siteAssetPath } from "@/lib/site-path";
import {
  isAdminReturnTo,
  loginIntent,
  safeCustomerReturnTo,
} from "@/features/auth/return-to";
import { customerSignupHref } from "@/features/auth/customer-signup";
import { customerPasswordResetHref } from "@/features/auth/customer-password-reset";
import {
  emailValidationMessage,
  FORM_FIELD_LIMITS,
  loginAuthErrorMessage,
  type LoginFieldErrors,
  loginValidationErrors,
} from "@/features/form-validation";

type LoginMethod = "email" | "google" | "apple";

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pendingMethod, setPendingMethod] = useState<LoginMethod | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedNavigation = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const navigateAfterSignIn = useCallback(
    async (user: UserCredential["user"], source: "auth-state" | "credential") => {
      if (hasStartedNavigation.current) {
        console.info("[auth] navigation_skipped", {
          source,
          uid: user.uid,
        });
        return;
      }

      hasStartedNavigation.current = true;
      const intent = loginIntent(returnTo);

      if (!intent.requiresAdminAuthorization) {
        console.info("[auth] navigation_started", {
          destinationPath: pathWithoutQuery(intent.destination),
          isAdmin: false,
          requestedAdmin: false,
          source,
          uid: user.uid,
        });
        router.replace(intent.destination);
        return;
      }

      console.info("[auth] admin_access_check_started", {
        requestedAdmin: true,
        source,
        uid: user.uid,
      });

      try {
        const access = await checkAdminAccess(user);
        const destination = access.isAdmin
          ? intent.destination
          : safeCustomerReturnTo(returnTo);
        console.info("[auth] navigation_started", {
          destinationPath: pathWithoutQuery(destination),
          isAdmin: access.isAdmin,
          requestId: access.requestId,
          requestedAdmin: isAdminReturnTo(returnTo),
          source,
          uid: user.uid,
        });
        router.replace(destination);
      } catch (error) {
        hasStartedNavigation.current = false;
        console.error("[auth] admin_access_check_failed", {
          errorName: error instanceof Error ? error.name : typeof error,
          requestId: error instanceof AdminApiError ? error.requestId : undefined,
          source,
          status: error instanceof AdminApiError ? error.status : undefined,
          uid: user.uid,
        });
        const requestReference = error instanceof AdminApiError && error.requestId
          ? `（Request ID: ${error.requestId}）`
          : "";
        setErrorMessage(`ログイン後の権限を確認できませんでした。${requestReference}`);
        setIsCheckingAuth(false);
        setPendingMethod(null);
      }
    },
    [returnTo, router],
  );

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    let isActive = true;

    try {
      const auth = firebaseAuth();
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            console.info("[auth] session_detected", { uid: user.uid });
            void navigateAfterSignIn(user, "auth-state");
            return;
          }
          console.info("[auth] session_missing");
          setIsCheckingAuth(false);
        },
        (error) => {
          console.error("[auth] session_check_failed", authErrorDetails(error));
          setIsCheckingAuth(false);
        },
      );

      void getRedirectResult(auth)
        .then((credential) => {
          if (!credential || !isActive) return;
          console.info("[auth] redirect_sign_in_succeeded", {
            method: "apple",
            uid: credential.user.uid,
          });
          void navigateAfterSignIn(credential.user, "credential");
        })
        .catch((error) => {
          const details = authErrorDetails(error);
          console.error(
            `[auth] redirect_result_failed method=apple code=${details.code} name=${details.name} message=${details.message}`,
          );
          if (!isActive) return;
          setErrorMessage(loginAuthErrorMessage(error, "apple"));
          setIsCheckingAuth(false);
          setPendingMethod(null);
        });
    } catch (error) {
      console.error("[auth] session_check_initialization_failed", authErrorDetails(error));
      queueMicrotask(() => setIsCheckingAuth(false));
    }

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigateAfterSignIn]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawEmail = String(formData.get("email") ?? "");
    const email = rawEmail.trim();
    const password = String(formData.get("password") ?? "");
    const errors = loginValidationErrors({ email: rawEmail, password });
    setFieldErrors(errors);
    setErrorMessage(null);
    const firstInvalid = errors.email ? emailRef : errors.password ? passwordRef : null;
    if (firstInvalid) {
      requestAnimationFrame(() => {
        firstInvalid.current?.focus();
        firstInvalid.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }

    await authenticate("email", () =>
      signInWithEmailAndPassword(firebaseAuth(), email, password),
    );
  }

  async function handleSocialLogin(method: "google" | "apple") {
    const provider =
      method === "google"
        ? new GoogleAuthProvider()
        : new OAuthProvider("apple.com");

    if (provider instanceof OAuthProvider) {
      provider.addScope("email");
      provider.addScope("name");
    }

    if (method === "google") {
      await authenticate("google", () =>
        signInWithPopup(firebaseAuth(), provider),
      );
      return;
    }

    setPendingMethod("apple");
    setErrorMessage(null);
    console.info("[auth] sign_in_started", {
      method: "apple",
      mode: "popup",
      requestedAdmin: isAdminReturnTo(returnTo),
    });

    try {
      const credential = await signInWithPopup(firebaseAuth(), provider);
      console.info("[auth] sign_in_succeeded", {
        method: "apple",
        mode: "popup",
        uid: credential.user.uid,
      });
      void navigateAfterSignIn(credential.user, "credential");
    } catch (error) {
      const details = authErrorDetails(error);

      if (!shouldFallbackToRedirect(error)) {
        console.error(
          `[auth] sign_in_failed method=apple mode=popup code=${details.code} name=${details.name} message=${details.message}`,
        );
        setErrorMessage(loginAuthErrorMessage(error, "apple"));
        setPendingMethod(null);
        return;
      }

      console.warn(
        `[auth] popup_fallback_to_redirect method=apple code=${details.code} name=${details.name} message=${details.message}`,
      );
      console.info("[auth] redirect_sign_in_started", {
        method: "apple",
        requestedAdmin: isAdminReturnTo(returnTo),
      });

      try {
        await signInWithRedirect(firebaseAuth(), provider);
      } catch (redirectError) {
        const redirectDetails = authErrorDetails(redirectError);
        console.error(
          `[auth] redirect_sign_in_failed method=apple code=${redirectDetails.code} name=${redirectDetails.name} message=${redirectDetails.message}`,
        );
        setErrorMessage(loginAuthErrorMessage(redirectError, "apple"));
        setPendingMethod(null);
      }
    }
  }

  function openPasswordReset() {
    router.push(customerPasswordResetHref(returnTo, emailRef.current?.value));
  }

  async function authenticate(
    method: LoginMethod,
    action: () => Promise<UserCredential>,
  ) {
    setPendingMethod(method);
    setErrorMessage(null);
    console.info("[auth] sign_in_started", {
      method,
      requestedAdmin: isAdminReturnTo(returnTo),
    });

    try {
      const credential = await action();
      console.info("[auth] sign_in_succeeded", {
        method,
        uid: credential.user.uid,
      });
      void navigateAfterSignIn(credential.user, "credential");
    } catch (error) {
      const details = authErrorDetails(error);
      console.error(
        `[auth] sign_in_failed method=${method} code=${details.code} name=${details.name} message=${details.message}`,
      );
      setErrorMessage(loginAuthErrorMessage(error, method));
      setPendingMethod(null);
    }
  }

  const isPending = pendingMethod !== null || isCheckingAuth;

  return (
    <main className="admin-login-page customer-login-page">
      <section
        className="admin-login-brand-panel"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(41, 38, 33, .12), rgba(41, 38, 33, .72)), url("${siteAssetPath("/images/salon-vishu-exterior.webp")}")`,
          backgroundPosition: "42% center",
        }}
      >
        <div className="login-panel-decoration" aria-hidden="true">
          <VishuIcon name="leaf" />
        </div>
        <Brand />
        <div className="login-brand-copy">
          <p className="eyebrow">CUSTOMER SIGN IN</p>
          <h1>
            <span className="login-headline-line">ご予約を、</span>
            <span className="login-headline-line">安心してスムーズに。</span>
          </h1>
          <p>ご予約内容をお客様のアカウントに安全に紐づけ、あとから確認できるようにします。</p>
        </div>
        <p className="login-panel-note">FOR SALON GUESTS · SECURE BOOKING</p>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="login-icon"><VishuIcon name="lock" /></div>
          <p className="eyebrow">ACCOUNT SIGN IN</p>
          <h2>ログイン</h2>
          <p className="login-guidance">Web予約・予約履歴・プロフィール管理にはログインが必要です。アプリと同じアカウントをご利用いただけます。</p>

          {errorMessage ? (
            <div className="login-error" role="alert">{errorMessage}</div>
          ) : null}

          <form className="login-form" onSubmit={handleEmailLogin} noValidate>
            <label htmlFor="customer-email">メールアドレス</label>
            <div className={`input-wrap${fieldErrors.email ? " is-invalid" : ""}`}>
              <VishuIcon name="person" />
              <input
                id="customer-email"
                name="email"
                type="email"
                ref={emailRef}
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "customer-email-error" : undefined}
                onBlur={(event) => {
                  const message = emailValidationMessage(event.currentTarget.value);
                  setFieldErrors((current) => ({ ...current, email: message ?? undefined }));
                }}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFieldErrors((current) => {
                    if (value.length > FORM_FIELD_LIMITS.email || current.email) {
                      return { ...current, email: emailValidationMessage(value) ?? undefined };
                    }
                    return current;
                  });
                }}
              />
            </div>
            {fieldErrors.email ? (
              <p className="login-field-error" id="customer-email-error" aria-live="polite">{fieldErrors.email}</p>
            ) : null}
            <label htmlFor="customer-password">パスワード</label>
            <div className={`input-wrap${fieldErrors.password ? " is-invalid" : ""}`}>
              <VishuIcon name="lock" />
              <input
                id="customer-password"
                name="password"
                type="password"
                ref={passwordRef}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "customer-password-error" : undefined}
                onBlur={(event) => {
                  const value = event.currentTarget.value;
                  setFieldErrors((current) => ({
                    ...current,
                    password: value ? undefined : "パスワードを入力してください。",
                  }));
                }}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFieldErrors((current) => current.password
                    ? { ...current, password: value ? undefined : "パスワードを入力してください。" }
                    : current);
                }}
              />
            </div>
            {fieldErrors.password ? (
              <p className="login-field-error" id="customer-password-error" aria-live="polite">{fieldErrors.password}</p>
            ) : null}
            <button className="button button-primary" type="submit" disabled={isPending}>
              {pendingMethod === "email" ? "ログイン中…" : "ログイン"}
              <VishuIcon name="arrow" />
            </button>
            <button
              className="forgot-password-button"
              type="button"
              disabled={isPending}
              onClick={openPasswordReset}
            >
              パスワードをお忘れですか？
            </button>
          </form>

          <div className="auth-divider"><span>または</span></div>

          <div className="social-login-actions">
            <button
              className="button button-quiet"
              type="button"
              disabled={isPending}
              onClick={() => handleSocialLogin("google")}
            >
              <GoogleIcon />
              {pendingMethod === "google" ? "Googleでログイン中…" : "Googleでログイン"}
            </button>
            <button
              className="button button-quiet"
              type="button"
              disabled={isPending}
              onClick={() => handleSocialLogin("apple")}
            >
              <AppleIcon />
              {pendingMethod === "apple" ? "Appleでログイン中…" : "Appleでログイン"}
            </button>
          </div>

          <p className="signup-login-prompt">
            アカウントをお持ちでない方は
            <Link href={customerSignupHref(returnTo)}>新規アカウント作成</Link>
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

function GoogleIcon() {
  return (
    <svg className="social-login-icon" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.875 2.684-6.613Z"
      />
      <path
        fill="#34a853"
        d="M9 18c2.43 0 4.468-.806 5.956-2.182l-2.91-2.258c-.806.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.715H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#fbbc05"
        d="M3.963 10.704A5.41 5.41 0 0 1 3.682 9c0-.591.102-1.166.281-1.704V4.964H.957A9 9 0 0 0 0 9c0 1.452.347 2.827.957 4.036l3.006-2.332Z"
      />
      <path
        fill="#ea4335"
        d="M9 3.58c1.321 0 2.508.454 3.442 1.346l2.581-2.581C13.463.892 11.43 0 9 0A9 9 0 0 0 .957 4.964l3.006 2.332C4.672 5.166 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="social-login-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#000"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35-.07 2.29.74 3.08.74 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.64.71 3.39 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.15M12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25"
      />
    </svg>
  );
}

function authErrorDetails(error: unknown) {
  const candidate = error as Partial<AuthError> | null;

  return {
    code: candidate?.code ?? "unknown",
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : "unknown",
  };
}

function shouldFallbackToRedirect(error: unknown) {
  const code = (error as Partial<AuthError> | null)?.code;

  return code === "auth/popup-blocked"
    || code === "auth/operation-not-supported-in-this-environment";
}

function pathWithoutQuery(value: string) {
  return value.split(/[?#]/, 1)[0];
}
