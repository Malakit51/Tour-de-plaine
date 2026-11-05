// Dictée vocale : le texte assemblé ne doit pas répéter les mots, même quand Chrome sur Android
// renvoie des résultats cumulés ou en double.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembler, ecouter } from '../src/ia/voix';

describe('assemblage des résultats', () => {
  it('résultats cumulés (Android) : garde la phrase la plus longue', () => {
    expect(assembler(['colza', 'colza 6 feuilles', 'colza 6 feuilles grosses altises'])).toBe(
      'colza 6 feuilles grosses altises',
    );
  });
  it('résultat répété : pas de doublon', () => {
    expect(assembler(['colza 6 feuilles', 'colza 6 feuilles', ' 6 feuilles '])).toBe(
      'colza 6 feuilles',
    );
  });
  it('phrases successives (ordinateur) : mises bout à bout', () => {
    expect(assembler(['colza 6 feuilles', 'grosses altises en bordure'])).toBe(
      'colza 6 feuilles grosses altises en bordure',
    );
  });
});

// Reconnaissance simulée : chaque écoute rejoue une liste d'événements, puis se termine.
class Fausse {
  static scenarios: string[][][] = [];
  static instances: Fausse[] = [];
  lang = '';
  continuous = true;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    Fausse.instances.push(this);
  }
  start() {
    const evenements = Fausse.scenarios.shift() ?? [];
    queueMicrotask(() => {
      for (const resultats of evenements) {
        this.onresult?.({
          resultIndex: 0,
          results: resultats.map((t) => ({ isFinal: true, 0: { transcript: t } })),
        });
      }
      this.onend?.();
    });
  }
  stop() {}
}

afterEach(() => vi.unstubAllGlobals());

describe('écoute sur Android', () => {
  it('phrase par phrase, sans répéter les mots d’une relance à l’autre', async () => {
    vi.stubGlobal('window', { webkitSpeechRecognition: Fausse });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140' });
    Fausse.instances = [];
    Fausse.scenarios = [
      [['colza'], ['colza 6 feuilles'], ['colza 6 feuilles', 'colza 6 feuilles']],
      [['grosses altises'], ['grosses altises en bordure']],
    ];
    const vus: string[] = [];
    let fini = false;
    let ecoute: { arreter: () => void } | null = null;
    ecoute = ecouter(
      '31 berl',
      (t) => {
        vus.push(t);
        // Arrêt après la deuxième phrase.
        if (t.endsWith('en bordure')) ecoute?.arreter();
      },
      () => (fini = true),
    );
    await vi.waitFor(() => expect(fini).toBe(true));
    expect(vus.at(-1)).toBe('31 berl colza 6 feuilles grosses altises en bordure');
    expect(Fausse.instances[0]!.continuous).toBe(false);
  });
});
