# CLAUDE.md

@AGENTS.md

Tout ce qui précède (stack, architecture DDD, conventions, tests, interdits) s'applique. Ce qui suit est propre à Claude Code, l'agent principal du projet.

## Méthode de travail

- **Un endpoint (ou une fonctionnalité) à la fois**, terminé et validé avant de passer au suivant. Deux endpoints finis valent mieux que cinq à moitié faits.
- Pour chaque endpoint :
  1. écrire d'abord les **tests d'intégration**, qui couvrent les règles concernées (RG-x, Hx), et vérifier qu'ils échouent ;
  2. implémenter, en respectant les couches (domaine → application → infrastructure → interface) ;
  3. lancer `npm run typecheck` et `npm test` ;
  4. **commiter seulement si tout passe** : un commit par endpoint.
- Faire un **débrief court** à la fin de chaque étape : ce qui a été fait, les règles couvertes, les tests, les écarts ou décisions prises. Attendre la validation avant d'enchaîner si l'utilisateur l'a demandé.
- **Rester focus** : pas d'abstraction, d'option ou de fonctionnalité qui ne servent pas le besoin. En cas de doute sur une règle métier, demander plutôt que trancher.

## Commits

- Message en français, au format `type: description` (`feat:`, `fix:`, `test:`, `chore:`, `doc:`). Exemple : `feat: clôture d'une intervention`.
- Ne jamais commiter avec des tests rouges, du code non typé ou des tests désactivés.
- Ne pas commiter sur `main` : travailler sur la branche courante.

## Sous-agents

- Paralléliser seulement des tâches indépendantes, qui ne modifient **pas les mêmes fichiers** (deux agents ne touchent jamais `app.ts`, `schema.ts` ou `droits.ts` en même temps).
- L'intégration, le lancement des tests et les commits restent sous le contrôle de l'agent principal.
- Donner à chaque sous-agent les références à respecter : `AGENTS.md`, la section concernée de `docs/doc_technique.md` et les règles RG-x / Hx visées.
