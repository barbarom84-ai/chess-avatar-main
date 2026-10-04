## Résumé

<!-- Quoi et pourquoi, en une ou deux phrases. -->

## Parité Android

- [ ] Ce changement ne touche aucune logique partagée avec l'app Android (persona, moteur, revue de partie, Elo, PvP, Ascension, coach, ouvertures, personnalités).
- [ ] Ou bien : `npm run parity:export` a été lancé et `parity/` est commité (la CI ne le vérifie plus).
- [ ] Nouveau code d'erreur, preset ou constante partagée → ajouté dans `parity/constants.json`. Modifier une valeur existante est à signaler : Android l'a recopiée à la main en Kotlin (`ConstantsParityTest`) et devra s'aligner.
- [ ] Changement de forme d'une réponse d'API consommée par Android → type mis à jour dans `lib/api-contract.ts` (la route le `satisfies`) et exemples dans `scripts/parity-api-fixtures.ts`.
- [ ] Écart volontaire web ↔ Android → documenté dans `divergences` de `parity/constants.json`.

La synchronisation vers Android est manuelle : après fusion sur `main`, le développeur Android lance `.\scripts\sync-parity.ps1` (ou `-Ref <commit>`) dans ChessAvatarAndroid ; ses tests JUnit listent alors chaque écart à porter côté Kotlin.
