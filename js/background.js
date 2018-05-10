/*
On page action click open sidebar.
*/
browser.pageAction.onClicked.addListener(() => {
    browser.sidebarAction.open()
})