import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { theme } from './lib/theme.svelte';
import { i18n } from './lib/i18n/index.svelte';

theme.apply();
i18n.syncDocument();

export default mount(App, { target: document.getElementById('app')! });
