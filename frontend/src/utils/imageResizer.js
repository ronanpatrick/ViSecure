// frontend/src/utils/imageResizer.js

/**
 * Resizes a Base64 image string to a smaller size.
 */
export const resizeBase64 = (base64Str, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    
    img.onload = () => {
      // 1. Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      // 2. Draw to Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Return compressed Base64
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};