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

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChildren(div: HTMLElement, timeout = 3000) {
    const start = Date.now();
    while (div.querySelectorAll('div.row.file.px-4[data-ec3-info]').length === 0) {
        if (Date.now() - start > timeout) break;
        await delay(100);
    }
}

async function expandFolder(div: HTMLElement) {
    const toggle = div.querySelector<HTMLElement>('button.toggle, a.toggle');
    if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
        toggle.click();
        await waitForChildren(div);
    }
}

async function getFilesFromContainer(container: HTMLElement = document.body): Promise<FileInfo[]> {
    const items = Array.from(container.querySelectorAll<HTMLDivElement>('div.row.file.px-4[data-ec3-info]'));
    const files: FileInfo[] = [];

    for (const div of items) {
        const data = div.getAttribute('data-ec3-info');
        if (!data) continue;

        try {
            const info = JSON.parse(data);
            const fileItem: FileInfo = {
                name: info.name,
                url: info.download_url,
                mime_type: info.mime_type,
                size: info.file_size
                    ? info.file_size > 1024 * 1024
                        ? `${(info.file_size / (1024 * 1024)).toFixed(2)} MB`
                        : `${Math.round(info.file_size / 1024)} KB`
                    : undefined,
                created_at: info.created_at
            };

            if (info.type === 'folder') {
                await expandFolder(div);
                fileItem.children = await getFilesFromContainer(div);
            }

            files.push(fileItem);
        } catch (err) {
            console.error('Failed to parse file info', err);
        }
    }

    return files;
}

async function fetchCourseFiles(a: HTMLAnchorElement): Promise<FileInfo[]> {
    const courseUrl = a.getAttribute('href');
    if (!courseUrl) return [];

    return new Promise<FileInfo[]>(resolve => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = courseUrl;

        iframe.onload = async () => {
            const files = await getFilesFromContainer(iframe.contentDocument?.body || document.body);
            document.body.removeChild(iframe);
            resolve(files);
        };
    });
}

async function main(): Promise<CourseFiles> {
    const coursesMenu = document.querySelector(
        'li.f-menu__item.parent.js-menu-classes-list[data-path="classes"]'
    );
    if (!coursesMenu) return {};
    const courseFiles: CourseFiles = {};
    const courseItems = Array.from(
        coursesMenu.querySelectorAll('li.f-menu__submenu-item a.f-menu__submenu-link')
    ) as HTMLAnchorElement[];
    for (const a of courseItems) {
        const courseName = a.querySelector('.f-menu__submenu-link-title')?.textContent.trim();
        if (!courseName) continue;
        courseFiles[courseName] = await fetchCourseFiles(a);
    }
    return courseFiles;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'fetch-files') {
        main().then(files => {
            sendResponse({ type: 'content-response', data: files });

            // 开发阶段：自动下载 JSON
            const jsonStr = JSON.stringify(files, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'course_files.json';
            a.click();
            URL.revokeObjectURL(url);
        });
        return true;
    }
});