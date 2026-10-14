import { normalizeSearch } from "./search";

// Free-text study centres ("Udl", "EPS - UDL", "Universitat de Lleida") are
// grouped under one canonical name. Order matters: specific rules first.
const RULES: { label: string; test: RegExp }[] = [
  {
    label: "UPC",
    test: /\bupc\b|politecnica de catalun|\bfib\b|informatica de barcelona|\bepsem\b|\bepsevg\b|\beetac\b|\bcitm\b|\bcfis\b|enginyeria de manresa|enginyeria de vilanova/,
  },
  {
    label: "UdL",
    test: /\budl\b|(universitat|universidad|univercitat) de lleida|\bcappont?\b|\beps\b|escola politecnica superior/,
  },
  { label: "URV", test: /\burv\b|rovira|\betse\b/ },
  { label: "UOC", test: /\buoc\b|oberta de catalunya/ },
  { label: "UAB", test: /\buab\b|autonoma de barcelona/ },
  {
    label: "UB",
    test: /\bub\b|(universitat|universidad) de barcelona|\benti\b/,
  },
  { label: "UdG", test: /\budg\b|girona/ },
  { label: "UPF", test: /\bupf\b|pompeu fabra|tecnocampus/ },
  { label: "La Salle (URL)", test: /la ?salle|ramon llull?|\burl\b/ },
  { label: "Universidad de Zaragoza", test: /zaragoza|unizar/ },
  { label: "UVic", test: /\buvic\b|universitat de vic/ },
  { label: "Ilerna", test: /\bilerna\b/ },
  { label: "Institut Caparrella", test: /capar+ella/ },
  { label: "Institut Esteve Terradas i Illa", test: /esteve terradas/ },
  { label: "Institut Sabadell", test: /\b(institut|intitut|ies) sabadell\b/ },
  { label: "Stucom", test: /\bstucom\b/ },
  { label: "USTHB (Algèria)", test: /houari|boumedien/ },
  { label: "JKU Linz", test: /johannes kepler|\bjku\b/ },
  { label: "Escola Pia Mataró", test: /escola pia|santa anna mataro/ },
  { label: "Escola del Treball", test: /escola del treball/ },
  { label: "Institut Poblenou", test: /poblenou/ },
];
// Faculties that belong to the UPC, not to the UdL's "Escola Politècnica".
const UPC_SCHOOL = /\bepsem\b|\bepsevg\b|manresa|vilanova/;
const EMPTY = new Set(["", "-", "string", "home"]);

export type StudyCenter = { key: string; label: string };

export function studyCenter(
  raw: string | null | undefined,
): StudyCenter | null {
  const original = (raw ?? "").replace(/\s+/g, " ").trim();
  const text = normalizeSearch(original);
  if (EMPTY.has(text)) return null;
  const matches = new Set(
    RULES.filter(
      (rule) =>
        rule.test.test(text) &&
        !(rule.label === "UdL" && UPC_SCHOOL.test(text)),
    ).map((rule) => rule.label),
  );
  // One institution: group it. Several ("UdL, UPC"): keep what they wrote.
  if (matches.size === 1) {
    const [label] = matches;
    return { key: `rule:${label}`, label };
  }
  return { key: `text:${text}`, label: original };
}
