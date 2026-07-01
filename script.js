const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const gridSizeSelect = document.getElementById("gridSizeSelect");
const colorPicker = document.getElementById("colorPicker");
const imageInput = document.getElementById("imageInput");
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

const drawingStepsMap = {
  star: [
    { src: "samples/steps/star-step-1.svg", label: "Step 1: Draw the star shape" },
    { src: "samples/steps/star-step-2.svg", label: "Step 2: Add the outline" },
    { src: "samples/steps/star-step-3.svg", label: "Step 3: Draw the face" },
    { src: "samples/steps/star-step-4.svg", label: "Step 4: Fill the colors" }
  ],
  heart: [
    { src: "samples/steps/heart-step-1.svg", label: "Step 1: Draw the heart" },
    { src: "samples/steps/heart-step-2.svg", label: "Step 2: Add the outline" },
    { src: "samples/steps/heart-step-3.svg", label: "Step 3: Draw the face" },
    { src: "samples/steps/heart-step-4.svg", label: "Step 4: Fill the colors" }
  ],
  cat: [
    { src: "samples/steps/cat-step-1.svg", label: "Step 1: Draw the head" },
    { src: "samples/steps/cat-step-2.svg", label: "Step 2: Add the ears" },
    { src: "samples/steps/cat-step-3.svg", label: "Step 3: Draw the face" },
    { src: "samples/steps/cat-step-4.svg", label: "Step 4: Fill the colors" }
  ],
  flower: [
    { src: "samples/steps/flower-step-1.svg", label: "Step 1: Draw the center" },
    { src: "samples/steps/flower-step-2.svg", label: "Step 2: Add petals" },
    { src: "samples/steps/flower-step-3.svg", label: "Step 3: Draw the stem" },
    { src: "samples/steps/flower-step-4.svg", label: "Step 4: Fill the colors" }
  ],
  rocket: [
    { src: "samples/steps/rocket-step-1.svg", label: "Step 1: Draw the body" },
    { src: "samples/steps/rocket-step-2.svg", label: "Step 2: Add fins" },
    { src: "samples/steps/rocket-step-3.svg", label: "Step 3: Add the window" },
    { src: "samples/steps/rocket-step-4.svg", label: "Step 4: Fill the colors" }
  ]
};

// 依照目前選到的畫布大小，更新每一格的寬高。
function updateCellSize() {
  cellSize = canvas.width / gridSize;
}

// 建立新的像素資料，每一格先用白色表示空白。
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

// 把像素資料重新畫到畫布上，並順便畫出格線。
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

// 把滑鼠在畫布上的位置，換算成第幾格。
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

// 根據目前工具，把指定格子改成顏色或擦成白色。
function paintCell(event) {
  const { x, y } = getCellPosition(event);

  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) {
    return;
  }

  if (currentTool === "eraser") {
    pixels[y][x] = "#ffffff";
  } else {
    pixels[y][x] = currentColor;
  }

  drawCanvas();
}

// 切換工具時，更新按鈕外觀，讓使用者知道現在是哪一個工具。
function updateToolButtons() {
  pencilBtn.classList.toggle("active", currentTool === "pencil");
  fillBtn.classList.toggle("active", currentTool === "fill");
  eraserBtn.classList.toggle("active", currentTool === "eraser");
}

// 更新右邊的圖片預覽區，讓使用者看到剛剛選的原圖。
function updateImagePreview(imageSource) {
  imagePreview.src = imageSource;
  imagePreview.style.display = "block";
  previewText.style.display = "none";
}

// 把目前畫布的像素內容輸出成不含格線的圖片資料。
function createArtworkDataUrl() {
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");

  exportCanvas.width = gridSize;
  exportCanvas.height = gridSize;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      exportCtx.fillStyle = pixels[y][x];
      exportCtx.fillRect(x, y, 1, 1);
    }
  }

  return exportCanvas.toDataURL("image/png");
}

// 顯示指定範例圖片的分步驟教學，方便錄製教學影片。
function renderDrawingSteps(sampleId) {
  const steps = drawingStepsMap[sampleId];

  stepsGrid.innerHTML = "";

  if (!steps || steps.length === 0) {
    stepsGrid.appendChild(stepsPlaceholder);
    stepsPlaceholder.textContent = "還沒有選擇範例圖片。";
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

// 更新自己做的動畫影格列表。
function renderMyAnimationFrames() {
  myFramesGrid.innerHTML = "";

  if (myAnimationFrameSources.length === 0) {
    myFramesGrid.appendChild(myFramesPlaceholder);
    myFramesPlaceholder.textContent = "你儲存的影格會顯示在這裡。";
    myFramesInfo.textContent = "你目前還沒有儲存任何影格。";
    return;
  }

  myFramesInfo.textContent =
    "你目前已經儲存 " + myAnimationFrameSources.length + " 張影格。";

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

// 更新動畫區的按鈕和文字，讓使用者知道目前播放狀態。
function updateAnimationStatus() {
  if (animationFrames.length === 0) {
    frameInfo.textContent = "目前沒有影格";
    playBtn.textContent = "播放";
    animationText.style.display = "block";
    return;
  }

  frameInfo.textContent =
    "第 " + (currentFrameIndex + 1) + " 張，共 " + animationFrames.length + " 張";
  playBtn.textContent = isPlayingAnimation ? "暫停" : "播放";
  animationText.style.display = "none";
}

// 把指定影格畫到動畫播放區。
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
  animationCtx.imageSmoothingEnabled = false;
  animationCtx.drawImage(currentFrame, 0, 0, animationCanvas.width, animationCanvas.height);
  updateAnimationStatus();
}

// 停止動畫播放，避免重複建立計時器。
function stopAnimationPlayback() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }

  isPlayingAnimation = false;
  updateAnimationStatus();
}

// 依照目前速度開始播放所有影格。
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

// 切換播放或暫停狀態。
function toggleAnimationPlayback() {
  if (isPlayingAnimation) {
    stopAnimationPlayback();
  } else {
    startAnimationPlayback();
  }
}

// 用暫存畫布把原本的作品縮放到新的大小，讓切換尺寸時能保留內容。
function resizePixels(newGridSize) {
  const oldGridSize = gridSize;
  const oldPixels = pixels;
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = oldGridSize;
  tempCanvas.height = oldGridSize;

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

// 把 0 到 255 的顏色數字轉成兩位數的 16 進位文字。
function toHex(number) {
  return number.toString(16).padStart(2, "0");
}

// 把圖片的紅綠藍數值組合成網頁常用的色碼。
function rgbToHex(red, green, blue) {
  return "#" + toHex(red) + toHex(green) + toHex(blue);
}

// 從點到的格子開始，把相連且同色的區域一次填滿。
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

// 把上傳的圖片縮成 32x32，並把每一格顏色轉成像素畫。
function convertImageToPixelArt(image) {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");

  tempCanvas.width = gridSize;
  tempCanvas.height = gridSize;

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

// 載入一張圖片來源，並直接轉成目前畫布大小的像素畫。
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

// 把目前的像素作品輸出成 PNG 圖片，方便存到電腦。
function saveArtwork() {
  const downloadLink = document.createElement("a");
  const timeText = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  downloadLink.href = createArtworkDataUrl();
  downloadLink.download = "pixel-art-" + gridSize + "x" + gridSize + "-" + timeText + ".png";
  downloadLink.click();
}

// 讀取一張內建圖片，成功後回傳 Image 物件。
function loadImageFromSource(imageSource) {
  return new Promise(function (resolve, reject) {
    const image = new Image();

    image.addEventListener("load", function () {
      resolve(image);
    });

    image.addEventListener("error", function () {
      reject(new Error("圖片載入失敗"));
    });

    image.src = imageSource;
  });
}

// 讀取一張影格圖片，成功後回傳 Image 物件。
function loadFrameImage(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();

    reader.addEventListener("load", function () {
      const image = new Image();

      image.addEventListener("load", function () {
        resolve(image);
      });

      image.addEventListener("error", function () {
        reject(new Error("圖片讀取失敗"));
      });

      image.src = reader.result;
    });

    reader.addEventListener("error", function () {
      reject(new Error("檔案讀取失敗"));
    });

    reader.readAsDataURL(file);
  });
}

// 讀取整個資料夾中的圖片，並依照檔名排序成動畫影格。
async function loadAnimationFrames(files) {
  stopAnimationPlayback();
  animationFrames = [];
  currentFrameIndex = 0;
  animationText.textContent = "正在讀取動畫圖片...";
  animationText.style.display = "block";
  frameInfo.textContent = "正在整理影格";

  const imageFiles = Array.from(files).filter(function (file) {
    return file.type.startsWith("image/");
  });

  imageFiles.sort(function (fileA, fileB) {
    return fileA.name.localeCompare(fileB.name, undefined, { numeric: true });
  });

  if (imageFiles.length === 0) {
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "資料夾裡沒有可播放的圖片";
    updateAnimationStatus();
    return;
  }

  const loadedFrames = await Promise.all(
    imageFiles.map(function (file) {
      return loadFrameImage(file);
    })
  );

  animationFrames = loadedFrames;
  animationText.textContent = "還沒有選擇動畫資料夾";
  drawAnimationFrame(0);
}

// 讀取指定的動畫影格來源，載入到播放區。
async function loadFrameSources(frameSources) {
  stopAnimationPlayback();
  animationFrames = [];
  currentFrameIndex = 0;
  animationText.textContent = "正在讀取動畫...";
  animationText.style.display = "block";
  frameInfo.textContent = "正在整理影格";

  const loadedFrames = await Promise.all(
    frameSources.map(function (frameSource) {
      return loadImageFromSource(frameSource);
    })
  );

  animationFrames = loadedFrames;
  animationText.textContent = "還沒有選擇動畫資料夾";
  drawAnimationFrame(0);
}

// 載入自己儲存的影格到播放區。
async function loadMyAnimationFrames() {
  if (myAnimationFrameSources.length === 0) {
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "請先加入你自己的影格。";
    animationText.style.display = "block";
    frameInfo.textContent = "目前沒有自製影格";
    stopAnimationPlayback();
    return;
  }

  await loadFrameSources(myAnimationFrameSources);
}

// 按下滑鼠就開始畫，並先畫目前碰到的那一格。
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

// 按住滑鼠拖曳時，經過的格子都會繼續畫上去。
canvas.addEventListener("mousemove", function (event) {
  if (!isDrawing) {
    return;
  }

  paintCell(event);
});

// 放開滑鼠後，就停止繪圖。
canvas.addEventListener("mouseup", function () {
  isDrawing = false;
});

// 滑鼠離開畫布時，也停止繪圖，避免誤畫。
canvas.addEventListener("mouseleave", function () {
  isDrawing = false;
});

// 如果在畫布外面放開滑鼠，也要結束繪圖狀態。
document.addEventListener("mouseup", function () {
  isDrawing = false;
});

// 選顏色時，記住新的顏色，並自動切回鉛筆工具。
colorPicker.addEventListener("input", function () {
  currentColor = colorPicker.value;
  currentTool = "pencil";
  updateToolButtons();
});

// 點鉛筆按鈕時，切換成鉛筆工具。
pencilBtn.addEventListener("click", function () {
  currentTool = "pencil";
  updateToolButtons();
});

// 點填色按鈕時，切換成填色工具。
fillBtn.addEventListener("click", function () {
  currentTool = "fill";
  updateToolButtons();
});

// 點橡皮擦按鈕時，切換成橡皮擦工具。
eraserBtn.addEventListener("click", function () {
  currentTool = "eraser";
  updateToolButtons();
});

// 點清空畫布按鈕時，把所有格子恢復成白色。
clearBtn.addEventListener("click", function () {
  createPixels();
  drawCanvas();
});

// 點存檔按鈕時，下載目前的像素作品。
saveBtn.addEventListener("click", function () {
  saveArtwork();
});

// 把目前畫布存成自己的動畫影格。
addFrameBtn.addEventListener("click", function () {
  myAnimationFrameSources.push(createArtworkDataUrl());
  renderMyAnimationFrames();
});

// 播放自己儲存的動畫影格。
playMyFramesBtn.addEventListener("click", async function () {
  try {
    await loadMyAnimationFrames();
  } catch (error) {
    stopAnimationPlayback();
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "載入你的影格時發生錯誤。";
    animationText.style.display = "block";
    frameInfo.textContent = "請再試一次";
  }
});

// 刪除最後一張自己儲存的影格。
deleteLastFrameBtn.addEventListener("click", function () {
  if (myAnimationFrameSources.length === 0) {
    return;
  }

  myAnimationFrameSources.pop();
  renderMyAnimationFrames();
});

// 清空自己儲存的所有影格。
clearMyFramesBtn.addEventListener("click", function () {
  myAnimationFrameSources = [];
  renderMyAnimationFrames();
});

// 點播放按鈕時，開始或暫停動畫。
playBtn.addEventListener("click", function () {
  toggleAnimationPlayback();
});

// 點上一張按鈕時，切到前一張影格。
prevFrameBtn.addEventListener("click", function () {
  if (animationFrames.length === 0) {
    return;
  }

  stopAnimationPlayback();
  drawAnimationFrame(currentFrameIndex - 1);
});

// 點下一張按鈕時，切到下一張影格。
nextFrameBtn.addEventListener("click", function () {
  if (animationFrames.length === 0) {
    return;
  }

  stopAnimationPlayback();
  drawAnimationFrame(currentFrameIndex + 1);
});

// 改變速度時，如果正在播放就立刻用新速度重新開始。
speedRange.addEventListener("input", function () {
  if (isPlayingAnimation) {
    startAnimationPlayback();
  } else {
    updateAnimationStatus();
  }
});

// 切換畫布大小時，把作品一起縮放到新的格數，最大支援到 128x128。
gridSizeSelect.addEventListener("change", function () {
  const newGridSize = Number(gridSizeSelect.value);
  resizePixels(newGridSize);
});

// 選擇圖片後，讀取檔案並轉成 32x32 的像素畫。
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

// 點範例圖片時，直接把內建圖片載入到畫布裡。
sampleCards.forEach(function (sampleCard) {
  sampleCard.addEventListener("click", function () {
    const sampleId = sampleCard.dataset.sampleId;
    const sampleSource = sampleCard.dataset.sampleSrc;
    renderDrawingSteps(sampleId);
    useImageForPainting(sampleSource);
  });
});

// 選擇資料夾後，把裡面的圖片當成動畫影格讀進來。
framesInput.addEventListener("change", async function () {
  try {
    await loadAnimationFrames(framesInput.files);
  } catch (error) {
    stopAnimationPlayback();
    animationCtx.clearRect(0, 0, animationCanvas.width, animationCanvas.height);
    animationText.textContent = "讀取動畫圖片時發生錯誤";
    animationText.style.display = "block";
    frameInfo.textContent = "請重新選擇資料夾";
  }
});

createPixels();
updateCellSize();
updateToolButtons();
updateAnimationStatus();
renderMyAnimationFrames();
drawCanvas();
