import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { isElectron, initWebApi } from './web'

import './style.css'
import './styles/tokens.css'

async function bootstrap() {
  // Initialize Web API if not in Electron
  if (!isElectron()) {
    console.log('[Bootstrap] Running in Web mode, initializing WebBrioAPI...')
    await initWebApi()
  } else {
    console.log('[Bootstrap] Running in Electron mode, using IPC API')
  }

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  void app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
}

void bootstrap()
