# Adaptation smartphone réel — ce qui a été fait

## Le vrai problème
Rétrécir la fenêtre du navigateur change la **largeur**, mais pas :
- les unités `vh` / `dvh` / `vw` (calculées sur la hauteur réelle de votre écran desktop, pas sur 844px comme un iPhone) ;
- le `hover` — la souris reste active, donc les bugs tactiles ne se voient jamais ;
- le clavier virtuel, l'encoche, les barres de navigateur mobiles.

C'est pour ça que tout semblait "correct" en réduisant l'onglet.

## Bugs corrigés dans le code

**`PostCard.jsx`**
1. **Animations mortes** — le `<style>` contenant `@keyframes spin` et `@keyframes shimmer` était placé hors de tout JSX rendu (entre deux fonctions, jamais monté dans le DOM). Les spinners de chargement média ne tournaient donc jamais. Déplacé dans le bloc `<style>` réellement rendu.
2. **Reaction picker inutilisable au doigt** — ouvert uniquement via `onMouseEnter`/`onMouseLeave`. Sur un vrai téléphone, ça ne se déclenche jamais. Ajout d'un **appui long** (équivalent tactile), avec fermeture au tap en dehors.
3. **Bouton "…" des commentaires invisible sur mobile** — son opacité dépendait de `isHovering`, jamais vrai au doigt. Forcé visible sous 900px.
4. **ShareModal non adaptée** — contrairement à celle de `PostViewerPreview.jsx`, elle n'avait aucune règle mobile (pas de plein écran, inputs à `font-size: 13px` qui déclenchent le zoom automatique iOS). Alignée sur le même traitement que `PostViewerPreview`.

**`PostViewerPreview.jsx`**
- Même correctif d'appui long sur les deux reaction pickers (bouton "J'aime" principal + réactions des commentaires), pour la même raison.

Le CSS `@media` déjà en place (900px / 420px, `dvh`, `env(safe-area-inset-*)`) était en réalité bien construit — ce n'est pas ce qui posait problème.

## `DeviceFrame.jsx` — aperçu fiable sans redimensionner le navigateur
Un cadre de téléphone qui charge votre app dans un `<iframe>` — une vraie fenêtre de navigation isolée, avec ses propres `dvh`/`vw`. C'est la seule façon, en desktop, de voir un rendu fidèle.

```jsx
import DeviceFrame, { DeviceFrameRow } from "./DeviceFrame";

<DeviceFrame src="http://localhost:3000/feed?preview=post" device="iphone15" />

<DeviceFrameRow
  src="http://localhost:3000/feed?preview=post"
  devices={["iphoneSE", "iphone15", "pixel8"]}
/>
```

`src` doit pointer vers une URL réelle de votre app en dev (pas des enfants React directement — l'iframe a besoin de sa propre page pour isoler le viewport).

## Le test le plus fiable reste le vrai téléphone
`DeviceFrame` n'a pas de vrai tactile ni de vrai clavier virtuel. Pour un test définitif :
```bash
npm run dev -- --host        # ou next dev -H 0.0.0.0
```
puis ouvrez `http://<IP-locale-de-votre-PC>:3000` depuis le navigateur de votre téléphone (même Wi-Fi).
