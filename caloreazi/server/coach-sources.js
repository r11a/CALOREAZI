export const sportsNutritionSources = [
  { id: "ACSM-NAP", organization: "ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada", title: "Nutrition and Athletic Performance", kind: "position statement", url: "https://acsm.org/education-resources/pronouncements-scientific-communications/position-stands/" },
  { id: "IOC-REDS-2023", organization: "International Olympic Committee", title: "2023 IOC consensus statement on Relative Energy Deficiency in Sport", kind: "consensus statement", url: "https://bjsm.bmj.com/content/57/17/1073" },
  { id: "ISSN-PROTEIN", organization: "International Society of Sports Nutrition", title: "Position stand: protein and exercise", kind: "position stand", url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8" },
];

export function coachEvidenceContext() {
  return {
    policy: "זהו מאגר מאושר ולא גלישה חיה. אין לטעון שנבדק מחקר חדש יותר בזמן השיחה.",
    sources: sportsNutritionSources,
    rules: ["יעד מספרי מתקבל ממנוע היעדים בלבד.", "אין להסיק אחוז שומן או מסת שריר כאילו נמדדו.", "אין להעמיק גירעון כשיש חשש לזמינות אנרגטית נמוכה.", "כשאין ודאות יש לציין אותה."],
  };
}
