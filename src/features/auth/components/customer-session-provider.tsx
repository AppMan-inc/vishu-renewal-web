"use client";

import type { User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createCustomerLogoutCoordinator } from "@/features/auth/customer-logout";

type CustomerSessionContextValue = {
  isAuthenticated: boolean;
  isSigningOut: boolean;
  openLogoutDialog: (trigger: HTMLElement) => void;
};

type CustomerLogoutButtonProps = {
  variant: "header" | "menu" | "mobile";
};

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);
const logoutErrorMessage =
  "ログアウトできませんでした。通信状況を確認して、もう一度お試しください。";

export function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(true);
  const logoutCoordinator = useMemo(
    () =>
      createCustomerLogoutCoordinator(async () => {
        const [{ signOut }, { firebaseAuth }] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase/client"),
        ]);
        await signOut(firebaseAuth());
      }),
    [],
  );

  useEffect(() => {
    isMountedRef.current = true;
    let unsubscribe: () => void = () => {};

    void Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase/client"),
    ])
      .then(([{ onAuthStateChanged }, { firebaseAuth }]) => {
        if (!isMountedRef.current) return;
        unsubscribe = onAuthStateChanged(
          firebaseAuth(),
          setUser,
          () => setUser(null),
        );
      })
      .catch(() => {
        // The initial unauthenticated state already hides all session controls.
      });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isLogoutDialogOpen && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!isLogoutDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isLogoutDialogOpen]);

  function closeLogoutDialog() {
    if (isSigningOut) return;
    setIsLogoutDialogOpen(false);
    setErrorMessage("");
    queueMicrotask(() => returnFocusRef.current?.focus());
  }

  function openLogoutDialog(trigger: HTMLElement) {
    if (!user || isSigningOut || isLogoutDialogOpen) return;
    returnFocusRef.current = trigger;
    setErrorMessage("");
    setIsLogoutDialogOpen(true);
  }

  async function confirmLogout() {
    if (logoutCoordinator.isRunning()) return;
    setIsSigningOut(true);
    setErrorMessage("");

    try {
      await logoutCoordinator.run();
      if (!isMountedRef.current) return;
      setIsLogoutDialogOpen(false);
    } catch {
      if (!isMountedRef.current) return;
      setErrorMessage(logoutErrorMessage);
    } finally {
      if (isMountedRef.current) setIsSigningOut(false);
    }
  }

  const contextValue = {
    isAuthenticated: Boolean(user),
    isSigningOut,
    openLogoutDialog,
  };

  return (
    <CustomerSessionContext.Provider value={contextValue}>
      {children}
      <dialog
        aria-describedby="customer-logout-description"
        aria-labelledby="customer-logout-title"
        aria-busy={isSigningOut}
        className="customer-logout-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closeLogoutDialog();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeLogoutDialog();
        }}
        ref={dialogRef}
      >
        <div className="customer-logout-dialog-content">
          <p className="module-label">SIGN OUT</p>
          <h2 id="customer-logout-title">ログアウトしますか？</h2>
          <p id="customer-logout-description">
            この端末でログアウトします。予約情報やアカウントは削除されません。
          </p>
          {errorMessage ? (
            <p className="account-form-message is-error customer-logout-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="customer-logout-dialog-actions">
            <button
              autoFocus
              className="button button-quiet"
              disabled={isSigningOut}
              onClick={closeLogoutDialog}
              type="button"
            >
              キャンセル
            </button>
            <button
              className="button reservation-cancel-confirm customer-logout-confirm"
              disabled={isSigningOut}
              onClick={() => void confirmLogout()}
              type="button"
            >
              {isSigningOut ? (
                <>
                  <span className="customer-logout-spinner" aria-hidden="true" />
                  ログアウト中…
                </>
              ) : (
                "ログアウト"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </CustomerSessionContext.Provider>
  );
}

export function CustomerLogoutButton({ variant }: CustomerLogoutButtonProps) {
  const session = useCustomerSession();
  if (!session.isAuthenticated) return null;

  const isMobile = variant === "mobile";
  return (
    <button
      aria-label="ログアウト"
      className={`customer-logout-button is-${variant}${variant === "header" ? " header-session-button" : ""}`}
      disabled={session.isSigningOut}
      onClick={(event) => session.openLogoutDialog(event.currentTarget)}
      title={isMobile ? "ログアウト" : undefined}
      type="button"
    >
      <LogoutIcon />
      {isMobile ? <span className="visually-hidden">ログアウト</span> : <span>ログアウト</span>}
    </button>
  );
}

export function CustomerSessionOnly({ children }: { children: React.ReactNode }) {
  return useCustomerSession().isAuthenticated ? children : null;
}

function useCustomerSession() {
  const value = useContext(CustomerSessionContext);
  if (!value) {
    throw new Error("Customer logout controls require CustomerSessionProvider.");
  }
  return value;
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <path d="M10 5H5v14h5M14 8l4 4-4 4m4-4H9" />
    </svg>
  );
}
