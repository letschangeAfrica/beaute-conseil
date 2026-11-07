import type { Metadata } from "next";
import Link from "next/link";
import { Database, Globe, Server, UserRound } from "lucide-react";
import { Callout, Fill, LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · Belle" };

const TOC = [
  { id: "editeur", label: "Éditeur" },
  { id: "hebergeur", label: "Hébergeur" },
  { id: "ce-que-belle-nest-pas", label: `Ce que ${LEGAL.appName} n’est pas` },
  { id: "independance", label: "Indépendance" },
  { id: "sources", label: "Sources des données" },
  { id: "donnees-personnelles", label: "Données personnelles" },
];

/** One labelled line of a definition card. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="eyebrow pt-0.5">{label}</dt>
      <dd className="min-w-0 text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function InfoCard({ Icon, children }: { Icon: typeof UserRound; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid rounded-card bg-white px-5 py-2 shadow-soft ring-1 ring-line sm:px-6">
      <span aria-hidden="true" className="mb-1 mt-3 grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon size={17} />
      </span>
      <dl className="divide-y divide-line">{children}</dl>
    </div>
  );
}

export default function MentionsLegalesPage() {
  const siteUrl = LEGAL.siteUrl as string;
  return (
    <LegalDocument
      eyebrow="Informations"
      title={
        <>
          Mentions <span className="italic text-brand">légales</span>
        </>
      }
      updated={LEGAL.updated}
      toc={TOC}
      other={{ href: "/confidentialite", label: "Politique de confidentialité", text: "Quelles données, pourquoi, et vos droits." }}
    >
      <LegalSection id="editeur" title="Éditeur">
        {LEGAL.individual && (
          <p>
            {LEGAL.appName} est édité à titre non professionnel par un particulier. Conformément à l’article 6-III-2 de la loi n°&nbsp;2004-575 du 21&nbsp;juin 2004 (LCEN), son
            identité est communiquée à l’hébergeur.
          </p>
        )}
        <InfoCard Icon={UserRound}>
          {!LEGAL.individual && (
            <>
              <Row label="Éditeur">
                <Fill value={LEGAL.publisher} />
                {LEGAL.company && <>, {LEGAL.company}</>}
              </Row>
              <Row label="Adresse">
                <Fill value={LEGAL.address} />
              </Row>
            </>
          )}
          <Row label="Contact">
            <a href={`mailto:${LEGAL.email}`}>
              <Fill value={LEGAL.email} />
            </a>
          </Row>
          <Row label="Site">
            <Fill value={siteUrl} />
          </Row>
          {!LEGAL.individual && (
            <Row label="Directeur ou directrice de la publication">
              <Fill value={LEGAL.publicationDirector} />
            </Row>
          )}
        </InfoCard>
      </LegalSection>

      <LegalSection id="hebergeur" title="Hébergeur">
        <InfoCard Icon={Server}>
          <Row label="Nom">
            <span lang="en">{LEGAL.host.name}</span>
          </Row>
          <Row label="Adresse">{LEGAL.host.address}</Row>
          <Row label="Site">
            <a href={LEGAL.host.url} target="_blank" rel="noopener noreferrer">
              {LEGAL.host.url.replace("https://", "")}
            </a>
          </Row>
        </InfoCard>
      </LegalSection>

      <LegalSection id="ce-que-belle-nest-pas" title={`Ce que ${LEGAL.appName} n’est pas`}>
        <Callout title="Une aide au choix, pas un avis médical">
          <p>
            Les scores et conseils sont donnés à titre informatif, à partir de la liste d’ingrédients publiée et de votre profil. Ils ne remplacent pas l’avis d’un médecin, d’un
            dermatologue ou d’un pharmacien. Vérifiez toujours l’étiquette du produit, surtout en cas d’allergie, et faites un test sur une petite zone de peau.
          </p>
          <p>
            Les conseils de la conseillère et l’analyse de teint sont produits par une intelligence artificielle et peuvent contenir des erreurs. Les prix affichés changent vite&nbsp;:
            seul le prix indiqué par le vendeur fait foi.
          </p>
        </Callout>
      </LegalSection>

      <LegalSection id="independance" title="Indépendance">
        <p>
          {LEGAL.appName} n’est lié à aucune marque ni enseigne et ne perçoit aucune rémunération pour classer un produit. Les noms de marques et d’enseignes cités appartiennent à leurs
          propriétaires respectifs.
        </p>
      </LegalSection>

      <LegalSection id="sources" title="Sources des données">
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
          <li className="!max-w-none flex gap-3.5 p-4 sm:p-5">
            <Database size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">Fiches produits</p>
              <p className="mt-0.5">
                <a href="https://world.openbeautyfacts.org" target="_blank" rel="noopener noreferrer" lang="en">
                  Open Beauty Facts
                </a>
                , sous licence <span lang="en">Open Database License</span> (ODbL).
              </p>
            </div>
          </li>
          <li className="!max-w-none flex gap-3.5 p-4 sm:p-5">
            <Database size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">Prix relevés en magasin</p>
              <p className="mt-0.5">
                <a href="https://prices.openfoodfacts.org" target="_blank" rel="noopener noreferrer" lang="en">
                  Open Prices
                </a>{" "}
                (<span lang="en">Open Food Facts</span>), sous licence ODbL.
              </p>
            </div>
          </li>
          <li className="!max-w-none flex gap-3.5 p-4 sm:p-5">
            <Globe size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">Prix en ligne</p>
              <p className="mt-0.5">Recherches effectuées sur les sites des revendeurs au moment de votre demande.</p>
            </div>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="donnees-personnelles" title="Données personnelles">
        <p>
          Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
