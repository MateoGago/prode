/**
 * Localized display data for the 48 tournament teams: Spanish (es-AR) names and
 * flag image URLs.
 *
 * The openfootball dataset carries only English names and no crests, so this
 * map enriches each team at seed time. Keyed by externalRef — the slug produced
 * by slugifyTeamName() — so it survives openfootball renaming a team's display
 * string, and stays decoupled from the raw dataset labels.
 *
 * Sourced once from restcountries v3.1 (translations.spa.common + flags.png);
 * flag URLs are flagcdn.com (restcountries' own CDN). Vendored as a STATIC map
 * rather than fetched at seed time so the seed stays deterministic and key-less,
 * matching the openfootball provider's philosophy. England and Scotland are not
 * countries in restcountries (subdivisions of GBR) — resolved by hand with
 * flagcdn's gb-eng / gb-sct subdivision codes.
 */

export interface TeamLocale {
  /** Spanish (es-AR) display name. */
  name: string;
  /** Flag image URL (flagcdn.com, 320px wide). */
  flagUrl: string;
}

/** externalRef (slug) -> localized name + flag. Covers all 48 group-stage teams. */
export const TEAM_LOCALE: Record<string, TeamLocale> = {
  argentina: { name: "Argentina", flagUrl: "https://flagcdn.com/w320/ar.png" },
  austria: { name: "Austria", flagUrl: "https://flagcdn.com/w320/at.png" },
  australia: { name: "Australia", flagUrl: "https://flagcdn.com/w320/au.png" },
  "bosnia-herzegovina": {
    name: "Bosnia y Herzegovina",
    flagUrl: "https://flagcdn.com/w320/ba.png",
  },
  belgium: { name: "Bélgica", flagUrl: "https://flagcdn.com/w320/be.png" },
  brazil: { name: "Brasil", flagUrl: "https://flagcdn.com/w320/br.png" },
  canada: { name: "Canadá", flagUrl: "https://flagcdn.com/w320/ca.png" },
  "dr-congo": {
    name: "Congo (Rep. Dem.)",
    flagUrl: "https://flagcdn.com/w320/cd.png",
  },
  switzerland: { name: "Suiza", flagUrl: "https://flagcdn.com/w320/ch.png" },
  "ivory-coast": {
    name: "Costa de Marfil",
    flagUrl: "https://flagcdn.com/w320/ci.png",
  },
  colombia: { name: "Colombia", flagUrl: "https://flagcdn.com/w320/co.png" },
  "cape-verde": {
    name: "Cabo Verde",
    flagUrl: "https://flagcdn.com/w320/cv.png",
  },
  curacao: { name: "Curazao", flagUrl: "https://flagcdn.com/w320/cw.png" },
  "czech-republic": {
    name: "Chequia",
    flagUrl: "https://flagcdn.com/w320/cz.png",
  },
  germany: { name: "Alemania", flagUrl: "https://flagcdn.com/w320/de.png" },
  algeria: { name: "Argelia", flagUrl: "https://flagcdn.com/w320/dz.png" },
  ecuador: { name: "Ecuador", flagUrl: "https://flagcdn.com/w320/ec.png" },
  egypt: { name: "Egipto", flagUrl: "https://flagcdn.com/w320/eg.png" },
  spain: { name: "España", flagUrl: "https://flagcdn.com/w320/es.png" },
  france: { name: "Francia", flagUrl: "https://flagcdn.com/w320/fr.png" },
  ghana: { name: "Ghana", flagUrl: "https://flagcdn.com/w320/gh.png" },
  croatia: { name: "Croacia", flagUrl: "https://flagcdn.com/w320/hr.png" },
  haiti: { name: "Haití", flagUrl: "https://flagcdn.com/w320/ht.png" },
  iraq: { name: "Irak", flagUrl: "https://flagcdn.com/w320/iq.png" },
  iran: { name: "Irán", flagUrl: "https://flagcdn.com/w320/ir.png" },
  jordan: { name: "Jordania", flagUrl: "https://flagcdn.com/w320/jo.png" },
  japan: { name: "Japón", flagUrl: "https://flagcdn.com/w320/jp.png" },
  "south-korea": {
    name: "Corea del Sur",
    flagUrl: "https://flagcdn.com/w320/kr.png",
  },
  morocco: { name: "Marruecos", flagUrl: "https://flagcdn.com/w320/ma.png" },
  mexico: { name: "México", flagUrl: "https://flagcdn.com/w320/mx.png" },
  netherlands: {
    name: "Países Bajos",
    flagUrl: "https://flagcdn.com/w320/nl.png",
  },
  norway: { name: "Noruega", flagUrl: "https://flagcdn.com/w320/no.png" },
  "new-zealand": {
    name: "Nueva Zelanda",
    flagUrl: "https://flagcdn.com/w320/nz.png",
  },
  panama: { name: "Panamá", flagUrl: "https://flagcdn.com/w320/pa.png" },
  portugal: { name: "Portugal", flagUrl: "https://flagcdn.com/w320/pt.png" },
  paraguay: { name: "Paraguay", flagUrl: "https://flagcdn.com/w320/py.png" },
  qatar: { name: "Catar", flagUrl: "https://flagcdn.com/w320/qa.png" },
  "saudi-arabia": {
    name: "Arabia Saudí",
    flagUrl: "https://flagcdn.com/w320/sa.png",
  },
  sweden: { name: "Suecia", flagUrl: "https://flagcdn.com/w320/se.png" },
  senegal: { name: "Senegal", flagUrl: "https://flagcdn.com/w320/sn.png" },
  tunisia: { name: "Túnez", flagUrl: "https://flagcdn.com/w320/tn.png" },
  turkey: { name: "Turquía", flagUrl: "https://flagcdn.com/w320/tr.png" },
  usa: { name: "Estados Unidos", flagUrl: "https://flagcdn.com/w320/us.png" },
  uruguay: { name: "Uruguay", flagUrl: "https://flagcdn.com/w320/uy.png" },
  uzbekistan: {
    name: "Uzbekistán",
    flagUrl: "https://flagcdn.com/w320/uz.png",
  },
  "south-africa": {
    name: "Sudáfrica",
    flagUrl: "https://flagcdn.com/w320/za.png",
  },
  england: {
    name: "Inglaterra",
    flagUrl: "https://flagcdn.com/w320/gb-eng.png",
  },
  scotland: { name: "Escocia", flagUrl: "https://flagcdn.com/w320/gb-sct.png" },
};

/**
 * Localized name + flag for a team slug, falling back to the raw provider name
 * and a null flag when the team is not in the catalog (graceful degradation —
 * an unmapped team still seeds, just without translation or crest).
 */
export function localizeTeam(
  externalRef: string,
  fallbackName: string,
): { name: string; flagUrl: string | null } {
  const locale = TEAM_LOCALE[externalRef];
  return locale
    ? { name: locale.name, flagUrl: locale.flagUrl }
    : { name: fallbackName, flagUrl: null };
}
