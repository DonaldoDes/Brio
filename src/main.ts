import { createApp } from 'vue'
import App from './App.vue'

import './style.css'

void createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
