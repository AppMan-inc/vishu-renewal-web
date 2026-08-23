import Link from "next/link";
import { PageFooter, SiteHeader } from "@/components/vishu-ui";
import styles from "./legal-page.module.css";

type LegalSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

type LegalPageProps = {
  title: string;
  englishTitle: string;
  description: string;
  effectiveDate: string;
  sections: readonly LegalSection[];
};

export function LegalPage({
  title,
  englishTitle,
  description,
  effectiveDate,
  sections,
}: LegalPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.headerWrap}>
        <SiteHeader />
      </div>
      <main className={styles.main}>
        <nav className={styles.breadcrumbs} aria-label="パンくずリスト">
          <Link href="/">ホーム</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <header className={styles.heading}>
          <p>{englishTitle}</p>
          <h1>{title}</h1>
          <span>{description}</span>
          <small>制定日：{effectiveDate}</small>
        </header>

        <div className={styles.document}>
          {sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`legal-section-${index + 1}`}>
              <h2 id={`legal-section-${index + 1}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <ol>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ol>
              )}
            </section>
          ))}
        </div>

        <div className={styles.backLink}>
          <Link href="/">トップページへ戻る</Link>
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
