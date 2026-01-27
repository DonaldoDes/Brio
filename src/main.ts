import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import './style.css'
import './styles/tokens.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

void app.mount('#app').$nextTick(() => {
  postMessage({ payload: 'removeLoading' }, '*')
})
