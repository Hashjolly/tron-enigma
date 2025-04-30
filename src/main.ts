import './assets/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Vérifier que IndexedDB est disponible
if (!window.indexedDB) {
  console.warn("Votre navigateur ne prend pas en charge IndexedDB. Certaines fonctionnalités comme la sauvegarde de l'ordre des pistes audio pourraient ne pas fonctionner.")
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
