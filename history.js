document.addEventListener('DOMContentLoaded', async () => {
    const list = document.getElementById('history-list');
    const { history } = await chrome.storage.local.get({ history: [] });

    if (history.length === 0) {
        list.innerHTML = '<li>Kein Verlauf vorhanden.</li>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.innerHTML = `<strong>${item.title}</strong><br><small>${new Date(item.date).toLocaleString()}</small>`;
        
        li.addEventListener('click', async () => {
            await chrome.storage.local.set({ currentAnalysisId: item.id });
            chrome.windows.create({ url: 'results.html', type: 'popup', width: 800, height: 650 });
        });
        
        list.appendChild(li);
    });
});
