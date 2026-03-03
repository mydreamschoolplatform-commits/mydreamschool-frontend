/**
 * Compress and resize an image file using Modern ImageBitmap API.
 * 
 * TECHNIQUE EXPLANATION:
 * 1. createImageBitmap(file, { resizeWidth: ... }) is the "Gold Standard".
 *    It tells the browser to decode ONLY the pixels needed for the target size.
 *    It avoids ever having the full 12MP/48MP bitmap in memory.
 * 2. Fallback to Canvas for older browsers.
 * 
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width (default 1024px)
 * @param {number} quality - JPEG quality (0 to 1, default 0.7)
 * @returns {Promise<Blob>} - The compressed image blob
 */
export const compressImage = async (file, maxWidth = 800, quality = 0.7) => {
    if (!file) throw new Error("No file provided");

    try {
        // Strategy 1: Modern ImageBitmap (Best for Low RAM)
        if ('createImageBitmap' in window) {
            try {
                // Attempt to decode directly to target size
                const bitmap = await createImageBitmap(file, {
                    resizeWidth: maxWidth,
                    resizeQuality: 'medium'
                });

                // Draw bitmap to canvas (it's already resized!)
                const canvas = document.createElement('canvas');
                canvas.width = bitmap.width;
                canvas.height = bitmap.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);

                // Cleanup bitmap immediately
                bitmap.close();

                // Export
                return new Promise((resolve, reject) => {
                    canvas.toBlob(blob => {
                        if (blob) {
                            // Camera captures sometimes define file.name generic "image.jpg".
                            // We ensure a safe name and type.
                            const safeName = file.name || "camera_upload.jpg";
                            const safeType = file.type || "image/jpeg";
                            resolve(new File([blob], safeName, {
                                type: safeType,
                                lastModified: Date.now(),
                            }));
                        } else reject(new Error("Blob creation failed"));

                        // Cleanup
                        canvas.width = 0;
                        canvas.height = 0;
                    }, 'image/jpeg', quality);
                });
            } catch (bitmapError) {
                console.warn("ImageBitmap resize failed, falling back to manual canvas", bitmapError);
                // Fallthrough to standard canvas method
            }
        }

        // Strategy 2: Standard Canvas (Fallback)
        return new Promise((resolve, reject) => {
            const srcUrl = URL.createObjectURL(file);
            const img = new Image();
            img.src = srcUrl;

            img.onload = () => {
                URL.revokeObjectURL(srcUrl); // Critical cleanup

                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (blob) {
                        const safeName = file.name || "camera_upload.jpg";
                        const safeType = file.type || "image/jpeg";
                        resolve(new File([blob], safeName, {
                            type: safeType,
                            lastModified: Date.now(),
                        }));
                    } else reject(new Error("Compression failed"));

                    canvas.width = 0;
                    canvas.height = 0;
                }, 'image/jpeg', quality);
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(srcUrl);
                reject(err);
            };
        });

    } catch (err) {
        console.error("Critical compression error:", err);
        throw err;
    }
};
