# Local Deployment Fix Notes

## Root cause of the original issue

Opening the original `index.html` using `file://` could display the UI but prevent the application from becoming interactive. The main reason was the use of browser ES modules:

```html
<script type="module" src="js/app.js"></script>
```

The JavaScript then imported other files:

```javascript
import { PROCESSES } from "./data.js";
import { modelScenario } from "./engine.js";
```

When opened through `file://`, browsers apply a stricter security model. ES module imports are treated as cross-origin requests from an opaque origin and may be blocked. When the module load fails, the event handlers are never registered, so dropdowns, sliders, navigation, charts, and simulation controls do not respond.

## Other local-environment constraints addressed

- Some enterprise browsers restrict or disable `localStorage` for local files.
- Some older browsers do not support `structuredClone`, `ResizeObserver`, `File.text`, or `HTMLFormElement.requestSubmit`.
- Relative paths are reliable under localhost but can become fragile when files are moved individually instead of keeping the full folder structure.

## Fix implemented

The application now ships with a bundled browser script:

```text
js/app.bundle.js
```

`index.html` loads it as a normal script:

```html
<script src="js/app.bundle.js"></script>
```

This avoids ES module imports and makes the app usable through both:

```text
file://
```

and:

```text
http://127.0.0.1
```

A fully embedded `standalone.html` is also included for maximum portability.

## Recommended deployment pattern

For casual testing, double-click `index.html` or `standalone.html`.

For workshops, demos, and executive presentations, use the local server:

```bash
python3 server.py --port 8080 --open
```

This is closer to the way the app would behave when hosted internally on DP World's network or on a secure cloud environment.
