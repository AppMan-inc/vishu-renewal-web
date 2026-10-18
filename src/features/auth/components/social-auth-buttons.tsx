"use client";

import type { CustomerSocialMethod } from "@/features/auth/customer-social-auth";

type SocialAuthButtonsProps = {
  intent: "login" | "signup";
  disabled: boolean;
  pendingMethod: string | null;
  onAuthenticate: (method: CustomerSocialMethod) => void;
};

export function SocialAuthButtons({
  intent,
  disabled,
  pendingMethod,
  onAuthenticate,
}: SocialAuthButtonsProps) {
  const action = intent === "signup" ? "新規登録" : "ログイン";

  return (
    <div className="social-login-actions">
      <button
        className="button button-quiet"
        type="button"
        disabled={disabled}
        onClick={() => onAuthenticate("google")}
      >
        <GoogleIcon />
        {pendingMethod === "google" ? `Googleで${action}中…` : `Googleで${action}`}
      </button>
      <button
        className="button button-quiet"
        type="button"
        disabled={disabled}
        onClick={() => onAuthenticate("apple")}
      >
        <AppleIcon />
        {pendingMethod === "apple" ? `Appleで${action}中…` : `Appleで${action}`}
      </button>
    </div>
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

