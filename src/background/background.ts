let fileToggleEnabled = false;

browser.runtime.onMessage.addListener(async (msg: { type: any; active: any; }, _sender: any) => {
    switch (msg.type) {
        case "get-file-toggle":
            return { active: fileToggleEnabled };

        case "file-toggle":
            fileToggleEnabled = !!msg.active;
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                if (tab.id) {
                    await browser.tabs.sendMessage(tab.id, { type: "feature-toggled", active: fileToggleEnabled });
                }
            }
            return { ok: true };

        case "download-files":
            console.log("Download triggered");
            return { ok: true };
    }
});