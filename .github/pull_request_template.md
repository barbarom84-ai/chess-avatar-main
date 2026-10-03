## Résumé

<!-- Quoi et pourquoi, en une ou deux phrases. -->

## Parité Android

- [ ] Ce changement ne touche aucune logique partagée avec l'app Android (persona, moteur, revue de partie, Elo, PvP, Ascension, coach, ouvertures, personnalités).
- [ ] Ou bien : `npm run parity:export` a été lancé et `parity/` est commité (la CI le vérifie).
- [ ] Nouveau code d'erreur, preset ou constante partagée → ajouté dans `parity/constants.json`.
- [ ] Changement de forme d'une réponse d'API consommée par Android → type mis à jour dans `lib/api-contract.ts` (la route le `satisfies`) et exemples dans `scripts/parity-api-fixtures.ts`.
- [ ] Écart volontaire web ↔ Android → documenté dans `divergences` de `parity/constants.json`.

Après fusion sur `main`, l'app Android reçoit automatiquement une PR « Parity: sync from web » ; si ses tests échouent, elle liste chaque écart à porter côté Kotlin.
