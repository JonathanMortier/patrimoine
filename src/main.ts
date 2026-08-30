import { registerSW } from 'virtual:pwa-register'
import { bootstrap } from './root'
import './styles.css'

registerSW({ immediate: true })

void bootstrap()