// Dictée rangée par Claude : la demande envoyée et la lecture de la réponse, avec une API simulée
// (aucun appel réel, aucune dépense).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rangerDictee, verifierCle, type Contexte } from '../src/ia/claude';

const contexte: Contexte = {
  aujourdhui: '2026-11-05',
  parcelleChoisie: '',
  parcelles: [
    { nom: '31berl', culture: 'Colza', variete: 'Hemma' },
    { nom: '022huss', culture: 'Betteraves', variete: '' },
  ],
  stades: { Colza: ['Levée', '6 feuilles'] },
  categories: ['Maladie', 'Ravageur'],
  constats: { Ravageur: ['Grosses altises'] },
  gravites: ['Faible', 'À surveiller', 'Intervenir'],
};

const reponse = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json', 'request-id': 'req_test' },
  });

const message = (texte: string, stop = 'end_turn') => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-haiku-5-5',
  content: [{ type: 'text', text: texte }],
  stop_reason: stop,
  usage: { input_tokens: 10, output_tokens: 10 },
});

function simuler(...reponses: Response[]) {
  const appels: { url: string; corps: Record<string, unknown>; entetes: Headers }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      appels.push({
        url: String(url),
        corps: init?.body ? JSON.parse(String(init.body)) : {},
        entetes: new Headers(init?.headers),
      });
      return reponses.shift()!;
    }),
  );
  return appels;
}

afterEach(() => vi.unstubAllGlobals());

describe('dictée rangée par Claude', () => {
  it('envoie la dictée avec les parcelles, et lit les pastilles', async () => {
    const appels = simuler(
      reponse(
        message(
          JSON.stringify({
            parcelle: '31berl',
            stade: '6 feuilles',
            categorie: 'Ravageur',
            constats: ['Grosses altises', ' '],
            gravite: 'À surveiller',
            a_revoir: '2026-11-12',
            synthese: 'Grosses altises en bordure, morsures nombreuses.',
          }),
        ),
      ),
    );
    const r = await rangerDictee(
      'berlin 31 colza 6 feuilles grosses altises',
      contexte,
      'sk-ant-test',
      'haiku',
    );
    expect(r).toEqual({
      parcelle: '31berl',
      stade: '6 feuilles',
      categorie: 'Ravageur',
      constats: ['Grosses altises'],
      gravite: 'À surveiller',
      aRevoir: '2026-11-12',
      synthese: 'Grosses altises en bordure, morsures nombreuses.',
    });
    const { corps, entetes } = appels[0]!;
    expect(corps.model).toBe('claude-haiku-5-5');
    // La clé part avec la demande, et l'appel direct depuis le navigateur est déclaré.
    expect(`${entetes.get('x-api-key')} ${entetes.get('authorization')}`).toContain('sk-ant-test');
    expect(entetes.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    const config = corps.output_config as { effort: string; format: { type: string; schema: any } };
    expect(config.effort).toBe('low');
    expect(config.format.type).toBe('json_schema');
    expect(config.format.schema.properties.parcelle.enum).toEqual(['', '31berl', '022huss']);
    // Haiku : pas de reprise sur un autre modèle en cas de refus.
    expect(corps.fallbacks).toBeUndefined();
    expect(JSON.stringify(corps.system)).toContain('022huss – Betteraves');
  });

  it('Opus : reprise sur un autre modèle si une consigne de sécurité refuse', async () => {
    const appels = simuler(
      reponse(
        message(
          JSON.stringify({
            parcelle: '',
            stade: '',
            categorie: '',
            constats: [],
            gravite: '',
            a_revoir: 'jeudi',
            synthese: 'RAS.',
          }),
        ),
      ),
    );
    const r = await rangerDictee('rien à signaler', contexte, 'sk-ant-test', 'opus');
    expect(r.aRevoir).toBe('');
    expect(appels[0]!.corps.model).toBe('claude-opus-5-5');
    expect(appels[0]!.corps.fallbacks).toBe('default');
    expect(appels[0]!.entetes.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
  });

  it('dit clairement quand la clé est refusée ou le crédit épuisé', async () => {
    simuler(
      reponse(
        { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
        401,
      ),
    );
    await expect(verifierCle('sk-ant-mauvaise', 'haiku')).rejects.toThrow(/Clé refusée/);
    simuler(
      reponse(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Your credit balance is too low to access the Anthropic API.',
          },
        },
        400,
      ),
    );
    await expect(rangerDictee('test', contexte, 'sk-ant-test', 'haiku')).rejects.toThrow(
      /Crédit épuisé/,
    );
  });

  it('un refus de Claude est signalé', async () => {
    simuler(reponse(message('', 'refusal')));
    await expect(rangerDictee('test', contexte, 'sk-ant-test', 'haiku')).rejects.toThrow(
      /pas voulu/,
    );
  });
});
