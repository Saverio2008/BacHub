import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type LangCode = 'en' | 'zh' | 'fr' | 'ja';

const messages: Record<LangCode, { title: string; description: string }> = {
    en: { title: 'Bachub Popup', description: 'Helper popup for ManageBac.' },
    zh: { title: 'Bachub 弹窗', description: 'ManageBac 的辅助弹窗。' },
    fr: { title: 'Bachub Popup', description: 'Popup d’aide pour ManageBac.' },
    ja: { title: 'Bachub ポップアップ', description: 'ManageBac のヘルパーポップアップ。' },
};

@customElement('app-popup')
export class AppPopup extends LitElement {
    static styles = css`
    :host { display: block; font-family: sans-serif; padding: 10px; }
    p { margin: 5px 0; }
  `;

    @state()
    lang: LangCode = 'en';

    connectedCallback() {
        super.connectedCallback();
        const sysLang = navigator.language || navigator.languages[0] || 'en';
        const code = sysLang.split('-')[0] as LangCode;
        this.lang = messages[code] ? code : 'en';
    }

    render() {
        const msg = messages[this.lang];
        return html`
      <h1>${msg.title}</h1>
      <p>${msg.description}</p>
    `;
    }
}