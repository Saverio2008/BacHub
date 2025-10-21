declare const browser: any;
type RuntimeType = typeof chrome | typeof browser | undefined;
const runtime: RuntimeType =
    typeof browser !== "undefined"
        ? browser
        : typeof chrome !== "undefined"
            ? chrome
            : undefined;

function wrapRightColumnWithCheckbox(lastCol: HTMLDivElement, cbDiv: HTMLDivElement) {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "flex-end";
    wrapper.style.flexWrap = "nowrap";
    wrapper.style.gap = "4px";
    wrapper.style.width = "100%";

    while (lastCol.firstChild) wrapper.appendChild(lastCol.firstChild);
    wrapper.appendChild(cbDiv);

    lastCol.style.display = "flex";
    lastCol.style.alignItems = "center";
    lastCol.style.justifyContent = "flex-end";
    lastCol.style.flexWrap = "nowrap";
    lastCol.appendChild(wrapper);
}

function createCheckbox(className: string): HTMLDivElement {
    const cbDiv = document.createElement("div");
    cbDiv.className = className;
    cbDiv.dataset.injected = "true";
    cbDiv.style.cssText = `
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 4px;
    `;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cbDiv.appendChild(cb);
    return cbDiv;
}

async function injectCheckboxes(enabled: boolean) {
    document.querySelectorAll<HTMLDivElement>(".cb-file, .cb-folder, .cb-select-all").forEach(el => el.remove());
    if (!enabled) return;

    const headerRow = document.querySelector<HTMLDivElement>("div.row.header");
    const pageHead = document.querySelector<HTMLDivElement>("div.page-head-tile.flex.flex-wrap.mb-0");
    const targetCol: HTMLDivElement | null = headerRow?.querySelector<HTMLDivElement>("div.col-sm-3") ?? pageHead ?? null;

    if (targetCol && !document.querySelector(".cb-select-all")) {
        const cbDiv = createCheckbox("cb-select-all");
        if (targetCol === pageHead) cbDiv.style.marginLeft = "auto";
        else wrapRightColumnWithCheckbox(targetCol, cbDiv);
    }

    document.querySelectorAll<HTMLDivElement>("div.row.file.mt-0.px-4").forEach(row => {
        if (row.querySelector(".cb-folder")) return;
        const lastCol = row.querySelector<HTMLDivElement>("div.col-sm-3");
        if (!lastCol) return;
        const cbDiv = createCheckbox("cb-folder");
        lastCol.appendChild(cbDiv);
    });

    document.querySelectorAll<HTMLDivElement>('div.row.file.px-4[data-ec3-info]').forEach(row => {
        if (row.querySelector(".cb-file")) return;
        const lastCol = row.querySelector<HTMLDivElement>("div.col-sm-3");
        if (!lastCol) return;
        const cbDiv = createCheckbox("cb-file");
        lastCol.appendChild(cbDiv);
    });
}

async function initInjection() {
    const enabled = await new Promise<boolean>(resolve => {
        runtime?.runtime?.sendMessage?.({ type: "get-file-toggle" }, (resp: { active: boolean }) => resolve(resp?.active ?? false));
    });
    await injectCheckboxes(enabled);

    runtime?.runtime?.onMessage?.addListener((msg: any) => {
        if (msg?.type === "feature-toggled") {
            void injectCheckboxes(msg.active);
        }
    });

    const observer = new MutationObserver(() => void injectCheckboxes(true));
    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "complete" || document.readyState === "interactive") void initInjection();
else window.addEventListener("DOMContentLoaded", initInjection);