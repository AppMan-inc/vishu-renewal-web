"use client";

import Link from "next/link";
import {
  CustomerGuestOnly,
  CustomerLogoutButton,
  CustomerSessionOnly,
} from "@/features/auth/components/customer-session-provider";

export function CustomerSessionAction() {
  return (
    <>
      <CustomerGuestOnly>
        <Link className="header-login-link" href="/login">
          ログイン
        </Link>
      </CustomerGuestOnly>
      <CustomerSessionOnly>
        <span className="header-session-action">
          <Link className="header-account-link" href="/mypage">
            マイページ
          </Link>
          <CustomerLogoutButton variant="header" />
        </span>
      </CustomerSessionOnly>
    </>
  );
}
