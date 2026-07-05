const introScreen = document.getElementById("introScreen");
const slideScreen = document.getElementById("slideScreen");
const outroScreen = document.getElementById("outroScreen");
const startButton = document.getElementById("startButton");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const restartButton = document.getElementById("restartButton");
const slideCounter = document.getElementById("slideCounter");
const slideDate = document.getElementById("slideDate");
const slideKicker = document.getElementById("slideKicker");
const slideTitle = document.getElementById("slideTitle");
const slideQuote = document.getElementById("slideQuote");
const slideSpeaker = document.getElementById("slideSpeaker");
const slideNote = document.getElementById("slideNote");

const API_URL = "https://for-esther-api.fly.dev";

let moments = [];
let currentSlideIndex = 0;

function isClusterSlide(moment) {
  return moment.note && moment.note.length > 120 && moment.quote && moment.quote.includes("\n\n");
}

function renderSlide() {
  const moment = moments[currentSlideIndex];
  slideCounter.textContent = `${currentSlideIndex + 1} / ${moments.length}`;
  slideDate.textContent = moment.date || moment.section || "";
  slideKicker.textContent = moment.section || moment.date || "";
  slideTitle.textContent = moment.title || "";
  slideQuote.textContent = moment.quote || "";
  slideSpeaker.textContent = moment.speaker_label || moment.speakerLabel || "";

  if (isClusterSlide(moment)) {
    slideQuote.classList.add("cluster");
  } else {
    slideQuote.classList.remove("cluster");
  }

  slideNote.textContent = moment.note || "";
  prevButton.disabled = currentSlideIndex === 0;
  nextButton.textContent = currentSlideIndex === moments.length - 1 ? "finish" : "next";
}

function startSlideshow() {
  introScreen.classList.add("hidden");
  outroScreen.classList.add("hidden");
  slideScreen.classList.remove("hidden");
  currentSlideIndex = 0;
  renderSlide();
}

function showOutro() {
  slideScreen.classList.add("hidden");
  outroScreen.classList.remove("hidden");
}

startButton.addEventListener("click", startSlideshow);
restartButton.addEventListener("click", startSlideshow);

prevButton.addEventListener("click", () => {
  if (currentSlideIndex > 0) {
    currentSlideIndex -= 1;
    renderSlide();
  }
});

nextButton.addEventListener("click", () => {
  if (currentSlideIndex < moments.length - 1) {
    currentSlideIndex += 1;
    renderSlide();
    return;
  }
  showOutro();
});

document.addEventListener("keydown", (event) => {
  if (slideScreen.classList.contains("hidden")) return;
  if (event.key === "ArrowRight") nextButton.click();
  if (event.key === "ArrowLeft") prevButton.click();
});

function normalizeApiMemory(apiMemory) {
  return {
    section: apiMemory.section || "",
    title: apiMemory.title || "",
    date: apiMemory.section || "",
    speakerLabel: apiMemory.speaker_label || "",
    speaker_label: apiMemory.speaker_label || "",
    quote: apiMemory.quote || "",
    note: apiMemory.note || "",
  };
}

async function tryLoadApi() {
  try {
    const response = await fetch(`${API_URL}/api/public/moments`);
    if (!response.ok) return null;
    const apiMemories = await response.json();
    if (!apiMemories || apiMemories.length === 0) return null;
    return apiMemories.map(normalizeApiMemory);
  } catch {
    return null;
  }
}

async function initialize() {
  const apiMemories = await tryLoadApi();
  if (apiMemories && apiMemories.length > 0) {
    moments = apiMemories;
    return;
  }

  moments = [];
  startButton.disabled = true;
  startButton.textContent = "not available right now";
}

initialize().catch((error) => {
  console.error(error);
});
