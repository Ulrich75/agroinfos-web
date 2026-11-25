# Démonstration — Marchés agricoles du Bénin

Frontend de démonstration qui consomme l'API du projet `../agroinfos`, à travers sa
passerelle. Il sert à montrer ce que l'API permet, pas à servir de produit final.

## Écrans

| Écran | Ce qu'il montre | Endpoints utilisés |
|---|---|---|
| Vue d'ensemble | Volumes, état des sources, derniers prix moyens de 4 produits | `/products`, `/markets`, `/prices`, `/prices/latest`, `/data-sources/{code}/status` |
| Prix | Derniers prix par marché (filtres produit, variété, département, type de prix), fraîcheur, remarques de comparabilité ; historique au clic | `/prices/latest`, `/prices/history`, `/admin-areas` |
| Comparer les marchés | Carte des marchés ; un clic place le producteur ; comparaison des prix des marchés du rayon (distance, écart avec le marché le plus proche, fraîcheur) | `/markets`, `/comparisons/markets` |
| Sources | Gouvernance de chaque source diffusée : licence, diffusion, état, fraîcheur | `/data-sources`, `/data-sources/{code}/status` |

L'application n'utilise que des requêtes `GET` : l'API est en lecture seule.

## Lancer

Prérequis : Node 20 et la plateforme démarrée (`docker compose up -d` dans `../agroinfos`).

1. **Créer une clé d'API en lecture**, puis la mettre dans `.env.local` :

   ```bash
   cd ../agroinfos
   docker compose exec gateway python -m gateway_service.keys create \
       --name frontend-demo --role reader --rate-limit 1200
   ```

   ```ini
   # ../agroinfos-demo/.env.local
   AGRI_API_KEY=agk_…
   AGRI_API_URL=http://127.0.0.1:8000
   ```

2. **Démarrer la démonstration** :

   ```bash
   npm install
   npm run dev        # http://127.0.0.1:5180
   ```

## Clé d'API

Le navigateur appelle `/api/...` sur le serveur Vite, qui relaie vers la passerelle en
ajoutant l'en-tête `X-API-Key` (`vite.config.ts`). **La clé n'est jamais envoyée au
navigateur** : elle n'apparaît ni dans le code chargé par la page, ni dans ses requêtes.
Ce relais évite aussi d'ouvrir la passerelle aux appels cross-origin.

Pour une démonstration hébergée, garder ce principe : un petit relais côté serveur
détient la clé. Il ne faut pas mettre la clé dans une variable `VITE_*`, qui serait
incluse dans le bundle.

### Déploiement sur Vercel

Le relais de production est `api/relay.ts` ; `vercel.json` y réécrit `/api/v1/*`.
Dans les variables d'environnement du projet Vercel, définir :

- `AGRI_API_KEY` : la clé d'API en lecture ;
- `AGRI_API_URL` : l'URL **publique** de la passerelle (pas `127.0.0.1`).

## Ce que la démonstration met en évidence

- Chaque prix porte sa **période** et sa **fraîcheur** : rien n'est présenté comme « en
  temps réel ».
- Les **séries non comparables** ne sont pas mélangées. Par exemple, une variété « non
  précisée » forme une série distincte.
- La comparaison regroupe les prix **directement comparables** et signale les prix qu'elle
  écarte (trop anciens, estimés ou suspects).
