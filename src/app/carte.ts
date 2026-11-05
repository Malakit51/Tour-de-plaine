// Carte de la plaine : la photo aérienne de l'IGN (comme dans Jalon), les parcelles de Jalon
// colorées par culture, ta position. Toucher une parcelle ouvre sa fiche.

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { el } from '../ui/dom';
import { icone } from '../ui/icones';
import { joursJusqua, naviguer } from './commun';
import { aRevoir, contourDe, etat, parcelles } from './etat';
import { surPosition } from './position';

// Géoplateforme IGN, service WMTS en projection Web Mercator (« PM »), sans clé (comme Jalon).
const PHOTO =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
const ATTRIBUTION = '© IGN – Géoplateforme';

/** Couleur d'une culture : fixe pour les cultures de l'exploitation, sinon tirée de son nom. */
export function couleurCulture(culture: string): string {
  const c = culture
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const fixes: [RegExp, string][] = [
    [/ble/, '#e3b23c'],
    [/escourgeon|orge d.hiver/, '#6f9e3d'],
    [/orge/, '#b5cc5a'],
    [/colza/, '#f5e04a'],
    [/better/, '#c0508f'],
    [/mais/, '#e07b39'],
    [/luzerne/, '#3fa07a'],
    [/oeillette|pavot/, '#8f7fd1'],
    [/pois|feverole/, '#4f9bd9'],
  ];
  const f = fixes.find(([re]) => re.test(c));
  if (f) return f[1];
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 55%)`;
}

/** Vue gardée d'une ouverture de la carte à l'autre. */
let vue: { centre: L.LatLng; zoom: number } | null = null;

export function vueCarte(): HTMLElement {
  const bloc = el('section', { class: 'bloc-carte' });
  const zone = el('div', { class: 'carte-plaine' });
  bloc.append(zone);

  const avecContour = parcelles().filter((p) => contourDe(p.nom));
  if (avecContour.length === 0) {
    bloc.append(
      el(
        'p',
        { class: 'doux' },
        'Aucune parcelle n’a encore de contour de Jalon : la carte ne peut pas les montrer (Réglages › Contours).',
      ),
    );
  }
  const cultures = [...new Set(avecContour.map((p) => p.culture).filter(Boolean))].sort();
  if (cultures.length) {
    bloc.append(
      el(
        'div',
        { class: 'legende' },
        ...cultures.map((c) =>
          el('span', {}, el('i', { style: `background:${couleurCulture(c)}` }), c),
        ),
      ),
    );
  }

  // Leaflet a besoin de la taille de la zone : la carte se crée une fois la page affichée.
  requestAnimationFrame(() => {
    if (!zone.isConnected) return;
    const carte = L.map(zone, { zoomControl: false, maxZoom: 20, zoomSnap: 0.5 });
    carte.attributionControl.setPrefix(false);
    // Sous la photo, la même en moins détaillé : une tuile qui n'arrive pas laisse voir la photo
    // floue au lieu d'un carré blanc.
    L.tileLayer(PHOTO, { maxNativeZoom: 15, maxZoom: 20 }).addTo(carte);
    L.tileLayer(PHOTO, { maxNativeZoom: 19, maxZoom: 20, attribution: ATTRIBUTION }).addTo(carte);

    const urgentes = new Set(
      aRevoir()
        .filter((n) => joursJusqua(n.aRevoir) <= 0)
        .map((n) => n.parcelle),
    );
    const limites = L.latLngBounds([]);
    for (const p of avecContour) {
      const c = contourDe(p.nom)!;
      const anneaux = [...c.exterieurs, ...c.exclus];
      const forme = L.polygon(anneaux as L.LatLngExpression[][], {
        color: urgentes.has(p.nom) ? '#f5a524' : '#ffffff',
        weight: urgentes.has(p.nom) ? 4 : 2,
        fillColor: couleurCulture(p.culture),
        fillOpacity: 0.5,
      }).addTo(carte);
      forme.on('click', () => naviguer(`#parcelle/${encodeURIComponent(p.nom)}`));
      limites.extend(forme.getBounds());
    }

    const moi = L.circleMarker([0, 0], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#2457c5',
      fillOpacity: 1,
    });
    const placerMoi = () => {
      if (!etat.position) return;
      moi.setLatLng(etat.position.latLon);
      if (!carte.hasLayer(moi)) moi.addTo(carte);
    };
    placerMoi();
    const desabonner = surPosition(() => (zone.isConnected ? placerMoi() : desabonner()));

    if (vue) carte.setView(vue.centre, vue.zoom);
    else if (limites.isValid()) carte.fitBounds(limites, { padding: [16, 16] });
    else if (etat.position) carte.setView(etat.position.latLon, 15);
    else carte.setView([49.3, 4.3], 12);
    carte.on('moveend', () => (vue = { centre: carte.getCenter(), zoom: carte.getZoom() }));

    // Bouton « me centrer », en bas à droite comme sur Google Maps.
    const centrer = el(
      'button',
      { class: 'bouton-carte', 'aria-label': 'Me centrer sur ma position' },
      icone('gps', 24),
    );
    centrer.addEventListener('click', (e) => {
      e.stopPropagation();
      if (etat.position) carte.setView(etat.position.latLon, Math.max(carte.getZoom(), 16));
    });
    L.DomEvent.disableClickPropagation(centrer);
    zone.append(centrer);
  });
  return bloc;
}
