import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Cookie, Mail, Scale, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Callout, Fill, LegalDocument, LegalSection, fr } from "@/components/legal/LegalDocument";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Politique de confidentialité · Belle" };

const ROWS: [what: string, why: string, basis: string, where: string][] = [
  [
    "Profil beauté : prénom, type de peau, sensibilité, carnation, préoccupations, allergies, ingrédients à éviter, préférences, budget, ville",
    "Calculer un score adapté à vous et personnaliser les conseils",
    "Votre consentement explicite (RGPD art. 6.1.a et 9.2.a : allergies et état de la peau peuvent être des données de santé)",
    "Dans votre navigateur. Envoyé à notre serveur à chaque recherche ou fiche produit pour calculer le score, sans y être conservé. Gardé jusqu'à ce que vous le supprimiez.",
  ],
  [
    "Copie du profil beauté et des favoris dans votre compte (seulement si vous activez « Retrouver mon profil sur tous mes appareils »)",
    "Retrouver votre profil sur un autre téléphone ou ordinateur",
    "Votre consentement explicite, donné en activant l'option (RGPD art. 9.2.a)",
    "Chez Upstash, rattachée à votre adresse e-mail Google. Supprimée quand vous désactivez l'option ou effacez vos données, et automatiquement après 13 mois sans modification.",
  ],
  [
    "Selfie (photo du visage)",
    "Estimer votre carnation et votre sous-ton",
    "Votre consentement explicite, demandé avant chaque premier envoi",
    "Transmis à Anthropic pour l'analyse, jamais enregistré par Belle. Seul le résultat (carnation, conseils) est gardé, dans votre navigateur.",
  ],
  [
    "Messages échangés avec la conseillère, accompagnés de votre profil",
    "Vous répondre",
    "Votre consentement (vous choisissez d'écrire)",
    "Transmis à Anthropic pour la réponse. Les 60 derniers messages sont gardés dans votre navigateur, jamais sur nos serveurs. Le bouton « Nouveau » les efface.",
  ],
  [
    "Photo de la liste d'ingrédients d'un produit",
    "Lire les ingrédients d'un produit absent de la base, pour calculer votre score",
    "Exécution du service que vous demandez (art. 6.1.b)",
    "Transmise à Anthropic, jamais enregistrée par Belle. La liste lue est gardée dans votre navigateur. Cadrez uniquement l'étiquette.",
  ],
  [
    "Recherche de teinte : produit, carnation et sous-ton",
    "Trouver les noms de teintes à essayer dans la gamme du produit",
    "Exécution du service que vous demandez (art. 6.1.b)",
    "Transmis à Anthropic. Le résultat, sans rien qui vous identifie, est gardé 14 jours pour être réutilisé.",
  ],
  [
    "Recherche de prix en ligne : nom du produit, marque, code-barres, ville",
    "Trouver les prix actuels chez les revendeurs",
    "Exécution du service que vous demandez (art. 6.1.b)",
    "Transmis à Anthropic. Le résultat (sans votre ville ni aucune donnée vous concernant) est gardé 6 h pour être réutilisé.",
  ],
  [
    "Compte Google : nom, adresse e-mail, photo de profil",
    "Vous connecter et augmenter vos limites d'utilisation",
    "Exécution du service (art. 6.1.b)",
    "Dans un cookie chiffré sur votre appareil, 30 jours au plus. Aucune base de comptes n'est tenue.",
  ],
  [
    "Adresse IP, ou adresse e-mail si vous êtes connectée",
    "Limiter le nombre de demandes à l'IA et éviter les abus",
    "Intérêt légitime : protéger le service (art. 6.1.f)",
    "Compteurs chez Upstash, effacés automatiquement après 24 h au plus.",
  ],
  [
    "Journaux techniques (adresse IP, page demandée, date)",
    "Faire fonctionner et sécuriser le site",
    "Intérêt légitime (art. 6.1.f)",
    "Chez l'hébergeur Vercel, selon sa durée de conservation.",
  ],
];

const COLUMNS = ["Données", "Pourquoi", "Base légale", "Où et combien de temps"] as const;

const TOC = [
  { id: "en-bref", label: "En bref" },
  { id: "responsable", label: "Qui est responsable" },
  { id: "donnees", label: "Quelles données, et combien de temps" },
  { id: "destinataires", label: "Qui reçoit vos données" },
  { id: "transferts", label: "Transferts hors de l’UE" },
  { id: "cookies", label: "Cookies et stockage local" },
  { id: "vos-droits", label: "Vos droits" },
  { id: "age", label: "Âge minimum" },
  { id: "modifications", label: "Modifications" },
];

const SUMMARY = [
  { Icon: Smartphone, text: "Votre profil beauté reste sur votre téléphone. Il n’est enregistré dans votre compte que si vous activez la synchronisation." },
  { Icon: ShieldCheck, text: "Votre selfie sert uniquement à l’analyse de teint, puis il est supprimé. Nous ne le gardons jamais." },
  { Icon: Ban, text: "Pas de publicité, pas de revente de données, pas de cookies de suivi." },
  { Icon: Trash2, text: "Vous pouvez tout effacer en un clic depuis votre profil." },
];

/** Recipients: name, role, country (only where the policy states it). */
const RECIPIENTS: { name: string; country?: string; role: string; en?: boolean }[] = [
  {
    name: "Anthropic PBC",
    country: "États-Unis",
    en: true,
    role: "L’intelligence artificielle Claude, qui analyse le selfie, répond aux questions et cherche les prix. Selon ses conditions, Anthropic n’utilise pas ces données pour entraîner ses modèles et les supprime selon ses propres règles de conservation.",
  },
  { name: "Vercel Inc.", country: "États-Unis", en: true, role: "Hébergement du site." },
  { name: "Upstash", en: true, role: "Compteurs de limite, caches de prix et de teintes, et copie du profil si vous activez la synchronisation." },
  { name: "Google", en: true, role: "Uniquement si vous choisissez « Continuer avec Google »." },
];

export default function ConfidentialitePage() {
  return (
    <LegalDocument
      eyebrow="Vos données"
      title={
        <>
          Politique de <span className="italic text-brand">confidentialité</span>
        </>
      }
      updated={LEGAL.updated}
      toc={TOC}
      other={{ href: "/mentions-legales", label: "Mentions légales", text: "Éditeur, hébergeur, sources des données." }}
    >
      {/* Summary: what most people will read. */}
      <section id="en-bref" aria-labelledby="en-bref-title" className="scroll-mt-6 break-inside-avoid rounded-panel bg-brand p-6 text-cream shadow-lift sm:p-8 print:bg-white print:text-ink print:shadow-none print:ring-1 print:ring-line">
        <h2 id="en-bref-title" tabIndex={-1} className="font-display text-[1.6rem] font-normal leading-tight outline-none focus-visible:outline-2 focus-visible:outline-gold">
          En <span className="italic text-gold print:text-brand">bref</span>
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {SUMMARY.map(({ Icon, text }) => (
            <li key={text} className="flex gap-3.5 !max-w-none">
              <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream/12 text-gold ring-1 ring-cream/25 print:text-brand print:ring-line">
                <Icon size={19} />
              </span>
              <span className="leading-snug text-cream print:text-ink">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <LegalSection id="responsable" title="Qui est responsable de vos données&nbsp;?">
        <p>
          {LEGAL.individual ? `L’éditeur de ${LEGAL.appName}` : <Fill value={LEGAL.publisher} />}, joignable à{" "}
          <a href={`mailto:${LEGAL.email}`}>
            <Fill value={LEGAL.email} />
          </a>
          . Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
        </p>
      </LegalSection>

      <LegalSection id="donnees" title="Quelles données, pourquoi, et combien de temps&nbsp;?">
        {/* Phones: one card per row, labels kept as text. */}
        <ul className="flex flex-col gap-3 md:hidden print:hidden">
          {ROWS.map(([what, why, basis, where]) => (
            <li key={what} className="!max-w-none rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
              <p className="font-semibold leading-snug text-ink">{fr(what)}</p>
              <dl className="mt-3 space-y-2.5 text-[0.95rem] leading-relaxed">
                {[
                  [COLUMNS[1], why],
                  [COLUMNS[2], basis],
                  [COLUMNS[3], where],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="eyebrow">{label}</dt>
                    <dd className="mt-0.5 text-ink/85">{fr(value)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        {/* Tablet and up (and print): a real table with sticky headers. */}
        <div className="hidden overflow-clip rounded-card bg-white shadow-soft ring-1 ring-line md:block print:block">
          <table className="w-full border-collapse text-left text-[0.92rem] leading-relaxed">
            <caption className="sr-only">Données traitées par Belle, finalités, bases légales, lieux et durées de conservation</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="sticky top-0 z-10 bg-paper px-4 py-3 align-bottom text-[0.72rem] font-bold uppercase tracking-[0.12em] text-caramel-ink">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([what, why, basis, where]) => (
                <tr key={what} className="border-t border-line align-top">
                  <th scope="row" className="w-[26%] px-4 py-3.5 font-semibold text-ink">
                    {fr(what)}
                  </th>
                  <td className="px-4 py-3.5 text-ink/85">{fr(why)}</td>
                  <td className="px-4 py-3.5 text-ink/85">{fr(basis)}</td>
                  <td className="px-4 py-3.5 text-ink/85">{fr(where)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout title="Informations médicales">
          <p>Ne donnez pas d’informations médicales détaillées dans la conversation&nbsp;: elles ne sont pas nécessaires pour vous conseiller.</p>
        </Callout>
      </LegalSection>

      <LegalSection id="destinataires" title="Qui reçoit vos données&nbsp;?">
        <p>Uniquement les prestataires nécessaires au service, qui agissent pour notre compte&nbsp;:</p>
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
          {RECIPIENTS.map((r) => (
            <li key={r.name} className="!max-w-none break-inside-avoid p-4 sm:p-5">
              <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <strong lang={r.en ? "en" : undefined} className="text-[1.05rem]">
                  {r.name}
                </strong>
                {r.country && <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink/80 ring-1 ring-line">{r.country}</span>}
              </p>
              <p className="mt-1 text-[0.95rem]">{r.role}</p>
            </li>
          ))}
        </ul>
        <p>
          Les recherches de produits sont envoyées à <strong lang="en">Open Beauty Facts</strong> et <strong lang="en">Open Prices</strong> (association Open Food Facts, France) sans
          aucune donnée vous concernant&nbsp;: seulement les mots-clés et codes-barres.
        </p>
      </LegalSection>

      <LegalSection id="transferts" title="Transferts hors de l’Union européenne">
        <p>
          Anthropic, Vercel et Google sont situés aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou par le cadre de
          protection des données UE–États-Unis (<span lang="en">Data Privacy Framework</span>), selon le prestataire.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies et stockage local">
        <p>
          {LEGAL.appName} n’utilise que ce qui est strictement nécessaire au fonctionnement, ce qui ne demande pas de consentement (article 82 de la loi Informatique et Libertés)&nbsp;:
        </p>
        <ul className="flex flex-col gap-2.5">
          <li className="flex gap-3">
            <Cookie size={18} aria-hidden="true" className="mt-1 shrink-0 text-caramel-ink" />
            <span>cookies de connexion et de sécurité, si vous vous connectez avec Google&nbsp;;</span>
          </li>
          <li className="flex gap-3">
            <Smartphone size={18} aria-hidden="true" className="mt-1 shrink-0 text-caramel-ink" />
            <span>
              stockage local du navigateur pour votre profil, vos favoris, la conversation, vos dernières recherches et vos derniers produits scannés, les ingrédients lus sur vos photos
              et vos choix de consentement.
            </span>
          </li>
        </ul>
        <p>
          <strong>Aucun cookie publicitaire ni de mesure d’audience.</strong>
        </p>
      </LegalSection>

      <LegalSection id="vos-droits" title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les corriger, les effacer, en limiter l’usage, vous y opposer, les récupérer, et retirer votre consentement à tout moment, sans que cela
          remette en cause ce qui a été fait avant.
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li className="!max-w-none flex flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
            <Trash2 size={20} aria-hidden="true" className="text-danger" />
            <p className="mt-3 font-semibold text-ink">Le plus simple</p>
            <p className="mt-1 flex-1 text-[0.95rem]">
              Dans votre profil, le bouton «&nbsp;Supprimer mes données&nbsp;» efface tout ce qui est stocké sur votre appareil et dans votre compte, puis vous déconnecte.
            </p>
            <Link href="/profil#compte" className="mt-3 inline-flex min-h-11 items-center">
              Ouvrir mon profil
            </Link>
          </li>
          <li className="!max-w-none flex flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
            <Mail size={20} aria-hidden="true" className="text-brand" />
            <p className="mt-3 font-semibold text-ink">Toute autre demande</p>
            <p className="mt-1 flex-1 text-[0.95rem]">Écrivez-nous. Nous répondons sous un mois.</p>
            <a href={`mailto:${LEGAL.email}`} className="mt-3 inline-flex min-h-11 items-center">
              <Fill value={LEGAL.email} />
            </a>
          </li>
          <li className="!max-w-none flex flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
            <Scale size={20} aria-hidden="true" className="text-caramel-ink" />
            <p className="mt-3 font-semibold text-ink">Réclamation</p>
            <p className="mt-1 flex-1 text-[0.95rem]">Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL.</p>
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center">
              cnil.fr/fr/plaintes
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="age" title="Âge minimum">
        <p>Le service s’adresse aux personnes de 15 ans et plus. En dessous, l’accord d’un parent est nécessaire pour l’analyse photo et la conversation.</p>
      </LegalSection>

      <LegalSection id="modifications" title="Modifications">
        <p>Si cette politique change de façon importante, nous vous le signalerons dans l’application et vous redemanderons votre accord si nécessaire.</p>
      </LegalSection>
    </LegalDocument>
  );
}
