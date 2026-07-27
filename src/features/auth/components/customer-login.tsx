"use client";

import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  safeAdminReturnTo,
  safeCustomerReturnTo,
} from "@/features/auth/return-to";

type LoginMethod = "email" | "google" | "apple";

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pendingMethod, setPendingMethod] = useState<LoginMethod | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedNavigation = useRef(false);

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
      console.info("[auth] admin_access_check_started", {
        requestedAdmin: isAdminReturnTo(returnTo),
        source,
        uid: user.uid,
      });

      try {
        const access = await checkAdminAccess(user);
        const destination = loginDestination(access.isAdmin, returnTo);
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

    try {
      unsubscribe = onAuthStateChanged(
        firebaseAuth(),
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
    } catch (error) {
      console.error("[auth] session_check_initialization_failed", authErrorDetails(error));
      queueMicrotask(() => setIsCheckingAuth(false));
    }

    return unsubscribe;
  }, [navigateAfterSignIn]);

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

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

    await authenticate(method, () => signInWithPopup(firebaseAuth(), provider));
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
      console.error("[auth] sign_in_failed", {
        method,
        ...authErrorDetails(error),
      });
      setErrorMessage(authErrorMessage(error));
      setPendingMethod(null);
    }
  }

  const isPending = pendingMethod !== null || isCheckingAuth;

  return (
    <main className="admin-login-page customer-login-page">
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

          <form className="login-form" onSubmit={handleEmailLogin}>
            <label htmlFor="customer-email">メールアドレス</label>
            <div className="input-wrap">
              <VishuIcon name="person" />
              <input
                id="customer-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                disabled={isPending}
              />
            </div>
            <label htmlFor="customer-password">パスワード</label>
            <div className="input-wrap">
              <VishuIcon name="lock" />
              <input
                id="customer-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={isPending}
              />
            </div>
            <button className="button button-primary" type="submit" disabled={isPending}>
              {pendingMethod === "email" ? "ログイン中…" : "ログイン"}
              <VishuIcon name="arrow" />
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

          <Link className="back-link" href="/">
            <VishuIcon name="arrow" />
            トップページへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}

function loginDestination(isAdmin: boolean, returnTo: string | null) {
  return isAdmin
    ? safeAdminReturnTo(returnTo)
    : safeCustomerReturnTo(returnTo);
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

function authErrorMessage(error: unknown) {
  const code = (error as Partial<AuthError>)?.code;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/invalid-email":
      return "メールアドレスの形式を確認してください。";
    case "auth/too-many-requests":
      return "ログイン試行回数が多すぎます。時間をおいて再度お試しください。";
    case "auth/network-request-failed":
      return "通信できませんでした。ネットワーク接続を確認してください。";
    case "auth/popup-blocked":
      return "ログイン画面を開けませんでした。ポップアップを許可して再度お試しください。";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "ログインがキャンセルされました。";
    case "auth/operation-not-allowed":
      return "このログイン方法は現在利用できません。";
    case "auth/unauthorized-domain":
      return "このドメインではログインできません。Firebase Authenticationの承認済みドメインを確認してください。";
    case "auth/invalid-api-key":
      return "FirebaseのAPIキー設定を確認してください。";
    default:
      return "ログインできませんでした。時間をおいて再度お試しください。";
  }
}

function authErrorDetails(error: unknown) {
  const candidate = error as Partial<AuthError> | null;

  return {
    code: candidate?.code ?? "unknown",
    name: error instanceof Error ? error.name : typeof error,
  };
}

function pathWithoutQuery(value: string) {
  return value.split(/[?#]/, 1)[0];
}
