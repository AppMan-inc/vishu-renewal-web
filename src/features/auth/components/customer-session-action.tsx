"use client";

import Link from "next/link";
import {
  CustomerLogoutButton,
  CustomerSessionOnly,
} from "@/features/auth/components/customer-session-provider";

export function CustomerSessionAction() {
  return (
    <CustomerSessionOnly>
      <span className="header-session-action">
        <Link className="header-account-link" href="/mypage">
          マイページ
        </Link>
        <CustomerLogoutButton variant="header" />
      </span>
    </CustomerSessionOnly>
  );
}
