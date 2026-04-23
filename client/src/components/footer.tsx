import { Link } from"wouter";
import { BookOpen, Mail, MapPin, Twitter, Github, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  const platformLinks = [
    { label: t("footer.browseClasses"), href:"/classes", testId:"footer-link-classes" },
    { label: t("footer.dashboard"), href:"/dashboard", testId:"footer-link-dashboard" },
    { label: t("footer.createClass"), href:"/create-class", testId:"footer-link-create-class" },
    { label: t("footer.myBookings"), href:"/bookings", testId:"footer-link-bookings" },
  ];

  const resourceLinks = [
    { label: t("footer.aboutUs"), href:"/about", testId:"footer-link-about" },
    { label: t("footer.contact"), href:"/contact", testId:"footer-link-contact" },
    { label: t("footer.safeguarding"), href:"/safeguarding", testId:"footer-link-safeguarding" },
    { label: t("footer.privacyPolicy"), href:"/privacy", testId:"footer-link-privacy" },
    { label: t("footer.termsOfService"), href:"/terms", testId:"footer-link-terms" },
  ];

  const supportLinks = [
    { label: t("footer.helpCenter"), href:"/help-center", testId:"footer-link-help" },
    { label: t("footer.reportConcerns"), href:"/report", testId:"footer-link-report" },
    { label: t("footer.faq"), href:"/help-center", testId:"footer-link-faq" },
  ];

  return (
    <footer className="relative border-t border-border/40">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#667EEA] to-transparent" />

      <div className="bg-muted/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg font-display text-primary">TutorBridge</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("footer.description")}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
                  data-testid="link-social-twitter"
                >
                  <Twitter className="w-4 h-4 text-muted-foreground" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
                  data-testid="link-social-github"
                >
                  <Github className="w-4 h-4 text-muted-foreground" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
                  data-testid="link-social-youtube"
                >
                  <Youtube className="w-4 h-4 text-muted-foreground" />
                </a>
                <Link
                  href="/contact"
                  aria-label="Contact us"
                  className="w-8 h-8 rounded-md flex items-center justify-center border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
                  data-testid="link-social-contact"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm font-display">{t("footer.platform")}</h4>
              <div className="flex flex-col gap-2">
                {platformLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                    data-testid={link.testId}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm font-display">{t("footer.resources")}</h4>
              <div className="flex flex-col gap-2">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                    data-testid={link.testId}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm font-display">{t("footer.support")}</h4>
              <div className="flex flex-col gap-2">
                {supportLinks.map((link) => (
                  <Link
                    key={link.testId}
                    href={link.href}
                    className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
                    data-testid={link.testId}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" data-testid="text-copyright">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-tagline">
              {t("footer.tagline")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
