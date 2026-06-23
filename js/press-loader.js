// Press page loader - renders the press kit (bio, band photos, live media)
document.addEventListener('DOMContentLoaded', async () => {
    HeaderComponent.init({ basePath: '/' });

    try {
        const [config, media, press] = await Promise.all([
            fetch('content/site-config.json').then(r => r.json()),
            fetch('content/media.json').then(r => r.json()),
            fetch('content/press.json').then(r => r.json())
        ]);

        const mount = document.getElementById('press');
        if (mount) mount.innerHTML = PressComponent.render(press, media);

        const footer = document.querySelector('.footer-content');
        if (footer && config) footer.innerHTML = FooterComponent.render(config);

        UIHelpers.updateCopyrightYear();
        if (window.ImageLoader) ImageLoader.init();
    } catch (err) {
        console.error('Failed to load press content:', err);
    }
});
