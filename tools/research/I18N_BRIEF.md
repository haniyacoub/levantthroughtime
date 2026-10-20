# Translation brief: Arabic and Hebrew machine drafts

You are drafting Arabic (`ar`) and Hebrew (`he`) translations of English texts for a neutral, educational
history map of Israel/Palestine (the southern Levant), 10,000 BCE to today. Every draft is shown to readers
marked "machine draft, not yet reviewed", and a human reviewer will check it later. Accuracy and neutrality
matter more than elegance.

## Input and output

- Input: a chunk file, a JSON list of `{"k": key, "en": text, "need": ["ar", "he"]}`.
- Output: a file next to it named `chunk-NN.out.json` (same NN), a JSON list of `{"k": key, "ar": "...", "he": "..."}`.
  Include only the languages listed in `need`. Keep every key. Write valid JSON (UTF-8, no comments).
- Write the output file yourself with the Write tool, then check it parses: `python3 -I -m json.tool <file> > /dev/null`.
- Do not use web search or browser tools. Do not spawn sub-agents.

## Rules

1. **Translate exactly what the English says.** Do not add, drop, soften or sharpen anything. Do not add
   explanations. If the English hedges ("probably", "some scholars", "contested"), keep the hedge.
2. **Citation markers** like `[1]`, `[2][3]` must appear in the translation exactly as in the English,
   at the end of the same sentence. Never renumber, merge or drop them.
3. **Neutral terms: translate the term the English uses, not a substitute.**
   - "West Bank" → الضفة الغربية / הגדה המערבית. Use "Judea and Samaria" (يهودا والسامرة / יהודה ושומרון) only where the English says "Judea and Samaria".
   - "occupied", "occupation" → احتلال / כיבוש only where the English uses those words; "military government" → حكم عسكري / ממשל צבאי.
   - "Temple Mount / al-Haram al-Sharif" keeps both names in both languages: جبل الهيكل / الحرم الشريف ; הר הבית / אל-חרם א-שריף.
   - "Western Wall / al-Buraq Wall" → حائط المبكى / حائط البراق ; הכותל המערבי / חומת אל-בוראק.
   - "1948 war": keep whatever the English says. If the English says "Nakba", use النكبة / הנכבה; if it says "War of Independence", use حرب الاستقلال / מלחמת העצמאות. Do not introduce either term yourself.
   - "Palestine" as a Roman/Byzantine/Ottoman/Mandate name → فلسطين / פלשתינה (Mandate: פלשתינה (א"י) only if the English says "Eretz Israel").
   - "Land of Israel" → أرض إسرائيل / ארץ ישראל only where the English says so.
   - Names of groups and places: use the established form in each language (e.g. Jerusalem → القدس / ירושלים; Hebron → الخليل / חברון; Nablus → نابلس / שכם; Jaffa → يافا / יפו). If the English gives two names ("Nablus/Shechem"), give both.
4. **Dates and numbers**: keep Western (Latin) digits 0–9. "BCE" → ق.م. / לפנה״ס ; "CE" → م / לספירה (omit "CE" if the English omits it). Keep "c." as نحو / בערך. Keep ranges and units.
5. **Personal names, authors and titles of works**: transliterate personal names in the usual way for each
   language. Keep titles of books and articles, and short quoted source passages, in their original language,
   inside quotation marks (you may add a translation in brackets after a quoted passage).
6. **Technical terms**: archaeological periods (Early Bronze Age → العصر البرونزي المبكر / תקופת הברונזה הקדומה; Iron Age → العصر الحديدي / תקופת הברזל; Natufian → النطوفية / הנאטופית), administrative terms (sanjak → سنجق / סנג'ק; eyalet → إيالة / אייאלט; vilayet → ولاية / וילאייט; jund → جند / ג'ונד).
7. Hebrew: modern standard spelling (כתיב מלא), no niqqud. Arabic: Modern Standard Arabic, no tashkeel except where needed to avoid ambiguity.
8. Keep the register plain and short, like the English.
9. **Names already used across the site** (keep these forms): Britannica بريتانيكا / בריטניקה; Josephus يوسيفوس / יוספוס; H. A. R. Gibb جب / גיב; Finkelstein فنكلشتاين / פינקלשטיין; Schürer شورر / שירר; Le Strange لي سترانج / לה סטריינג'; Avi-Yonah أفي يونا / אבי-יונה; Broshi بروشي / ברושי; Bachi باكي / בכי; Albright أولبرايت / אולברייט; Benvenisti بنفنستي / בנבנישתי; Ziada زيادة / זיאדה. A territory "slice" is الشريحة / פרוסה. Acronyms (TDV, JTA, PalQuest, OCHA, UNRWA) stay in Latin script.
