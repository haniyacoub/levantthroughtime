# Milestone 9, round c: real images of the peoples, and sourced briefs for labelled AI impressions

Follow every rule in `BRIEF_M8h.md` (same folder): honest verification levels, verbatim quotes under 40 words checked by script,
no Wikipedia articles as sources, no browser tools (no Claude in Chrome), no sub-agents, no local paths in notes, no casualty figures,
no "indigenous/native" labels on peoples, evidence types kept apart, accessed: "2026-10-20". Do not edit anything under
<project> (read only). Read <project>/data/peoples.json first (45 peoples).

The site shows each people as a card, like the glossary of a video game, with a picture. The pictures must be REAL images from the
time (or real objects) with honest captions, never invented faces.

## Part 1: real images  →  m9-img.json, key "images"
For every people in peoples.json, find up to 2 images (1 is fine; 0 is acceptable and must then be listed in "gaps"):
- kind "depiction": an image made in or near the period that shows members of the group (e.g. Beni Hasan tomb painting of the Aamu,
  Medinet Habu reliefs of the Peleset, the Black Obelisk's Israelite tribute bearers, the Lachish reliefs, Assyrian reliefs of Arabs on
  camels, Nabataean sculpture, Byzantine mosaics, medieval manuscripts showing Franks);
- kind "photograph": a photograph taken before 1946 (Library of Congress Matson / American Colony collection is public domain:
  "No known restrictions on publication"; also Commons copies of 19th-century photographs of Samaritans, Druze, Bedouin, Circassians,
  Jerusalem Jewish communities, Palestinian villagers and townspeople, Beta Israel in Ethiopia, etc.);
- kind "artefact": where no depiction exists, a real object made by the group (inscription, coin, seal, pottery, temple);
- kind "map" only as a last resort.

Licences: ONLY public domain, CC0, CC BY or CC BY-SA. No NC, no ND, no "fair use", no all-rights-reserved museum photographs.
For a photograph of a 3D object (relief, statue, coin) the PHOTOGRAPHER's licence counts. Prefer Wikimedia Commons, the Library of
Congress, and museums with CC0 open access (Metropolitan Museum, Cleveland, Walters, Rijksmuseum). Verify every Commons licence through
the API, e.g. `curl -s 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&titles=File:NAME'`
and copy LicenseShortName, Artist and the thumburl you were given. For the Library of Congress give the item page and a direct
image URL that downloads (check with `curl -sI`).

Respect: no images of dead or injured people, no images whose point is mockery or caricature, no photographs of identifiable private
individuals taken after 1950. Old catalogue titles may use outdated terms: quote the title as is in "original_title" but write the caption
in plain neutral English.

Identification: a caption saying "these are Philistines" needs a scholarly or museum source that identifies the group (museum catalogue
page, archaeology book, journal article), with a quote. Where the identification is debated (e.g. whether the Black Obelisk's figure
is Jehu himself or his envoy, or whether a relief shows Judahites or Israelites), say so and set "confidence": "contested".

Format of each entry:
{
  "people": "<people id>",
  "rank": 1 | 2,
  "kind": "depiction" | "photograph" | "artefact" | "map",
  "commons_file": "File:....jpg" or null,
  "image_url": "direct URL of an image at least 640 px wide that downloads (Commons thumburl at 800 px is ideal)",
  "page_url": "page that shows the image and states its licence",
  "license": "e.g. Public domain | CC0 | CC BY 4.0 | CC BY-SA 3.0",
  "license_url": "...",
  "credit": "photographer / institution exactly as the licence asks to be credited",
  "original_title": "title on the page",
  "object": {"what": "e.g. Wall painting in the tomb of Khnumhotep II at Beni Hasan", "date": HistDate, "made_by": "e.g. Egyptian artists",
             "where_now": "e.g. in situ, Beni Hasan, Egypt"},
  "caption": {"en": "one or two plain sentences: what we see"},
  "perspective": {"en": "one sentence: who made it and how that shapes it (e.g. Egyptian royal art shows foreigners in fixed, idealised types; this is how Egyptians saw them, not a portrait)"},
  "identification_sources": [ refs with quotes, as in BRIEF_M8h ],
  "confidence": "documented" | "estimated" | "contested"
}

## Part 2: briefs for AI "artist's impressions"  →  same file, key "ai_briefs"
ONLY for peoples whose "attested.end" is not null in peoples.json (groups that no longer exist as such). Never for groups that exist
today. For each, write what the sources say about their appearance in the period: clothing, hairstyles and beards, headgear, weapons,
tools, animals, houses and setting. Each detail needs a source with a quote (depictions, archaeology of textiles and dress, texts).
Where the sources say nothing, leave the detail out. Do not describe skin colour, facial features or body type unless a source
describes them, and then quote it and add a caution.
{
  "people": "<id>",
  "period": HistDate range,
  "scene": {"en": "a neutral everyday or work scene suited to the evidence, e.g. 'a family travelling with donkeys, as in the Beni Hasan painting'"},
  "details": [ {"en": "e.g. men in wrap-around woollen kilts with coloured patterns; women in ankle-length dresses", "sources": [refs]} ],
  "based_on": ["<image ids you listed in Part 1, as people-id + rank, e.g. amorites-1>"],
  "avoid": ["things a careless illustration might add that the evidence does not support, e.g. turbans, scimitars, camels before their use"]
}

Also return "sources" (BRIEF_M8h format, for identification and brief sources), "gaps" (peoples without a usable image, and why),
and counts: images found by kind and licence, peoples covered, briefs written.
