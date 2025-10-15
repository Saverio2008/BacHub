import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import popupStyles from './popup.css?inline';

type LangCode = 'en' | 'zh';

const messages: Record<
    LangCode,
    { title: string; description: string; loginStatus: (loggedIn: boolean) => string }
> = {
    en: { title: 'File Reader', description: 'Enable or disable file info fetching on ManageBac.', loginStatus: (loggedIn: boolean) => loggedIn ? 'Status: Logged in' : 'Status: Not logged in' },
    zh: { title: '文件读取器', description: '启用或关闭 ManageBac 的文件信息获取功能。', loginStatus: (loggedIn: boolean) => loggedIn ? '状态：已登录' : '状态：未登录' },
};

@customElement('app-popup')
export class AppPopup extends LitElement {
    static styles = css`${unsafeCSS(popupStyles)}`;

    @state() lang: LangCode = 'en';
    @state() loggedIn = false;
    @state() enabled = false;
    @state() fetching = false;
    @state() buttonLabel: '读取' | '刷新' = '读取';

    connectedCallback() {
        super.connectedCallback();
        const sysLang = (navigator.language || 'en').split('-')[0] as LangCode;
        this.lang = messages[sysLang] ? sysLang : 'en';
    }

    firstUpdated() {
        const checkbox = this.renderRoot.querySelector<HTMLInputElement>('#fileToggle');
        const fetchBtn = this.renderRoot.querySelector<HTMLButtonElement>('#fetchBtn');
        const runtime = (window as any).chrome?.runtime || (window as any).browser?.runtime;
        if (!checkbox || !fetchBtn || !runtime?.sendMessage) return;

        const updateLoginStatus = (loggedIn: boolean) => {
            this.loggedIn = loggedIn;
            fetchBtn.disabled = !loggedIn;
        };

        runtime.sendMessage({ type: 'get-login-status' }, (resp: { loggedIn: boolean }) => {
            updateLoginStatus(resp?.loggedIn ?? false);
        });

        runtime.onMessage.addListener((msg: any) => {
            if (msg?.type === 'login-status') updateLoginStatus(!!msg.loggedIn);
        });

        checkbox.checked = this.enabled;
        checkbox.addEventListener('change', () => {
            this.enabled = checkbox.checked;
            runtime.sendMessage({ type: 'file-toggle', active: this.enabled });
        });

        fetchBtn.addEventListener('click', () => {
            if (!this.loggedIn || this.fetching) return;
            this.fetching = true;
            this.buttonLabel = '读取';
            fetchBtn.textContent = this.buttonLabel;
            fetchBtn.disabled = true;
            runtime.sendMessage({ type: 'fetch-files' }, () => {
                this.fetching = false;
                this.buttonLabel = '刷新';
                fetchBtn.textContent = this.buttonLabel;
                fetchBtn.disabled = !this.loggedIn;
            });
        });
    }

    render() {
        const msg = messages[this.lang];
        return html`
      <div class="header">
        <h1 title="${msg.description}">${msg.title}</h1>
        <span class="status-dot ${this.loggedIn ? 'logged-in' : ''}"></span>
      </div>
      <label id="fileSwitch" class="switch">
        <input id="fileToggle" type="checkbox" />
        <span class="slider"></span>
      </label>
      <button id="fetchBtn">${this.buttonLabel}</button>
    `;
    }
}