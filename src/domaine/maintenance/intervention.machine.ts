import { setup, transition } from 'xstate';
import { ErreurMetier } from '../commun/erreurs';

export const STATUTS = ['OUVERTE', 'EN_COURS', 'CLOSE'] as const;
export type Statut = (typeof STATUTS)[number];

export type EvenementIntervention = { type: 'DEMARRER' } | { type: 'CLOTURER' };

/**
 * Cycle de vie strict (H2) : OUVERTE → EN_COURS → CLOSE.
 * - RG-3 : la clôture exige une durée renseignée (garde).
 * - RG-4 : CLOSE est un état final.
 */
export const machineIntervention = setup({
  types: {
    context: {} as { dureeMinutes: number | null },
    events: {} as EvenementIntervention,
  },
  guards: {
    dureeRenseignee: ({ context }) => context.dureeMinutes !== null,
  },
}).createMachine({
  id: 'intervention',
  initial: 'OUVERTE',
  context: { dureeMinutes: null },
  states: {
    OUVERTE: { on: { DEMARRER: 'EN_COURS' } },
    EN_COURS: { on: { CLOTURER: { target: 'CLOSE', guard: 'dureeRenseignee' } } },
    CLOSE: { type: 'final' },
  },
});

/** Applique un événement au statut courant et renvoie le nouveau statut, ou lève le refus métier. */
export function appliquerEvenement(
  statut: Statut,
  dureeMinutes: number | null,
  evenement: EvenementIntervention,
): Statut {
  const etat = machineIntervention.resolveState({ value: statut, context: { dureeMinutes } });
  const prevu = evenement.type in (machineIntervention.states[statut]?.on ?? {});
  if (!prevu) {
    throw new ErreurMetier(
      'TRANSITION_INTERDITE',
      `Action impossible : l'intervention est au statut ${statut}.`,
    );
  }
  if (!etat.can(evenement)) {
    throw new ErreurMetier('DUREE_REQUISE', 'La durée doit être renseignée pour clôturer une intervention.');
  }
  const [suivant] = transition(machineIntervention, etat, evenement);
  return suivant.value as Statut;
}
