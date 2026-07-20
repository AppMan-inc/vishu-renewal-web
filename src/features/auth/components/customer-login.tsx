"use client";

import {
  AuthError,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import { firebaseAuth } from "@/lib/firebase/client";
import { safeCustomerReturnTo } from "@/features/auth/return-to";

type LoginMethod = "email" | "google" | "apple";

export function CustomerLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeCustomerReturnTo(searchParams.get("returnTo"));
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pendingMethod, setPendingMethod] = useState<LoginMethod | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        firebaseAuth(),
        (user) => {
          if (user) {
            router.replace(returnTo);
            return;
          }
          setIsCheckingAuth(false);
        },
        () => setIsCheckingAuth(false),
      );
    } catch {
      queueMicrotask(() => setIsCheckingAuth(false));
    }

    return unsubscribe;
  }, [returnTo, router]);

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

  async function authenticate(method: LoginMethod, action: () => Promise<unknown>) {
    setPendingMethod(method);
    setErrorMessage(null);

    try {
      await action();
      router.replace(returnTo);
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
      setPendingMethod(null);
    }
  }

  const isPending = pendingMethod !== null || isCheckingAuth;

  return (
    <main className="admin-login-page customer-login-page">
      <section className="admin-login-brand-panel">
        <div className="login-panel-decoration" aria-hidden="true">
          <VishuIcon name="leaf" />
        </div>
        <Brand />
        <div className="login-brand-copy">
          <p className="eyebrow">CUSTOMER SIGN IN</p>
          <h1>ご予約を、<br />安心してスムーズに。</h1>
          <p>ご予約内容をお客様のアカウントに安全に紐づけ、あとから確認できるようにします。</p>
        </div>
        <p className="login-panel-note">FOR SALON GUESTS · SECURE BOOKING</p>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="login-icon"><VishuIcon name="lock" /></div>
          <p className="eyebrow">SIGN IN TO BOOK</p>
          <h2>ログイン</h2>
          <p className="login-guidance">Web予約にはログインが必要です。アプリと同じアカウントをご利用いただけます。</p>

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
              {pendingMethod === "google" ? "Googleでログイン中…" : "Googleでログイン"}
            </button>
            <button
              className="button button-quiet"
              type="button"
              disabled={isPending}
              onClick={() => handleSocialLogin("apple")}
            >
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
    default:
      return "ログインできませんでした。時間をおいて再度お試しください。";
  }
}
