declare const browser: any;
let fileToggleEnabled = false;

(async () => {
    const stored = await browser.storage.local.get("fileToggle");
    if (stored?.fileToggle !== undefined) {
        fileToggleEnabled = stored.fileToggle;
    }
})();

browser.runtime.onMessage.addListener(async (msg: { type: string; active?: boolean }, _sender: any) => {
    switch (msg.type) {
        case "get-file-toggle": {
            return { active: fileToggleEnabled };
        }

        case "file-toggle": {
            fileToggleEnabled = !!msg.active;
            await browser.storage.local.set({ fileToggle: fileToggleEnabled });

            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                if (tab.id) {
                    await browser.tabs.sendMessage(tab.id, {
                        type: "feature-toggled",
                        active: fileToggleEnabled,
                    });
                }
            }
            return { ok: true };
        }

        case "download-files": {
            console.log("Download triggered");
            return { ok: true };
        }
    }
});