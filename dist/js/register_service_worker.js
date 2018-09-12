/*
* Register service worker for offline support
*/
window.registerServiceWorker = () => {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
        if (!navigator.serviceWorker.controller) {
            return;
        }
        console.log("SW registered");       
    });

}

document.addEventListener('DOMContentLoaded', (event) => {
    registerServiceWorker();
});