declare const browser: any;

type RuntimeType = typeof chrome | typeof browser | undefined;
const runtime: RuntimeType =
    typeof browser !== "undefined"
        ? browser
        : typeof chrome !== "undefined"
            ? chrome
            : undefined;

let loggedIn = false;

interface TabChangeInfo {
    status?: string;
    url?: string;
    title?: string;
}

function broadcastLoginStatus(newStatus: boolean) {
    runtime?.tabs?.query({}, (tabs: any[]) => {
        for (const tab of tabs) {
            if (tab.id) {
                runtime?.tabs?.sendMessage(tab.id, {
                    type: "login-status",
                    loggedIn: newStatus,
                });
            }
        }
    });
    runtime?.runtime?.sendMessage({ type: "login-status", loggedIn: newStatus });
}

function updateLoginStatus(newStatus: boolean) {
    if (newStatus !== loggedIn) {
        loggedIn = newStatus;
        broadcastLoginStatus(newStatus);
    }
}

function checkTab(tab: chrome.tabs.Tab) {
    if (!tab) return;
    const isLoggedIn = /^https:\/\/ycissh\.managebac\.cn\/student\/?/.test(tab.url ?? "");
    updateLoginStatus(isLoggedIn);
}

function checkActiveTab() {
    runtime?.tabs?.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        const tab = tabs[0];
        if (!tab) return;

        if (tab.status === "complete") {
            checkTab(tab);
        } else {
            const listener = (_tabId: number, changeInfo: TabChangeInfo, updatedTab: chrome.tabs.Tab) => {
                if (updatedTab.id === tab.id && changeInfo.status === "complete") {
                    checkTab(updatedTab);
                    runtime?.tabs?.onUpdated?.removeListener(listener);
                }
            };
            runtime?.tabs?.onUpdated?.addListener(listener);
        }
    });
}

function initTabListener() {
    runtime?.tabs?.onActivated?.addListener(checkActiveTab);
    runtime?.tabs?.onUpdated?.addListener((_tabId: number, changeInfo: TabChangeInfo) => {
        if (changeInfo.status === "complete") checkActiveTab();
    });
}

runtime?.runtime?.onMessage?.addListener((msg: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    if (!msg?.type) return;

    switch (msg.type) {
        case "get-login-status":
            sendResponse({ loggedIn });
            break;

        case "force-check-login-status":
            checkActiveTab();
            sendResponse({ loggedIn });
            break;

        case "fetch-files":
            runtime?.tabs?.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
                const tab = tabs[0];
                if (!tab?.id) return sendResponse({ error: "No active tab" });

                runtime?.tabs?.sendMessage(
                    tab.id,
                    { type: "fetch-files" },
                    (response: any) => {
                        if (runtime?.runtime?.lastError) {
                            sendResponse({ error: runtime.runtime.lastError.message });
                        } else {
                            sendResponse({
                                type: "content-response",
                                data: response,
                            });
                        }
                    }
                );
            });
            return true;
    }
});

runtime?.runtime?.onStartup?.addListener(checkActiveTab);
runtime?.runtime?.onInstalled?.addListener(checkActiveTab);

checkActiveTab();
initTabListener();