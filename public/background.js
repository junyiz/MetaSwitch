chrome.runtime.onInstalled.addListener(() => {
    console.log('ProxySwitchy starting')
})

chrome.storage.onChanged.addListener((details) => {
    // console.log(details)
})

chrome.proxy.onProxyError.addListener(function(e) {
    console.log('error', e)
})

chrome.proxy.settings.onChange.addListener(function(evt) {
    console.log('proxy settings change', evt)
})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('request', request, 'sender', sender.tab ?  'from a content script:' + sender.tab.url : 'from the extension')

    chrome.proxy.settings.set({ value: request, scope: 'regular' }, function() {
        console.log('proxy settings set success')
    })

    sendResponse({ done: true })
})