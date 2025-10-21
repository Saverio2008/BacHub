import {css, html, LitElement, unsafeCSS} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import popupStyles from './popup.css?inline';

@customElement('app-popup')
export class AppPopup extends LitElement {
    static styles = css`${unsafeCSS(popupStyles)}`;
    @state() enabled = false;

    async connectedCallback() {
        super.connectedCallback();
        const runtime = (window as any).browser?.runtime;
        if (!runtime?.sendMessage) return;

        const resp = await runtime.sendMessage({ type: "get-file-toggle" });
        this.enabled = !!resp.active;

        const checkbox = this.renderRoot.querySelector<HTMLInputElement>('#fileToggle');
        if (checkbox) checkbox.checked = this.enabled;
    }

    firstUpdated() {
        const checkbox = this.renderRoot.querySelector<HTMLInputElement>('#fileToggle');
        const downloadBtn = this.renderRoot.querySelector<HTMLButtonElement>('#downloadBtn');
        const runtime = (window as any).browser?.runtime;
        if (!checkbox || !downloadBtn || !runtime?.sendMessage) return;

        checkbox.addEventListener('change', async () => {
            this.enabled = checkbox.checked;
            await runtime.sendMessage({ type: 'file-toggle', active: this.enabled });
        });

        downloadBtn.addEventListener('click', async () => {
            await runtime.sendMessage({ type: 'download-files' });
        });
    }

    render() {
        return html`
            <label id="fileSwitch" class="switch">
                <input id="fileToggle" type="checkbox" />
                <span class="slider"></span>
            </label>
            <button id="downloadBtn">下载</button>
        `;
    }
}