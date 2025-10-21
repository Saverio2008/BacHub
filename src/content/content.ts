type RuntimeType = typeof chrome | typeof browser | undefined;
const runtime: RuntimeType =
    typeof browser !== "undefined"
        ? browser
        : typeof chrome !== "undefined"
            ? chrome
            : undefined;

function cleanupInjectedElements() {
    document.querySelectorAll<HTMLElement>(".cb-wrapper").forEach(wrapper => {
        const parent = wrapper.parentElement;
        if (!parent) return;

        Array.from(wrapper.children).forEach(child => {
            const el = child as HTMLElement;

            if (el.classList.contains("cb-file") || el.classList.contains("cb-folder") || el.classList.contains("cb-select-all")) {
                el.remove();
            } else {
                parent.appendChild(el);
            }
        });
        wrapper.remove();
    });
    document.querySelectorAll<HTMLElement>(".cb-select-all").forEach(el => el.remove());
}

function wrapRightColumnWithCheckbox(lastCol: HTMLDivElement, cbDiv: HTMLDivElement) {
    if (lastCol.querySelector(".cb-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "cb-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "flex-end";
    wrapper.style.gap = "4px";
    wrapper.style.width = "100%";

    cbDiv.style.margin = "0";
    cbDiv.style.padding = "0";

    while (lastCol.firstChild) wrapper.appendChild(lastCol.firstChild);
    wrapper.appendChild(cbDiv);
    lastCol.appendChild(wrapper);
}

function createCheckbox(className: string, role: "all" | "item"): HTMLDivElement {
    const cbDiv = document.createElement("div");
    cbDiv.className = className;
    cbDiv.dataset.injected = "true";
    cbDiv.dataset.role = role;
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

    if (role === "all") {
        cb.addEventListener("change", () => {
            const event = new CustomEvent("file-selection-toggle", {
                detail: { checked: cb.checked },
            });
            window.dispatchEvent(event);
        });
    } else {
        cb.addEventListener("change", () => {
            const event = new CustomEvent("file-selection-updated");
            window.dispatchEvent(event);
        });
        window.addEventListener("file-selection-toggle", (e: any) => {
            cb.checked = e.detail.checked;
        });
    }

    return cbDiv;
}

async function injectCheckboxes(enabled: boolean) {
    if (!enabled) {
        cleanupInjectedElements();
        return;
    }

    const existingAll = document.querySelector(".cb-select-all");
    if (existingAll) return;

    const headerRow = document.querySelector<HTMLDivElement>("div.row.header");
    const pageHead = document.querySelector<HTMLDivElement>("div.page-head-tile.flex.flex-wrap.mb-0");
    let targetCol: HTMLDivElement | null = null;

    if (headerRow) {
        targetCol = headerRow.querySelector<HTMLDivElement>("div.col-sm-3");
    }
    if (!targetCol && pageHead) {
        targetCol = pageHead;
    }

    if (targetCol) {
        const cbDiv = createCheckbox("cb-select-all", "all");
        if (targetCol === pageHead) {
            cbDiv.style.marginLeft = "auto";
            targetCol.appendChild(cbDiv);
        } else {
            wrapRightColumnWithCheckbox(targetCol, cbDiv);
        }
    }

    for (const row of document.querySelectorAll<HTMLDivElement>("div.row.file.mt-0.px-4")) {
        if (row.querySelector(".cb-folder")) continue;
        const lastCol = row.querySelector<HTMLDivElement>("div.col-sm-3");
        if (!lastCol) continue;
        const cbDiv = createCheckbox("cb-folder", "item");
        wrapRightColumnWithCheckbox(lastCol, cbDiv);
    }

    for (const row of document.querySelectorAll<HTMLDivElement>('div.row.file.px-4[data-ec3-info]')) {
        if (row.querySelector(".cb-file")) continue;
        const lastCol = row.querySelector<HTMLDivElement>("div.col-sm-3");
        if (!lastCol) continue;
        const cbDiv = createCheckbox("cb-file", "item");
        wrapRightColumnWithCheckbox(lastCol, cbDiv);
    }

    const allCheckbox = document.querySelector<HTMLInputElement>('.cb-select-all input');
    if (allCheckbox) {
        window.addEventListener("file-selection-updated", () => {
            const items = Array.from(document.querySelectorAll<HTMLInputElement>('.cb-folder input, .cb-file input'));
            allCheckbox.checked = items.length > 0 && items.every(cb => cb.checked);
        });
    }
}

async function getFeatureState(): Promise<boolean> {
    return new Promise(resolve => {
        runtime?.runtime?.sendMessage?.({ type: "get-file-toggle" }, (resp: { active: boolean }) =>
            resolve(resp?.active ?? false)
        );
    });
}

async function initInjection() {
    let enabled = await getFeatureState();
    await injectCheckboxes(enabled);

    runtime?.runtime?.onMessage?.addListener((msg: any) => {
        if (msg?.type === "feature-toggled") {
            if (!msg.active) cleanupInjectedElements();
            void injectCheckboxes(msg.active);
        }
    });

    let pending = false;
    const observer = new MutationObserver(async () => {
        if (pending) return;
        pending = true;
        setTimeout(async () => {
            const state = await getFeatureState();
            await injectCheckboxes(state);
            pending = false;
        }, 800);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("beforeunload", () => {
        cleanupInjectedElements();
        observer.disconnect();
    });
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    void initInjection();
} else {
    window.addEventListener("DOMContentLoaded", () => void initInjection());
}