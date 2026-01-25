# Updating the Plugin UI

The plugin UI is pulled from the [guillotine repo](https://github.com/noahbaxter/guillotine) as a git submodule (sparse checkout of `web/` only).

## Update to latest version

```bash
# From repo root
git submodule update --remote guillotine
git add guillotine
git commit -m "update guillotine UI submodule"
```

## How it works

- `demo.html` fetches the UI from `../guillotine/web/index.html`
- Injects `GUILLOTINE_DEFAULTS` and `<base href>` before loading via srcdoc
- The `DEMO_CONFIG` object in demo.html controls initial parameter values
- Version number is read from `../guillotine/VERSION`
