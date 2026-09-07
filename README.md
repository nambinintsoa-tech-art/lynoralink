# lynoralink
LynoraLink – Application de réseau social moderne pour connecter, partager et interagir.

## Application Android

Le projet utilise Capacitor pour fournir une application Android sans modifier la version web. Par défaut, l'application charge la version publique `https://lynoralink.vercel.app`, afin que les mises à jour web soient disponibles après actualisation.

```bash
npm install
npm run mobile:add:android
npm run mobile:sync
npm run mobile:open:android
```

Android Studio est nécessaire pour compiler et lancer l'application. Une autre URL peut être utilisée en développement avec la variable `CAPACITOR_SERVER_URL`.
