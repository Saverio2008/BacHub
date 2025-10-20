interface FileInfo {
    name: string;
    url?: string;
    mime_type?: string;
    size?: string;
    created_at?: string;
    children?: FileInfo[];
}

interface CourseFiles {
    [courseName: string]: FileInfo[];
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function waitForContainerStable(doc: Document, duration = 1500, checks = 3): Promise<HTMLElement | null> {
    let container: HTMLElement | null = null;
    for (let i = 0; i < 10; i++) {
        container = doc.querySelector<HTMLElement>("div.total-commander.clearfix");
        if (container) break;
        await sleep(500);
    }
    if (!container) return null;
    let lastCount = 0;
    for (let i = 0; i < checks; i++) {
        const current = container.querySelectorAll(".row, .content-panel").length;
        if (current === lastCount && current > 0) return container;
        lastCount = current;
        await sleep(duration);
    }
    return container;
}

let currentIframe: HTMLIFrameElement | null = null;

async function fetchFilesFromUrl(url: string): Promise<FileInfo[]> {
    return new Promise<FileInfo[]>((resolve) => {
        if (currentIframe) {
            document.body.removeChild(currentIframe);
            currentIframe = null;
        }
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        currentIframe = iframe;
        iframe.src = url;
        const cleanup = () => {
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
            if (currentIframe === iframe) currentIframe = null;
        };
        iframe.onload = async () => {
            const doc = iframe.contentDocument;
            if (!doc) {
                cleanup();
                resolve([]);
                return;
            }
            const container = await waitForContainerStable(doc);
            if (!container) {
                cleanup();
                resolve([]);
                return;
            }
            const files = await parseFileList(container);
            cleanup();
            resolve(files);
        };
        setTimeout(() => {
            cleanup();
            resolve([]);
        }, 20000);
    });
}

async function parseFileList(container: HTMLElement): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const fileDivs = Array.from(container.querySelectorAll<HTMLDivElement>("div.row.file.px-4[data-ec3-info]"));
    for (const div of fileDivs) {
        const data = div.getAttribute("data-ec3-info");
        if (!data) continue;
        try {
            const info = JSON.parse(data);
            files.push({
                name: info.name,
                url: info.download_url,
                mime_type: info.mime_type,
                size: info.file_size
                    ? info.file_size > 1024 * 1024
                        ? `${(info.file_size / (1024 * 1024)).toFixed(2)} MB`
                        : `${Math.round(info.file_size / 1024)} KB`
                    : undefined,
                created_at: info.created_at
            });
        } catch {}
    }
    const folderLinks = Array.from(container.querySelectorAll<HTMLAnchorElement>("div.row.file.mt-0.px-4 a[href*='/folder/']"));
    for (const a of folderLinks) {
        const folderName = a.textContent?.trim() || "Unnamed Folder";
        const href = a.getAttribute("href");
        if (!href) continue;
        const absUrl = new URL(href, window.location.origin).href;
        let children: FileInfo[] = [];
        for (let i = 0; i < 3; i++) {
            children = await fetchFilesFromUrl(absUrl);
            if (children.length > 0) break;
            await sleep(1000);
        }
        files.push({
            name: folderName,
            children
        });
    }
    return files;
}

async function fetchCourseFiles(a: HTMLAnchorElement): Promise<FileInfo[]> {
    const baseUrl = a.getAttribute("href");
    if (!baseUrl) return [];
    const filesUrl = baseUrl.endsWith("/files") ? baseUrl : `${baseUrl}/files`;
    return await fetchFilesFromUrl(filesUrl);
}

async function main(): Promise<CourseFiles> {
    const menu = document.querySelector("li.f-menu__item.parent.js-menu-classes-list[data-path='classes']");
    if (!menu) return {};
    const courseFiles: CourseFiles = {};
    const links = Array.from(menu.querySelectorAll<HTMLAnchorElement>("li.f-menu__submenu-item a.f-menu__submenu-link"));
    for (const a of links) {
        const name = a.querySelector(".f-menu__submenu-link-title")?.textContent.trim();
        if (!name) continue;
        courseFiles[name] = await fetchCourseFiles(a);
    }
    return courseFiles;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "fetch-files") {
        main().then((files) => {
            sendResponse({ type: "content-response", data: files });
            const json = JSON.stringify(files, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "course_files.json";
            a.click();
            URL.revokeObjectURL(url);
        });
        return true;
    }
});