/**
 * iOS WebKit Blob Life-Cycle Manager
 * 
 * Prevents 0KB downloads on iOS by maintaining strong references to Blobs
 * and delaying ObjectURL revocation until after the system prompt interaction.
 */

// Global registry to hold strong references to Blobs
// This prevents the Garbage Collector from sweeping the Blob while the OS prompt is open.
const blobRegistry: Set<Blob> = new Set();

export function triggerSecureDownload(blob: Blob, filename: string): void {
    // 1. iOS Detection (User Agent check)
    // We increase the timeout significantly for iOS devices to account for the
    // "Do you want to download?" system prompt which blocks the main thread/lifecycle.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // 2. Reference Retention
    // Add to global registry to prevent Garbage Collection during the prompt
    blobRegistry.add(blob);

    // 3. Create Object URL
    const url = URL.createObjectURL(blob);

    // 4. DOM Manipulation
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';

    // Required for Firefox/iOS to ensure the click registers
    document.body.appendChild(anchor);

    // Trigger the prompt
    // On iOS, this pauses JS execution until the user interacts with the prompt (sometimes),
    // or simply opens the prompt overlay.
    anchor.click();

    // Remove from DOM immediately to keep page clean. 
    // The Object URL is still valid.
    document.body.removeChild(anchor);

    // 5. Extended Lifespan Logic
    // iOS requires a much longer timeout because the Object URL must remain valid
    // until the user actually clicks "Download" on the system prompt.
    // Standard browsers are fine with small timeouts, but iOS needs time.
    // We use 60 seconds minimum.
    const revocationTimeout = isIOS ? 120000 : 60000; // 2 minutes for iOS, 1 min for others

    setTimeout(() => {
        URL.revokeObjectURL(url);
        blobRegistry.delete(blob); // Release strong reference
        console.debug(`[SecureDownload] Cleaned up blob for ${filename} (${blob.size} bytes)`);
    }, revocationTimeout);
}
