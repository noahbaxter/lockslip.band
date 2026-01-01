// JUCE WebView Bridge - DEMO MODE (no actual JUCE backend)
// Mocks all JUCE functionality for standalone web demo

// Local parameter storage with default values
const parameterValues = {
    inputGain: 0.5,      // 0 dB (center of -24 to +24)
    outputGain: 0.5,     // 0 dB
    ceiling: 0.0,        // 0 dB threshold
    curve: 0.0,          // Hard clip
    curveExponent: 0.25, // Default exponent
    oversampling: 0.0,   // 1x
    filterType: 0.0,
    channelMode: 0.0,
    stereoLink: 1.0,
    deltaMonitor: 0.0,
    bypassClipper: 1.0,  // Start bypassed
    enforceCeiling: 1.0
};

// Callback storage
const parameterCallbacks = {};

// Set a parameter value (normalized 0-1)
export function setParameterNormalized(id, normalizedValue) {
    if (id in parameterValues) {
        parameterValues[id] = normalizedValue;
        // Trigger callbacks
        if (parameterCallbacks[id]) {
            parameterCallbacks[id].forEach(cb => cb(normalizedValue));
        }
    }
}

// Get current parameter value (normalized 0-1)
export function getParameterNormalized(id) {
    return parameterValues[id] ?? 0;
}

// Get slider state properties (mock)
export function getParameterProperties(id) {
    return { start: 0, end: 1, interval: 0.001 };
}

// Listen for parameter changes
export function onParameterChange(id, callback) {
    if (!parameterCallbacks[id]) {
        parameterCallbacks[id] = [];
    }
    parameterCallbacks[id].push(callback);
}

// Notify slider drag started (no-op in demo)
export function parameterDragStarted(id) {}

// Notify slider drag ended (no-op in demo)
export function parameterDragEnded(id) {}

// Register a global callback function
export function registerCallback(name, callback) {
    window[name] = callback;
}

// Delta monitor helpers
export function setDeltaMonitor(enabled) {
    setParameterNormalized('deltaMonitor', enabled ? 1.0 : 0.0);
}

export function getDeltaMonitor() {
    return parameterValues.deltaMonitor > 0.5;
}

export function onDeltaMonitorChange(callback) {
    onParameterChange('deltaMonitor', (val) => callback(val > 0.5));
}

// Bypass clipper helpers
export function setBypassClipper(enabled) {
    setParameterNormalized('bypassClipper', enabled ? 1.0 : 0.0);
}

export function getBypassClipper() {
    return parameterValues.bypassClipper > 0.5;
}

export function onBypassClipperChange(callback) {
    onParameterChange('bypassClipper', (val) => callback(val > 0.5));
}

// Enforce ceiling helpers
export function setEnforceCeiling(enabled) {
    setParameterNormalized('enforceCeiling', enabled ? 1.0 : 0.0);
}

export function getEnforceCeiling() {
    return parameterValues.enforceCeiling > 0.5;
}

export function onEnforceCeilingChange(callback) {
    onParameterChange('enforceCeiling', (val) => callback(val > 0.5));
}

// Mock Juce object for any direct access
export const Juce = {
    getSliderState: () => null,
    getBackendResourceAddress: () => ''
};
