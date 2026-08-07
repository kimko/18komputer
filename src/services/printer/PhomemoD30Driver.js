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
  const red = imageData[(canvas.width * y + x) * 4];
  const green = imageData[(canvas.width * y + x) * 4 + 1];
  const blue = imageData[(canvas.width * y + x) * 4 + 2];
  return red + green + blue > 0 ? 0 : 1;
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
  // We use a canvas where width is the length of the receipt and height is the 12mm width of the label (96 pixels)
  // This allows us to draw normally left-to-right.
  const LABEL_WIDTH_PX = 96;
  const LABEL_LENGTH_PX = Math.max(320, 150 + receiptData.trains.length * 50); 
  
  const drawCanvas = document.createElement("canvas");
  drawCanvas.width = LABEL_LENGTH_PX;
  drawCanvas.height = LABEL_WIDTH_PX;
  const drawCtx = drawCanvas.getContext("2d");

  // Fill background with white
  drawCtx.fillStyle = "#fff";
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);

  // Set font settings
  drawCtx.fillStyle = "#000";
  
  // Draw Company Name
  drawCtx.font = "bold 24px sans-serif";
  drawCtx.fillText(receiptData.company || "Company", 10, 30);
  
  // Draw Title
  drawCtx.font = "16px sans-serif";
  drawCtx.fillText("Operating Round", 10, 50);
  
  // Draw Line
  drawCtx.fillRect(10, 58, drawCanvas.width - 20, 2);

  // Draw Trains
  drawCtx.font = "14px monospace";
  let currentY = 75;
  
  if (receiptData.trains && receiptData.trains.length > 0) {
    receiptData.trains.forEach((train, index) => {
      drawCtx.fillText(`T${index + 1}: ${train.route}`, 10, currentY);
      drawCtx.fillText(`$${train.revenue}`, 200, currentY); // Aligned right-ish
      currentY += 20;
    });
  } else {
    drawCtx.fillText("No active trains.", 10, currentY);
    currentY += 20;
  }

  // Draw Line
  drawCtx.fillRect(10, currentY - 5, drawCanvas.width - 20, 2);
  currentY += 15;

  // Draw Total
  drawCtx.font = "bold 18px sans-serif";
  drawCtx.fillText("Total OR:", 10, currentY);
  drawCtx.fillText(`$${receiptData.totalRevenue}`, 200, currentY);

  // Now, create the actual Phomemo canvas (96 width, varying height)
  // We rotate the drawCanvas by 90 degrees clockwise so it prints correctly along the label strip
  const phomemoCanvas = document.createElement("canvas");
  phomemoCanvas.width = LABEL_WIDTH_PX;
  phomemoCanvas.height = LABEL_LENGTH_PX;
  const pCtx = phomemoCanvas.getContext("2d");
  
  pCtx.translate(phomemoCanvas.width / 2, phomemoCanvas.height / 2);
  pCtx.rotate(Math.PI / 2);
  pCtx.drawImage(drawCanvas, -drawCanvas.width / 2, -drawCanvas.height / 2);

  // Get raw raster bitmap
  const bitmapData = getPrintData(phomemoCanvas);

  // Wrap with headers
  const header = HEADER_DATA(phomemoCanvas.width / 8, bitmapData.length / (phomemoCanvas.width / 8));
  
  const finalPayload = new Uint8Array(header.length + bitmapData.length + END_DATA.length);
  finalPayload.set(header, 0);
  finalPayload.set(bitmapData, header.length);
  finalPayload.set(END_DATA, header.length + bitmapData.length);

  return finalPayload;
};
