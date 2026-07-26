import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import { CustomerAccountNavigation } from "@/features/account/components/customer-account";
import { CustomerAuthGuard } from "@/features/auth/components/customer-auth-guard";

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerAuthGuard>
      <main className="app-page account-page">
        <SiteHeader />
        <div className="account-shell">
          <CustomerAccountNavigation />
          {children}
        </div>
        <PageFooter />
      </main>
    </CustomerAuthGuard>
  );
}
