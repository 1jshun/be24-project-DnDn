import { createApp } from 'vue'
import { createPinia } from 'pinia' // 👈 누락된 import 추가

import App from './App.vue'
import router from './router'
import './assets/main.css'
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')