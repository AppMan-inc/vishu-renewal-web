"use client";

import { FormEvent, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { VishuIcon } from "@/components/vishu-ui";
import { fetchAdminSnapshot } from "@/features/admin/admin-api";
import { firebaseAuth } from "@/lib/firebase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      await fetchAdminSnapshot();
      const returnTo = safeAdminReturnTo(searchParams.get("returnTo"));
      router.replace(returnTo);
    } catch (caught) {
      if (firebaseAuth().currentUser) await signOut(firebaseAuth());
      setError(adminLoginError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="owner-email">メールアドレス</label>
      <div className="input-wrap">
        <VishuIcon name="person" />
        <input
          autoComplete="username"
          id="owner-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
          required
          type="email"
          value={email}
        />
      </div>
      <label htmlFor="owner-password">パスワード</label>
      <div className="input-wrap">
        <VishuIcon name="lock" />
        <input
          autoComplete="current-password"
          id="owner-password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          type="password"
          value={password}
        />
      </div>
      {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={submitting} type="submit">
        {submitting ? "確認中…" : "ログイン"}
        <VishuIcon name="arrow" />
      </button>
    </form>
  );
}

function safeAdminReturnTo(value: string | null) {
  return value?.startsWith("/admin") && !value.startsWith("/admin/login")
    ? value
    : "/admin";
}

function adminLoginError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"].includes(error.code)) {
      return "メールアドレスまたはパスワードが正しくありません。";
    }
    if (error.code === "auth/too-many-requests") return "試行回数が多すぎます。時間をおいてお試しください。";
    if (error.code === "auth/network-request-failed") return "通信状況を確認して、もう一度お試しください。";
  }
  return error instanceof Error ? error.message : "ログインできませんでした。";
}
