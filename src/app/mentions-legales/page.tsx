import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle } from "@/components/LegalLinks";
import { PageHeader } from "@/components/ui";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Mentions légales · Belle" };

export default function MentionsLegalesPage() {
  return (
    <div>
      <PageHeader back eyebrow="Informations" title="Mentions légales" subtitle={`Dernière mise à jour : ${LEGAL.updated}`} />
      <LegalArticle>
        <section>
          <h2>Éditeur</h2>
          {LEGAL.individual ? (
            <p>
              {LEGAL.appName} est édité à titre non professionnel par un particulier. Conformément à l&apos;article 6-III-2 de la loi n° 2004-575 du 21 juin 2004 (LCEN), son identité est
              communiquée à l&apos;hébergeur.
            </p>
          ) : (
            <p>
              {LEGAL.publisher}
              {LEGAL.company && <>, {LEGAL.company}</>}
              <br />
              {LEGAL.address}
            </p>
          )}
          <p>
            Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            <br />
            Site : {LEGAL.siteUrl}
          </p>
          {!LEGAL.individual && <p>Directeur ou directrice de la publication : {LEGAL.publicationDirector}</p>}
        </section>

        <section>
          <h2>Hébergeur</h2>
          <p>
            {LEGAL.host.name}
            <br />
            {LEGAL.host.address}
            <br />
            <a href={LEGAL.host.url}>{LEGAL.host.url.replace("https://", "")}</a>
          </p>
        </section>

        <section>
          <h2>Ce que {LEGAL.appName} n&apos;est pas</h2>
          <p>
            Les scores et conseils sont donnés à titre informatif, à partir de la liste d&apos;ingrédients publiée et de votre profil. Ils ne remplacent pas l&apos;avis d&apos;un médecin, d&apos;un
            dermatologue ou d&apos;un pharmacien. Vérifiez toujours l&apos;étiquette du produit, surtout en cas d&apos;allergie, et faites un test sur une petite zone de peau.
          </p>
          <p>
            Les conseils de la conseillère et l&apos;analyse de teint sont produits par une intelligence artificielle et peuvent contenir des erreurs. Les prix affichés changent vite : seul le
            prix indiqué par le vendeur fait foi.
          </p>
        </section>

        <section>
          <h2>Indépendance</h2>
          <p>
            {LEGAL.appName} n&apos;est lié à aucune marque ni enseigne et ne perçoit aucune rémunération pour classer un produit. Les noms de marques et d&apos;enseignes cités appartiennent à
            leurs propriétaires respectifs.
          </p>
        </section>

        <section>
          <h2>Sources des données</h2>
          <ul>
            <li>
              Fiches produits : <a href="https://world.openbeautyfacts.org">Open Beauty Facts</a>, sous licence Open Database License (ODbL).
            </li>
            <li>
              Prix relevés en magasin : <a href="https://prices.openfoodfacts.org">Open Prices</a> (Open Food Facts), sous licence ODbL.
            </li>
            <li>Prix en ligne : recherches effectuées sur les sites des revendeurs au moment de votre demande.</li>
          </ul>
        </section>

        <section>
          <h2>Données personnelles</h2>
          <p>
            Voir la <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
        </section>
      </LegalArticle>
    </div>
  );
}
