import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/LegalLinks";
import { PageHeader } from "@/components/ui";
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

export default function ConfidentialitePage() {
  return (
    <div>
      <PageHeader back eyebrow="Vos données" title="Politique de confidentialité" subtitle={`Dernière mise à jour : ${LEGAL.updated}`} />
      <LegalArticle>
        <section className="card space-y-2 p-5">
          <h2>En bref</h2>
          <ul className="space-y-1">
            <li>Votre profil beauté reste sur votre téléphone. Il n&apos;est enregistré dans votre compte que si vous activez la synchronisation.</li>
            <li>Votre selfie sert uniquement à l&apos;analyse de teint, puis il est supprimé. Nous ne le gardons jamais.</li>
            <li>Pas de publicité, pas de revente de données, pas de cookies de suivi.</li>
            <li>Vous pouvez tout effacer en un clic depuis votre profil.</li>
          </ul>
        </section>

        <section>
          <h2>Qui est responsable de vos données ?</h2>
          <p>
            {LEGAL.individual ? `L'éditeur de ${LEGAL.appName}` : LEGAL.publisher}, joignable à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Voir aussi les{" "}
            <Link href="/mentions-legales">mentions légales</Link>.
          </p>
        </section>

        <section>
          <h2>Quelles données, pourquoi, et combien de temps ?</h2>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr>
                  <th>Données</th>
                  <th>Pourquoi</th>
                  <th>Base légale</th>
                  <th>Où et combien de temps</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([what, why, basis, where]) => (
                  <tr key={what}>
                    <td className="font-semibold">{what}</td>
                    <td>{why}</td>
                    <td>{basis}</td>
                    <td>{where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">Ne donnez pas d&apos;informations médicales détaillées dans la conversation : elles ne sont pas nécessaires pour vous conseiller.</p>
        </section>

        <section>
          <h2>Qui reçoit vos données ?</h2>
          <p>Uniquement les prestataires nécessaires au service, qui agissent pour notre compte :</p>
          <ul>
            <li>
              <b>Anthropic PBC</b> (États-Unis) : l&apos;intelligence artificielle Claude, qui analyse le selfie, répond aux questions et cherche les prix. Selon ses conditions,
              Anthropic n&apos;utilise pas ces données pour entraîner ses modèles et les supprime selon ses propres règles de conservation.
            </li>
            <li>
              <b>Vercel Inc.</b> (États-Unis) : hébergement du site.
            </li>
            <li>
              <b>Upstash</b> : compteurs de limite, caches de prix et de teintes, et copie du profil si vous activez la synchronisation.
            </li>
            <li>
              <b>Google</b> : uniquement si vous choisissez « Continuer avec Google ».
            </li>
          </ul>
          <p>
            Les recherches de produits sont envoyées à <b>Open Beauty Facts</b> et <b>Open Prices</b> (association Open Food Facts, France) sans aucune donnée vous concernant : seulement les
            mots-clés et codes-barres.
          </p>
        </section>

        <section>
          <h2>Transferts hors de l&apos;Union européenne</h2>
          <p>
            Anthropic, Vercel et Google sont situés aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou par le cadre de protection des
            données UE–États-Unis (Data Privacy Framework), selon le prestataire.
          </p>
        </section>

        <section>
          <h2>Cookies et stockage local</h2>
          <p>{LEGAL.appName} n&apos;utilise que ce qui est strictement nécessaire au fonctionnement, ce qui ne demande pas de consentement (article 82 de la loi Informatique et Libertés) :</p>
          <ul>
            <li>cookies de connexion et de sécurité, si vous vous connectez avec Google ;</li>
            <li>stockage local du navigateur pour votre profil, vos favoris, la conversation, les ingrédients lus sur vos photos et vos choix de consentement.</li>
          </ul>
          <p>Aucun cookie publicitaire ni de mesure d&apos;audience.</p>
        </section>

        <section>
          <h2>Vos droits</h2>
          <p>
            Vous pouvez accéder à vos données, les corriger, les effacer, en limiter l&apos;usage, vous y opposer, les récupérer, et retirer votre consentement à tout moment, sans que cela remette
            en cause ce qui a été fait avant.
          </p>
          <ul>
            <li>
              <b>Le plus simple :</b> dans <Link href="/profil">votre profil</Link>, le bouton « Supprimer mes données » efface tout ce qui est stocké sur votre appareil et dans votre compte, puis vous déconnecte.
            </li>
            <li>
              Pour toute autre demande : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Nous répondons sous un mois.
            </li>
            <li>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL : <a href="https://www.cnil.fr/fr/plaintes">cnil.fr/fr/plaintes</a>.
            </li>
          </ul>
        </section>

        <section>
          <h2>Âge minimum</h2>
          <p>Le service s&apos;adresse aux personnes de 15 ans et plus. En dessous, l&apos;accord d&apos;un parent est nécessaire pour l&apos;analyse photo et la conversation.</p>
        </section>

        <section>
          <h2>Modifications</h2>
          <p>Si cette politique change de façon importante, nous vous le signalerons dans l&apos;application et vous redemanderons votre accord si nécessaire.</p>
        </section>
      </LegalArticle>
    </div>
  );
}
