// Plugin page boot.
//
// This lived as inline <script> in plugin/index.html, which the router never ran:
// it only lifts <main> out of a fetched page, so anything in the document body
// around it is dropped. Named here so the router can boot the panel, and so a
// direct hit on /plugin/ takes the same path.

window.initPluginPanel = function (root) {
    if (!root || root.dataset.booted) return;
    root.dataset.booted = '1';

    const version = root.querySelector('.download-version');
    if (version) {
        fetch('/guillotine/VERSION')
            .then(r => r.text())
            .then(v => { version.textContent = 'v' + v.trim(); })
            .catch(() => {});
    }

    // Only needed on a direct hit. Arriving through the router means the shell's
    // footer is already rendered.
    const footer = document.querySelector('.footer-content');
    if (footer && !footer.children.length) {
        fetch('content/site-config.json')
            .then(r => r.json())
            .then(config => {
                footer.innerHTML = FooterComponent.render(config);
                UIHelpers.updateCopyrightYear();
            })
            .catch(() => {});
    }
};
