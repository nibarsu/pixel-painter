const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const gridSizeSelect = document.getElementById("gridSizeSelect");
const colorPicker = document.getElementById("colorPicker");
const imageInput = document.getElementById("imageInput");
const randomAnimalBtn = document.getElementById("randomAnimalBtn");
const framesInput = document.getElementById("framesInput");
const sampleCards = document.querySelectorAll(".sampleCard");
const stepsGrid = document.getElementById("stepsGrid");
const stepsPlaceholder = document.getElementById("stepsPlaceholder");
const addFrameBtn = document.getElementById("addFrameBtn");
const playMyFramesBtn = document.getElementById("playMyFramesBtn");
const deleteLastFrameBtn = document.getElementById("deleteLastFrameBtn");
const clearMyFramesBtn = document.getElementById("clearMyFramesBtn");
const myFramesInfo = document.getElementById("myFramesInfo");
const myFramesGrid = document.getElementById("myFramesGrid");
const myFramesPlaceholder = document.getElementById("myFramesPlaceholder");
const imagePreview = document.getElementById("imagePreview");
const previewText = document.getElementById("previewText");
const animationCanvas = document.getElementById("animationCanvas");
const animationCtx = animationCanvas.getContext("2d");
const animationText = document.getElementById("animationText");
const prevFrameBtn = document.getElementById("prevFrameBtn");
const playBtn = document.getElementById("playBtn");
const nextFrameBtn = document.getElementById("nextFrameBtn");
const speedRange = document.getElementById("speedRange");
const frameInfo = document.getElementById("frameInfo");
const pencilBtn = document.getElementById("pencilBtn");
const fillBtn = document.getElementById("fillBtn");
const eraserBtn = document.getElementById("eraserBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");

// 統一關閉 canvas 2D 的平滑插值，避免縮放圖片時出現模糊邊緣。
function disableCanvasSmoothing(context) {
  context.imageSmoothingEnabled = false;
  context.webkitImageSmoothingEnabled = false;
  context.mozImageSmoothingEnabled = false;
  context.msImageSmoothingEnabled = false;
}

let gridSize = Number(gridSizeSelect.value);
let cellSize = canvas.width / gridSize;

let currentColor = colorPicker.value;
let currentTool = "pencil";
let isDrawing = false;
let pixels = [];
let animationFrames = [];
let currentFrameIndex = 0;
let isPlayingAnimation = false;
let animationTimer = null;
let myAnimationFrameSources = [];
let currentPreviewObjectUrl = null;

// 使用內建像素動物圖，確保來源本身就是像素風格，不是照片轉換而來。
const pixelAnimalSources = [
  "samples/animals/pixel-cat.svg",
  "samples/animals/pixel-dog.svg",
  "samples/animals/pixel-fox.svg"
];

disableCanvasSmoothing(ctx);
disableCanvasSmoothing(animationCtx);

const drawingStepsMap = {
  star: [
    { src: "samples/steps/star-step-1.svg", label: "步驟 1：畫出星星外形" },
    { src: "samples/steps/star-step-2.svg", label: "步驟 2：補上邊線" },
    { src: "samples/steps/star-step-3.svg", label: "步驟 3：加上表情" },
    { src: "samples/steps/star-step-4.svg", label: "步驟 4：填入顏色" }
  ],
  heart: [
    { src: "samples/steps/heart-step-1.svg", label: "步驟 1：畫出愛心輪廓" },
    { src: "samples/steps/heart-step-2.svg", label: "步驟 2：補上邊線" },
    { src: "samples/steps/heart-step-3.svg", label: "步驟 3：加上表情" },
    { src: "samples/steps/heart-step-4.svg", label: "步驟 4：填入顏色" }
  ],
  cat: [
    { src: "samples/steps/cat-step-1.svg", label: "步驟 1：畫出貓咪頭部" },
    { src: "samples/steps/cat-step-2.svg", label: "步驟 2：補上耳朵" },
    { src: "samples/steps/cat-step-3.svg", label: "步驟 3：畫出五官" },
    { src: "samples/steps/cat-step-4.svg", label: "步驟 4：填入顏色" }
  ],
  flower: [
    { src: "samples/steps/flower-step-1.svg", label: "步驟 1：畫出花心" },
    { src: "samples/steps/flower-step-2.svg", label: "步驟 2：補上花瓣" },
    { src: "samples/steps/flower-step-3.svg", label: "步驟 3：畫出莖葉" },
    { src: "samples/steps/flower-step-4.svg", label: "步驟 4：填入顏色" }
  ],
  rocket: [
    { src: "samples/steps/rocket-step-1.svg", label: "步驟 1：畫出火箭主體" },
    { src: "samples/steps/rocket-step-2.svg", label: "步驟 2：補上側翼" },
    { src: "samples/steps/rocket-step-3.svg", label: "步驟 3：加上窗戶" },
    { src: "samples/steps/rocket-step-4.svg", label: "步驟 4：填入顏色" }
  ]
};

// 依照目前格數重新計算每個像素格的寬高。
function updateCellSize() {
  cellSize = canvas.width / gridSize;
}

// 建立新的像素資料陣列，預設全部填成白色背景。
function createPixels() {
  pixels = [];

  for (let y = 0; y < gridSize; y++) {
    const row = [];

    for (let x = 0; x < gridSize; x++) {
      row.push("#ffffff");
    }

    pixels.push(row);
  }
}

// 依照像素資料重畫整個畫布，並顯示格線方便編輯。
function drawCanvas() {
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      ctx.fillStyle = pixels[y][x];
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

      ctx.strokeStyle = "#d9d9d9";
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }
}

// 把滑鼠在畫布上的位置換算成實際格子座標。
function getCellPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  const x = Math.floor(mouseX / cellSize);
  const y = Math.floor(mouseY / cellSize);

  return { x, y };
}

// 在指定格子上色，若目前工具是橡皮擦則清成白色。
function paintCell(event) {
  const { x, y } = getCellPosition(event);

  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return;
  }

  pixels[y][x] = currentTool === "eraser" ? "#ffffff" : currentColor;
  drawCanvas();
}

// 更新工具按鈕外觀，讓使用者知道目前選中的工具。
function updateToolButtons() {
  pencilBtn.classList.toggle("active", currentTool === "pencil");
  fillBtn.classList.toggle("active", currentTool === "fill");
  eraserBtn.classList.toggle("active", currentTool === "eraser");
}

// 更新右側圖片預覽區塊。
function updateImagePreview(imageSource) {
  imagePreview.src = imageSource;
  imagePreview.style.display = "block";
  previewText.style.display = "none";
}

// 釋放上一張暫存的 Blob URL，避免重複抓圖時累積記憶體。
function revokePreviewObjectUrl() {
  if (!currentPreviewObjectUrl) {
    return;
  }

  URL.revokeObjectURL(currentPreviewObjectUrl);
  currentPreviewObjectUrl = null;
}

// 依照目前像素內容輸出 PNG Data URL，方便下載與建立動畫影格。
function createArtworkDataUrl() {
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");

  exportCanvas.width = gridSize;
  exportCanvas.height = gridSize;
  disableCanvasSmoothing(exportCtx);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      exportCtx.fillStyle = pixels[y][x];
      exportCtx.fillRect(x, y, 1, 1);
    }
  }

  return exportCanvas.toDataURL("image/png");
}

// 顯示指定範例的逐步教學圖片。
function renderDrawingSteps(sampleId) {
  const steps = drawingStepsMap[sampleId];

  stepsGrid.innerHTML = "";

  if (!steps || steps.length === 0) {
    stepsGrid.appendChild(stepsPlaceholder);
    stepsPlaceholder.textContent = "這個範例目前沒有教學步驟。";
    return;
  }

  steps.forEach(function (step) {
    const stepCard = document.createElement("div");
    const stepImage = document.createElement("img");
    const stepLabel = document.createElement("p");

    stepCard.className = "stepCard";
    stepImage.src = step.src;
    stepImage.alt = step.label;
    stepLabel.textContent = step.label;

    stepCard.appendChild(stepImage);
    stepCard.appendChild(stepLabel);
    stepsGrid.appendChild(stepCard);
  });
}

// 渲染「我的動畫影格」清單。
function renderMyAnimationFrames() {
  myFramesGrid.innerHTML = "";

  if (myAnimationFrameSources.length === 0) {
    myFramesGrid.appendChild(myFramesPlaceholder);
    myFramesPlaceholder.textContent = "請先把畫好的內容加入影格清單。";
    myFramesInfo.textContent = "目前還沒有加入任何影格。";
    return;
  }

  myFramesInfo.textContent = "目前已加入 " + myAnimationFrameSources.length + " 張影格。";

  myAnimationFrameSources.forEach(function (frameSource, index) {
    const frameCard = document.createElement("div");
    const frameImage = document.createElement("img");
    const frameLabel = document.createElement("p");

    frameCard.className = "stepCard";
    frameImage.className = "frameThumb";
    frameImage.src = frameSource;
    frameImage.alt = "我的影格 " + (index + 1);
    frameLabel.textContent = "影格 " + (index + 1);

    frameCard.appendChild(frameImage);
    frameCard.appendChild(frameLabel);
    myFramesGrid.appendChild(frameCard);
  });
}

// 更新動畫播放區的文字狀態。
function updateAnimationStatus() {
  if (animationFrames.length === 0) {
    frameInfo.textContent = "目前沒有影格。";
    playBtn.textContent = "播放";
    animationText.style.display = "block";
    return;
  }

  frameInfo.textContent = "第 " + (currentFrameIndex + 1) + " 張，共 " + animationFrames.length + " 張";
  playBtn.textContent = isPlayingAnimation ? "暫停" : "播放";
  animationText.style.display = "none";
}

// 在動畫預覽畫布上繪製指定影格。
function drawAnimationFrame(frameIndex) {
  if (animationFrames.length === 0) {
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    updateAnimationStatus();
    return;
  }

  currentFrameIndex = frameIndex;

  if (currentFrameIndex < 0) {
    currentFrameIndex = animationFrames.length - 1;
  }

  if (currentFrameIndex >= animationFrames.length) {
    currentFrameIndex = 0;
  }

  const currentFrame = animationFrames[currentFrameIndex];

  animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
  animationCtx.drawImage(currentFrame, 0, 0, animationCanvas.width, animationCanvas.height);
  updateAnimationStatus();
}

// 停止目前的動畫播放計時器。
function stopAnimationPlayback() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }

  isPlayingAnimation = false;
  updateAnimationStatus();
}

// 依照目前速度設定開始循環播放動畫。
function startAnimationPlayback() {
  if (animationFrames.length === 0) {
    return;
  }

  stopAnimationPlayback();
  isPlayingAnimation = true;

  const framesPerSecond = Number(speedRange.value);
  const delay = 1000 / framesPerSecond;

  animationTimer = setInterval(function () {
    drawAnimationFrame(currentFrameIndex + 1);
  }, delay);

  updateAnimationStatus();
}

// 切換播放與暫停狀態。
function toggleAnimationPlayback() {
  if (isPlayingAnimation) {
    stopAnimationPlayback();
  } else {
    startAnimationPlayback();
  }
}

// 當使用者切換畫布尺寸時，保留原有圖案並重新縮放到新格數。
function resizePixels(newGridSize) {
  const oldGridSize = gridSize;
  const oldPixels = pixels;
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = oldGridSize;
  tempCanvas.height = oldGridSize;
  disableCanvasSmoothing(tempCtx);

  for (let y = 0; y < oldGridSize; y++) {
    for (let x = 0; x < oldGridSize; x++) {
      tempCtx.fillStyle = oldPixels[y][x];
      tempCtx.fillRect(x, y, 1, 1);
    }
  }

  gridSize = newGridSize;
  updateCellSize();
  createPixels();

  const scaledCanvas = document.createElement("canvas");
  const scaledCtx = scaledCanvas.getContext("2d");

  scaledCanvas.width = gridSize;
  scaledCanvas.height = gridSize;
  disableCanvasSmoothing(scaledCtx);
  scaledCtx.drawImage(tempCanvas, 0, 0, oldGridSize, oldGridSize, 0, 0, gridSize, gridSize);

  const imageData = scaledCtx.getImageData(0, 0, gridSize, gridSize).data;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const index = (y * gridSize + x) * 4;
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];

      pixels[y][x] = rgbToHex(red, green, blue);
    }
  }

  drawCanvas();
}

// 把 0 到 255 的數字轉成兩位數十六進位字串。
function toHex(number) {
  return number.toString(16).padStart(2, "0");
}

// 將 RGB 數值組合成十六進位色碼。
function rgbToHex(red, green, blue) {
  return "#" + toHex(red) + toHex(green) + toHex(blue);
}

// 用簡單的 flood fill 演算法填滿相鄰同色區塊。
function fillArea(startX, startY) {
  const targetColor = pixels[startY][startX];
  const fillColor = currentColor;

  if (targetColor === fillColor) {
    return;
  }

  const cellsToCheck = [{ x: startX, y: startY }];

  while (cellsToCheck.length > 0) {
    const currentCell = cellsToCheck.pop();
    const x = currentCell.x;
    const y = currentCell.y;

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
      continue;
    }

    if (pixels[y][x] !== targetColor) {
      continue;
    }

    pixels[y][x] = fillColor;

    cellsToCheck.push({ x: x + 1, y: y });
    cellsToCheck.push({ x: x - 1, y: y });
    cellsToCheck.push({ x: x, y: y + 1 });
    cellsToCheck.push({ x: x, y: y - 1 });
  }
}

// 將匯入圖片縮到目前格數，並讀取成像素顏色資料。
function convertImageToPixelArt(image) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = gridSize;
  tempCanvas.height = gridSize;
  disableCanvasSmoothing(tempCtx);

  tempCtx.clearRect(0, 0, gridSize, gridSize);
  tempCtx.drawImage(image, 0, 0, gridSize, gridSize);

  const imageData = tempCtx.getImageData(0, 0, gridSize, gridSize).data;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const index = (y * gridSize + x) * 4;
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const alpha = imageData[index + 3];

      if (alpha === 0) {
        pixels[y][x] = "#ffffff";
      } else {
        pixels[y][x] = rgbToHex(red, green, blue);
      }
    }
  }

  drawCanvas();
}

// 載入圖片並立刻套用到畫布，方便直接接著手動修改。
function useImageForPainting(imageSource) {
  const image = new Image();

  image.addEventListener("load", function () {
    createPixels();
    convertImageToPixelArt(image);
    updateImagePreview(imageSource);
    currentTool = "pencil";
    updateToolButtons();
  });

  image.src = imageSource;
}

// 從內建素材中隨機挑一張像素動物圖。
function getRandomPixelAnimalSource() {
  const randomIndex = Math.floor(Math.random() * pixelAnimalSources.length);
  return pixelAnimalSources[randomIndex];
}

// 載入內建像素動物圖，保留現有的畫布編輯流程。
async function loadRandomOnlinePixelImage(loadingText) {
  const imageUrl = getRandomPixelAnimalSource();

  previewText.textContent = loadingText;
  previewText.style.display = "block";
  imagePreview.style.display = "none";

  revokePreviewObjectUrl();
  useImageForPainting(imageUrl);
}

// 將目前畫布下載成 PNG 檔案。
function saveArtwork() {
  const downloadLink = document.createElement("a");
  const timeText = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  downloadLink.href = createArtworkDataUrl();
  downloadLink.download = "pixel-art-" + gridSize + "x" + gridSize + "-" + timeText + ".png";
  downloadLink.click();
}

// 從網址或 Data URL 載入圖片，供動畫預覽使用。
function loadImageFromSource(imageSource) {
  return new Promise(function (resolve, reject) {
    const image = new Image();

    image.addEventListener("load", function () {
      resolve(image);
    });

    image.addEventListener("error", function () {
      reject(new Error("圖片載入失敗。"));
    });

    image.src = imageSource;
  });
}

// 從使用者選取的檔案讀取單張影格圖片。
function loadFrameImage(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.addEventListener("load", function () {
      const image = new Image();

      image.addEventListener("load", function () {
        resolve(image);
      });

      image.addEventListener("error", function () {
        reject(new Error("影格圖片載入失敗。"));
      });

      image.src = reader.result;
    });

    reader.addEventListener("error", function () {
      reject(new Error("無法讀取影格檔案。"));
    });

    reader.readAsDataURL(file);
  });
}

// 載入整個資料夾中的圖片，並依檔名排序成動畫影格。
async function loadAnimationFrames(files) {
  stopAnimationPlayback();
  animationFrames = [];
  currentFrameIndex = 0;
  animationText.textContent = "正在載入影格中...";
  animationText.style.display = "block";
  frameInfo.textContent = "正在準備動畫。";

  const imageFiles = Array.from(files).filter(function (file) {
    return file.type.startsWith("image/");
  });

  imageFiles.sort(function (fileA, fileB) {
    return fileA.name.localeCompare(fileB.name, undefined, { numeric: true });
  });

  if (imageFiles.length === 0) {
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "這個資料夾裡沒有可用的圖片檔案。";
    updateAnimationStatus();
    return;
  }

  const loadedFrames = await Promise.all(
    imageFiles.map(function (file) {
      return loadFrameImage(file);
    })
  );

  animationFrames = loadedFrames;
  animationText.textContent = "影格已載入完成。";
  drawAnimationFrame(0);
}

// 用既有的影格來源清單建立動畫。
async function loadFrameSources(frameSources) {
  stopAnimationPlayback();
  animationFrames = [];
  currentFrameIndex = 0;
  animationText.textContent = "正在載入影格中...";
  animationText.style.display = "block";
  frameInfo.textContent = "正在準備動畫。";

  const loadedFrames = await Promise.all(
    frameSources.map(function (frameSource) {
      return loadImageFromSource(frameSource);
    })
  );

  animationFrames = loadedFrames;
  animationText.textContent = "影格已載入完成。";
  drawAnimationFrame(0);
}

// 載入使用者自行建立的影格清單。
async function loadMyAnimationFrames() {
  if (myAnimationFrameSources.length === 0) {
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "請先加入至少一張影格。";
    animationText.style.display = "block";
    frameInfo.textContent = "目前沒有可播放的影格。";
    stopAnimationPlayback();
    return;
  }

  await loadFrameSources(myAnimationFrameSources);
}

canvas.addEventListener("mousedown", function (event) {
  const { x, y } = getCellPosition(event);

  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return;
  }

  if (currentTool === "fill") {
    fillArea(x, y);
    drawCanvas();
    isDrawing = false;
    return;
  }

  isDrawing = true;
  paintCell(event);
});

canvas.addEventListener("mousemove", function (event) {
  if (!isDrawing) {
    return;
  }

  paintCell(event);
});

canvas.addEventListener("mouseup", function () {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", function () {
  isDrawing = false;
});

document.addEventListener("mouseup", function () {
  isDrawing = false;
});

colorPicker.addEventListener("input", function () {
  currentColor = colorPicker.value;
  currentTool = "pencil";
  updateToolButtons();
});

pencilBtn.addEventListener("click", function () {
  currentTool = "pencil";
  updateToolButtons();
});

fillBtn.addEventListener("click", function () {
  currentTool = "fill";
  updateToolButtons();
});

eraserBtn.addEventListener("click", function () {
  currentTool = "eraser";
  updateToolButtons();
});

clearBtn.addEventListener("click", function () {
  createPixels();
  drawCanvas();
});

saveBtn.addEventListener("click", function () {
  saveArtwork();
});

randomAnimalBtn.addEventListener("click", async function () {
  try {
    await loadRandomOnlinePixelImage("正在載入隨機像素動物圖...");
  } catch (error) {
    previewText.textContent = "載入像素動物圖時發生錯誤，請稍後再試。";
    previewText.style.display = "block";
    imagePreview.style.display = "none";
  }
});

addFrameBtn.addEventListener("click", function () {
  myAnimationFrameSources.push(createArtworkDataUrl());
  renderMyAnimationFrames();
});

playMyFramesBtn.addEventListener("click", async function () {
  try {
    await loadMyAnimationFrames();
  } catch (error) {
    stopAnimationPlayback();
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "載入我的影格時發生錯誤。";
    animationText.style.display = "block";
    frameInfo.textContent = "影格載入失敗。";
  }
});

deleteLastFrameBtn.addEventListener("click", function () {
  if (myAnimationFrameSources.length === 0) {
    return;
  }

  myAnimationFrameSources.pop();
  renderMyAnimationFrames();
});

clearMyFramesBtn.addEventListener("click", function () {
  myAnimationFrameSources = [];
  renderMyAnimationFrames();
});

playBtn.addEventListener("click", function () {
  toggleAnimationPlayback();
});

prevFrameBtn.addEventListener("click", function () {
  if (animationFrames.length === 0) {
    return;
  }

  stopAnimationPlayback();
  drawAnimationFrame(currentFrameIndex - 1);
});

nextFrameBtn.addEventListener("click", function () {
  if (animationFrames.length === 0) {
    return;
  }

  stopAnimationPlayback();
  drawAnimationFrame(currentFrameIndex + 1);
});

speedRange.addEventListener("input", function () {
  if (isPlayingAnimation) {
    startAnimationPlayback();
  } else {
    updateAnimationStatus();
  }
});

gridSizeSelect.addEventListener("change", function () {
  const newGridSize = Number(gridSizeSelect.value);
  resizePixels(newGridSize);
});

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", function () {
    useImageForPainting(reader.result);
  });

  reader.readAsDataURL(file);
});

sampleCards.forEach(function (sampleCard) {
  sampleCard.addEventListener("click", function () {
    const sampleId = sampleCard.dataset.sampleId;
    const sampleSource = sampleCard.dataset.sampleSrc;
    renderDrawingSteps(sampleId);
    useImageForPainting(sampleSource);
  });
});

framesInput.addEventListener("change", async function () {
  try {
    await loadAnimationFrames(framesInput.files);
  } catch (error) {
    stopAnimationPlayback();
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "載入動畫影格時發生錯誤。";
    animationText.style.display = "block";
    frameInfo.textContent = "影格載入失敗。";
  }
});

createPixels();
updateCellSize();
updateToolButtons();
updateAnimationStatus();
renderMyAnimationFrames();
drawCanvas();
