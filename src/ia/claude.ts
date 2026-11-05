// Dictée rangée par Claude (API Anthropic, compte de Maxime, clé gardée sur le téléphone) : le
// texte dicté devient des pastilles (parcelle, stade, catégorie, constats, gravité, à revoir) et
// une courte synthèse. Aussi : le résumé d'un tour de plaine pour le Journal.
// La bibliothèque est chargée seulement au premier usage : l'appli reste légère sans la dictée.

import type { Note } from '../registre/modele';

export type Modele = 'haiku' | 'sonnet' | 'opus';

export const MODELES: Record<Modele, { id: string; nom: string; detail: string }> = {
  haiku: { id: 'claude-haiku-5-5', nom: 'Haiku', detail: 'le moins cher' },
  sonnet: { id: 'claude-sonnet-5-5', nom: 'Sonnet', detail: 'intermédiaire' },
  opus: { id: 'claude-opus-5-5', nom: 'Opus', detail: 'le plus capable' },
};

export class ErreurClaude extends Error {
  override name = 'ErreurClaude';
}

/** Ce que Claude sait de l'exploitation pour ranger une dictée. */
export interface Contexte {
  aujourdhui: string; // AAAA-MM-JJ
  /** Parcelle déjà choisie (GPS ou à la main), vide sinon. */
  parcelleChoisie: string;
  parcelles: { nom: string; culture: string; variete: string }[];
  /** Pastilles proposées dans l'appli, pour que Claude reprenne les mêmes mots. */
  stades: Record<string, string[]>;
  categories: readonly string[];
  constats: Record<string, string[]>;
  gravites: readonly string[];
}

export interface Rangement {
  parcelle: string;
  stade: string;
  categorie: string;
  constats: string[];
  gravite: string;
  aRevoir: string;
  synthese: string;
}

async function client(cle: string) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // La clé est celle de Maxime, sur son téléphone, dans son appli : l'appel direct depuis le
  // navigateur est voulu (pas de serveur entre les deux).
  return new Anthropic({ apiKey: cle, dangerouslyAllowBrowser: true, maxRetries: 1 });
}

/** Message clair pour une erreur de l'API. */
async function traduire(e: unknown): Promise<ErreurClaude> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  if (e instanceof ErreurClaude) return e;
  if (e instanceof Anthropic.AuthenticationError)
    return new ErreurClaude(
      'Clé refusée ou expirée : crées-en une nouvelle dans la Console, puis colle-la dans Réglages › Dictée.',
    );
  if (e instanceof Anthropic.PermissionDeniedError)
    return new ErreurClaude('Cette clé n’a pas le droit d’utiliser ce modèle.');
  if (e instanceof Anthropic.RateLimitError)
    return new ErreurClaude('Trop de demandes d’un coup : réessaie dans une minute.');
  if (e instanceof Anthropic.BadRequestError && /credit/i.test(e.message))
    return new ErreurClaude('Crédit épuisé : recharge-le sur platform.claude.com (Billing).');
  if (e instanceof Anthropic.APIConnectionError)
    return new ErreurClaude('Pas de réseau : la dictée est gardée, elle sera rangée plus tard.');
  if (e instanceof Anthropic.APIError)
    return new ErreurClaude(`Claude a répondu une erreur : ${e.message}`);
  return new ErreurClaude(String((e as Error)?.message ?? e));
}

/** Vérifie la clé sans rien dépenser (lecture de la fiche du modèle). */
export async function verifierCle(cle: string, modele: Modele): Promise<void> {
  try {
    await (await client(cle)).models.retrieve(MODELES[modele].id);
  } catch (e) {
    throw await traduire(e);
  }
}

const CONSIGNES = `Tu ranges les notes dictées par Maxime, agriculteur dans la Marne, pendant son tour de plaine.
La dictée vient de la reconnaissance vocale du téléphone : mots mal reconnus, pas de ponctuation, noms de parcelles approximatifs (« 22 Huss » pour 022huss, « Berlin 31 » pour 31berl).
Remplis les champs à partir de la dictée seulement ; laisse vide ("" ou liste vide) ce qui n'est pas dit. N'invente rien.
- parcelle : le nom exact de la liste. Si une parcelle est déjà choisie et que la dictée n'en nomme pas d'autre, garde-la. Si la dictée en nomme plusieurs, prends la première et cite les autres dans la synthèse.
- stade : de préférence un des stades proposés pour la culture de la parcelle, mot pour mot.
- categorie : une seule, celle de ce qui est surtout observé.
- constats : de préférence les constats proposés, mot pour mot ; sinon quelques mots, avec une majuscule.
- gravite : Faible, À surveiller ou Intervenir, seulement si la dictée le dit ou le laisse clairement entendre (« il faudra traiter » → Intervenir ; « rien de grave » → Faible).
- a_revoir : date AAAA-MM-JJ si la dictée demande de repasser (« à revoir dans une semaine », « jeudi prochain »), calculée depuis la date du jour ; sinon "".
- synthese : une ou deux phrases courtes, en français correct, qui disent ce qui a été vu (sans répéter la parcelle ni la date). Corrige les mots mal reconnus quand le sens est évident.`;

interface ReponseBrute {
  parcelle: string;
  stade: string;
  categorie: string;
  constats: string[];
  gravite: string;
  a_revoir: string;
  synthese: string;
}

function lireReponse(texte: string): ReponseBrute {
  let r: Partial<ReponseBrute>;
  try {
    r = JSON.parse(texte) as Partial<ReponseBrute>;
  } catch {
    throw new ErreurClaude('Réponse de Claude illisible : réessaie.');
  }
  const chaine = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    parcelle: chaine(r.parcelle),
    stade: chaine(r.stade),
    categorie: chaine(r.categorie),
    constats: Array.isArray(r.constats) ? r.constats.filter((x) => typeof x === 'string') : [],
    gravite: chaine(r.gravite),
    a_revoir: chaine(r.a_revoir),
    synthese: chaine(r.synthese),
  };
}

/** Range une dictée. */
export async function rangerDictee(
  dictee: string,
  contexte: Contexte,
  cle: string,
  modele: Modele,
): Promise<Rangement> {
  const noms = contexte.parcelles.map((p) => p.nom);
  // Réponse en JSON imposée par ce schéma (sorties structurées). Lue ici plutôt que par l'aide
  // de la bibliothèque : un refus de Claude arrive avec une réponse vide, à signaler comme tel.
  const schema = {
    type: 'object',
    properties: {
      parcelle: { type: 'string', enum: ['', ...noms] },
      stade: { type: 'string' },
      categorie: { type: 'string', enum: ['', ...contexte.categories] },
      constats: { type: 'array', items: { type: 'string' } },
      gravite: { type: 'string', enum: ['', ...contexte.gravites] },
      a_revoir: { type: 'string' },
      synthese: { type: 'string' },
    },
    required: ['parcelle', 'stade', 'categorie', 'constats', 'gravite', 'a_revoir', 'synthese'],
    additionalProperties: false,
  };
  const donnees = [
    `Date du jour : ${contexte.aujourdhui}`,
    `Parcelle déjà choisie : ${contexte.parcelleChoisie || '(aucune)'}`,
    'Parcelles (nom – culture – variété) :',
    ...contexte.parcelles.map((p) => `${p.nom} – ${p.culture || '?'} – ${p.variete || '?'}`),
    'Stades proposés par culture :',
    ...Object.entries(contexte.stades).map(([c, s]) => `${c} : ${s.join(', ')}`),
    'Constats proposés par catégorie (pour la culture de la parcelle choisie) :',
    ...Object.entries(contexte.constats).map(([c, s]) => `${c} : ${s.join(', ')}`),
  ].join('\n');
  try {
    const c = await client(cle);
    const reponse = await c.beta.messages.create({
      model: MODELES[modele].id,
      max_tokens: 8000,
      system: [
        { type: 'text', text: CONSIGNES },
        { type: 'text', text: donnees },
      ],
      messages: [{ role: 'user', content: `Dictée :\n${dictee}` }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      // Opus et Sonnet : si une consigne de sécurité refuse la demande, l'API la reprend d'elle-même
      // sur un autre modèle (Haiku n'a pas cette reprise).
      ...(modele === 'haiku'
        ? {}
        : { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01'] }),
    });
    if (reponse.stop_reason === 'refusal')
      throw new ErreurClaude('Claude n’a pas voulu ranger cette dictée.');
    if (reponse.stop_reason === 'max_tokens')
      throw new ErreurClaude('Réponse de Claude coupée : réessaie.');
    const r = lireReponse(
      reponse.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''),
    );
    return {
      parcelle: r.parcelle,
      stade: r.stade.trim(),
      categorie: r.categorie,
      constats: r.constats.map((x) => x.trim()).filter(Boolean),
      gravite: r.gravite,
      aRevoir: /^\d{4}-\d{2}-\d{2}$/.test(r.a_revoir) ? r.a_revoir : '',
      synthese: r.synthese.trim(),
    };
  } catch (e) {
    throw await traduire(e);
  }
}

/** Compte rendu d'un tour de plaine (les observations d'une journée), en quelques lignes. */
export async function resumerTour(
  jour: string,
  notes: Note[],
  cultureDe: (parcelle: string) => string,
  cle: string,
  modele: Modele,
): Promise<string> {
  const lignes = notes.map((n) =>
    [
      `${n.parcelle} (${cultureDe(n.parcelle) || '?'})`,
      n.stade && `stade ${n.stade}`,
      n.categorie && `${n.categorie} : ${n.constats.join(', ')}`,
      n.gravite,
      n.aRevoir && `à revoir le ${n.aRevoir}`,
      n.texte,
    ]
      .filter(Boolean)
      .join(' ; '),
  );
  try {
    const c = await client(cle);
    const reponse = await c.beta.messages.create({
      model: MODELES[modele].id,
      max_tokens: 8000,
      system:
        'Tu écris le compte rendu du tour de plaine de Maxime, agriculteur, à partir de ses observations. ' +
        'En français, sans titre ni mise en forme Markdown, 4 à 8 lignes : ce qui demande une intervention ' +
        'd’abord, puis ce qui est à surveiller, puis le reste en une phrase. Regroupe par culture quand c’est ' +
        'plus clair. N’ajoute aucun conseil ni aucune information qui n’est pas dans les observations.',
      messages: [{ role: 'user', content: `Tour du ${jour} :\n${lignes.join('\n')}` }],
      output_config: { effort: 'low' },
      ...(modele === 'haiku'
        ? {}
        : { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01'] }),
    });
    if (reponse.stop_reason === 'refusal')
      throw new ErreurClaude('Claude n’a pas voulu résumer ce tour.');
    return reponse.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('\n')
      .trim();
  } catch (e) {
    throw await traduire(e);
  }
}
