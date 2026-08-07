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

const LABEL_WIDTH_PX = 96;
const LABEL_LENGTH_PX = 318; 

const createPayloadFromCanvas = (drawCanvas) => {
  const phomemoCanvas = document.createElement("canvas");
  phomemoCanvas.width = LABEL_WIDTH_PX;
  phomemoCanvas.height = LABEL_LENGTH_PX;
  const pCtx = phomemoCanvas.getContext("2d");
  
  pCtx.translate(phomemoCanvas.width / 2, phomemoCanvas.height / 2);
  pCtx.rotate(Math.PI / 2);
  pCtx.drawImage(drawCanvas, -drawCanvas.width / 2, -drawCanvas.height / 2);

  const bitmapData = getPrintData(phomemoCanvas);
  const header = HEADER_DATA(phomemoCanvas.width / 8, bitmapData.length / (phomemoCanvas.width / 8));
  
  const finalPayload = new Uint8Array(header.length + bitmapData.length + END_DATA.length);
  finalPayload.set(header, 0);
  finalPayload.set(bitmapData, header.length);
  finalPayload.set(END_DATA, header.length + bitmapData.length);

  return finalPayload;
};

const createBaseCanvas = (drawBorder = false) => {
  const c = document.createElement("canvas");
  c.width = LABEL_LENGTH_PX;
  c.height = LABEL_WIDTH_PX;
  const ctx = c.getContext("2d");
  
  // Fill background with white
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  
  if (drawBorder) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);
  }
  
  ctx.fillStyle = "#000";
  return { c, ctx };
};

/**
 * Generates the payload required to print a receipt on a Phomemo D30.
 * Will paginate into multiple payloads if the text exceeds 4 rows.
 * @param {Object} receiptData { company: string, trains: Array<{route: string, revenue: number}>, totalRevenue: number }
 * @returns {Uint8Array[]} Array of raw byte payloads
 */
export const generatePhomemoPayload = async (receiptData) => {
  console.log(`[Phomemo Driver] Generating payload for company: ${receiptData.company || "Company"}`);
  
  const companyStr = receiptData.company || "Company";
  const trains = receiptData.trains || [];
  
  // 1. Generate all logical lines
  const lines = [];
  if (trains.length === 0) {
    lines.push(`${companyStr} $${receiptData.totalRevenue || 0}`);
  } else {
    trains.forEach((t, i) => {
      // Parse stops
      const tokens = (t.route || "").split('+').map(x => x.trim()).filter(Boolean);
      let standardStops = 0;
      let hasBonus = false;
      
      tokens.forEach(token => {
        if (/^\d+$/.test(token)) {
          standardStops++;
        } else {
          hasBonus = true;
        }
      });
      
      const trainDesc = tokens.length > 0 
        ? (hasBonus ? `${standardStops}s+` : `${standardStops}s`)
        : `T${i+1}`;
        
      const prefix = i === 0 
        ? `${companyStr} ${trainDesc} $${t.revenue} ` 
        : `${trainDesc} $${t.revenue} `;
      
      const routeStr = (t.route || "").replace(/\s+/g, ""); // remove spaces around +
      let fullStr = prefix + routeStr;
      
      // Strict 26-character wrapping
      while (fullStr.length > 0) {
        lines.push(fullStr.substring(0, 26));
        fullStr = fullStr.substring(26);
        if (fullStr.length > 0) {
           // Indent wrapped overflow math by 2 spaces for readability
           fullStr = "  " + fullStr; 
        }
      }
    });

    // Append final summary line
    lines.push(`$${receiptData.totalRevenue} - ${trains.length} trains`);
  }

  // 2. Chunk into blocks of 4 for pagination
  const payloads = [];
  for (let i = 0; i < lines.length; i += 4) {
    const chunk = lines.slice(i, i + 4);
    
    // Create the 318x96 canvas
    const { c, ctx } = createBaseCanvas(false); 
    ctx.font = "bold 20px monospace";
    
    // Draw the 4 rows (Y = 20, 45, 70, 95)
    chunk.forEach((line, rowIndex) => {
      const yPos = 20 + (rowIndex * 25);
      ctx.fillText(line, 5, yPos);
    });
    
    payloads.push(createPayloadFromCanvas(c));
  }

  return payloads;
};


