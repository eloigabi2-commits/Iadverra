// Se a aba atual ja e o Instagram, o modal abre nela. Assim quem caiu no
// login ou numa verificacao so precisa clicar no icone de novo.
chrome.action.onClicked.addListener(function(tab){
    if(tab && tab.url && /^https:\/\/www\.instagram\.com\//.test(tab.url)){
        inject(tab.id)
        return
    }

    chrome.tabs.create({ url: 'https://www.instagram.com' }, function (tab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                inject(tab.id)
            }
        });
    });
});

// Falha quando a aba nao chegou a carregar o Instagram, por exemplo sem
// internet ou se foi fechada antes.
function inject(tabId){
    chrome.scripting.executeScript({
        files: ['contentStyle.js', 'contentScript.js'],
        target: { tabId: tabId }
    }).catch(e => console.log('Não Seguidores: falha ao inserir o script', e));
}