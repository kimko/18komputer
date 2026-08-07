const HEADER_DATA = (mmWidth, bytes) =>
  new Uint8Array([
    0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00,
    mmWidth % 256,
    Math.floor(mmWidth / 256),
    bytes % 256,
    Math.floor(bytes / 256),
  ]);

const END_DATA = new Uint8Array([0x1b, 0x64, 0x00]);

const getWhitePixel = (canvas, imageData, x, y) => {
  const idx = (canvas.width * y + x) * 4;
  const red = imageData[idx];
  const green = imageData[idx + 1];
  const blue = imageData[idx + 2];
  const alpha = imageData[idx + 3];
  
  // If transparent, treat as white (don't burn)
  if (alpha < 128) return 0;
  
  // If pixel is darker than 50% gray (128*3 = 384), burn it (return 1)
  return (red + green + blue) < 384 ? 1 : 0;
};

const getPrintData = (canvas) => {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  const data = new Uint8Array((canvas.width / 8) * canvas.height + 8);
  let offset = 0;
  for (let i = 0; i < canvas.height; ++i) {
    for (let k = 0; k < canvas.width / 8; ++k) {
      const k8 = k * 8;
      data[offset++] =
        getWhitePixel(canvas, imageData, k8 + 0, i) * 128 +
        getWhitePixel(canvas, imageData, k8 + 1, i) * 64 +
        getWhitePixel(canvas, imageData, k8 + 2, i) * 32 +
        getWhitePixel(canvas, imageData, k8 + 3, i) * 16 +
        getWhitePixel(canvas, imageData, k8 + 4, i) * 8 +
        getWhitePixel(canvas, imageData, k8 + 5, i) * 4 +
        getWhitePixel(canvas, imageData, k8 + 6, i) * 2 +
        getWhitePixel(canvas, imageData, k8 + 7, i);
    }
  }
  return data;
};

/**
 * Generates the payload required to print a receipt on a Phomemo D30.
 * @param {Object} receiptData { company: string, trains: Array<{route: string, revenue: number}>, totalRevenue: number }
 * @returns {Uint8Array} The raw byte payload
 */
export const generatePhomemoPayload = async (receiptData) => {
  console.log(`[Phomemo Driver] Generating payload for company: ${receiptData.company || "Company"}`);
  
  // Prepare the text strings
  const companyStr = receiptData.company || "Company";
  const revenues = (receiptData.trains || []).map(t => t.revenue);
  const mathString = revenues.length > 0 
    ? `${revenues.join("+")}=${receiptData.totalRevenue}` 
    : `$${receiptData.totalRevenue}`;

  const fullText = `${companyStr} ${mathString}`;

  // Create a temporary canvas to measure text
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = "bold 24px sans-serif";
  const textWidth = tempCtx.measureText(fullText).width;

  // We use a canvas where width is the length of the receipt and height is the 12mm width of the label (96 pixels)
  // This allows us to draw normally left-to-right.
  const LABEL_WIDTH_PX = 96;
  const LABEL_LENGTH_PX = Math.max(150, Math.ceil(textWidth) + 40); 
  
  const drawCanvas = document.createElement("canvas");
  drawCanvas.width = LABEL_LENGTH_PX;
  drawCanvas.height = LABEL_WIDTH_PX;
  const drawCtx = drawCanvas.getContext("2d");

  // Fill background with white
  drawCtx.fillStyle = "#fff";
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // Set font settings
  drawCtx.fillStyle = "#000";
  
  // Draw Single Line Text
  drawCtx.font = "bold 24px sans-serif";
  drawCtx.fillText(fullText, 10, 45);

  // Now, create the actual Phomemo canvas (96 width, varying height)
  // We rotate the drawCanvas by 90 degrees clockwise so it prints correctly along the label strip
  const phomemoCanvas = document.createElement("canvas");
  phomemoCanvas.width = LABEL_WIDTH_PX;
  phomemoCanvas.height = LABEL_LENGTH_PX;
  const pCtx = phomemoCanvas.getContext("2d");
  
  pCtx.translate(phomemoCanvas.width / 2, phomemoCanvas.height / 2);
  pCtx.rotate(Math.PI / 2);
  pCtx.drawImage(drawCanvas, -drawCanvas.width / 2, -drawCanvas.height / 2);

  console.log(`[Phomemo Driver] Virtual canvas drawn and rotated. Dimensions: ${LABEL_WIDTH_PX}x${LABEL_LENGTH_PX}`);

  // Get raw raster bitmap
  const bitmapData = getPrintData(phomemoCanvas);
  console.log(`[Phomemo Driver] Bitmap encoded. Raw raster size: ${bitmapData.length} bytes`);

  // Wrap with headers
  const header = HEADER_DATA(phomemoCanvas.width / 8, bitmapData.length / (phomemoCanvas.width / 8));
  
  const finalPayload = new Uint8Array(header.length + bitmapData.length + END_DATA.length);
  finalPayload.set(header, 0);
  finalPayload.set(bitmapData, header.length);
  finalPayload.set(END_DATA, header.length + bitmapData.length);

  return finalPayload;
};

/**
 * Generates a test payload to calibrate two-line printing on 1.57" x 0.47" (40mm x 12mm) die-cut labels.
 * 1.57 inches at 203 DPI = ~318 pixels.
 * 0.47 inches at 203 DPI = ~96 pixels.
 */
export const generateTestPayload = async () => {
  const LABEL_WIDTH_PX = 96;
  const LABEL_LENGTH_PX = 318; 
  
  const drawCanvas = document.createElement("canvas");
  drawCanvas.width = LABEL_LENGTH_PX;
  drawCanvas.height = LABEL_WIDTH_PX;
  const drawCtx = drawCanvas.getContext("2d");

  // Fill background with white
  drawCtx.fillStyle = "#fff";
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // Set font settings
  drawCtx.fillStyle = "#000";
  
  // Draw Line 1 (Top half)
  drawCtx.font = "bold 24px sans-serif";
  drawCtx.fillText("abcdefg", 10, 40);

  // Draw Line 2 (Bottom half)
  drawCtx.font = "bold 24px sans-serif";
  drawCtx.fillText("1234567", 10, 80);

  // Rotate canvas for printer
  const phomemoCanvas = document.createElement("canvas");
  phomemoCanvas.width = LABEL_WIDTH_PX;
  phomemoCanvas.height = LABEL_LENGTH_PX;
  const pCtx = phomemoCanvas.getContext("2d");
  
  pCtx.translate(phomemoCanvas.width / 2, phomemoCanvas.height / 2);
  pCtx.rotate(Math.PI / 2);
  pCtx.drawImage(drawCanvas, -drawCanvas.width / 2, -drawCanvas.height / 2);

  // Encode
  const bitmapData = getPrintData(phomemoCanvas);
  const header = HEADER_DATA(phomemoCanvas.width / 8, bitmapData.length / (phomemoCanvas.width / 8));
  
  const finalPayload = new Uint8Array(header.length + bitmapData.length + END_DATA.length);
  finalPayload.set(header, 0);
  finalPayload.set(bitmapData, header.length);
  finalPayload.set(END_DATA, header.length + bitmapData.length);

  return finalPayload;
};
