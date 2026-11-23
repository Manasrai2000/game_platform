/**
 * Class Journey Expedition - Interactive Multi-Stage Educational Game
 * Follows Client Rules:
 * 1. Single entry point per class journey
 * 2. Auto-resume from student's last completed checkpoint
 * 3. Strict no-replay of past completed activities
 * 4. postMessage sync with parent LMS platform
 */

(function () {
  "use strict";

  // Level configuration for Class Journey
  const JOURNEY_LEVELS = [
    {
      id: 1,
      badge: "Stage 1 of 3: Jungle Animal & Word Quest",
      title: "Level 1: Animal & Word Explorer",
      desc: "Help the jungle explorer match the animal with its unique characteristics!",
      question: "Which animal has big ears, a long trunk, and loves water?",
      hint: "Hint: It is the largest living land animal! 🐘",
      options: [
        { icon: "🦁", label: "Lion", sub: "King of the jungle" },
        { icon: "🐘", label: "Elephant", sub: "Long trunk & big ears" },
        { icon: "🐒", label: "Monkey", sub: "Loves climbing trees" },
        { icon: "🦒", label: "Giraffe", sub: "Tallest living mammal" }
      ],
      correctIndex: 1
    },
    {
      id: 2,
      badge: "Stage 2 of 3: Space Math Mission",
      title: "Level 2: Cosmic Star Addition",
      desc: "Fuel the exploration rocket by calculating the total energy crystals collected!",
      question: "Count the shiny crystals: 5 Blue Crystals + 4 Gold Crystals = ?",
      hint: "Hint: 5 + 4 = ? Count on your fingers! 🚀",
      options: [
        { icon: "💎", label: "7 Crystals", sub: "Not quite enough fuel" },
        { icon: "💎", label: "8 Crystals", sub: "Almost there" },
        { icon: "💎", label: "9 Crystals", sub: "Exact fuel calculation!" },
        { icon: "💎", label: "10 Crystals", sub: "Too much fuel" }
      ],
      correctIndex: 2
    },
    {
      id: 3,
      badge: "Stage 3 of 3: Magic Shape & Geometry Quest",
      title: "Level 3: Mystery Shape Explorer",
      desc: "Select the magical geometry key that unlocks the ancient treasure chest!",
      question: "Which geometric shape has exactly 3 straight sides and 3 corners?",
      hint: "Hint: Think of a slice of pizza or the Egyptian Pyramids! 🔺",
      options: [
        { icon: "🔴", label: "Circle", sub: "Zero straight edges" },
        { icon: "🔺", label: "Triangle", sub: "Exactly 3 corners & 3 sides" },
        { icon: "🟦", label: "Square", sub: "4 equal sides" },
        { icon: "🔷", label: "Diamond", sub: "4 tilted edges" }
      ],
      correctIndex: 1
    }
  ];

  // Sound settings
  let soundEnabled = true;
  let audioContext = null;

  // Progress state extracted from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  let currentCheckpoint = parseInt(urlParams.get("checkpoint"), 10) || 1;
  let maxCompletedCheckpoint = parseInt(urlParams.get("maxCompleted"), 10) || 0;

  // Active level currently being viewed (defaults to active checkpoint)
  let activeLevelId = Math.min(Math.max(currentCheckpoint, 1), JOURNEY_LEVELS.length);

  // Initialize Web Audio API safely on first user gesture
  function initAudio() {
    if (!audioContext) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          audioContext = new AudioCtx();
        }
      } catch (e) {
        // AudioContext not supported
      }
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  function playTone(freq, duration, type, startTime) {
    if (!soundEnabled || !audioContext) return;
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Audio playback suppressed
    }
  }

  function playChime(isSuccess) {
    initAudio();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    if (isSuccess) {
      // Victory Arpeggio (C5 - E5 - G5 - C6)
      playTone(523.25, 0.15, "triangle", now);
      playTone(659.25, 0.15, "triangle", now + 0.1);
      playTone(783.99, 0.15, "triangle", now + 0.2);
      playTone(1046.5, 0.4, "triangle", now + 0.3);
    } else {
      // Gentle Try-Again Buzz
      playTone(280, 0.15, "sawtooth", now);
      playTone(220, 0.25, "sawtooth", now + 0.12);
    }
  }

  // Toast Notification
  function showToast(message) {
    const toast = document.getElementById("toastMsg");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // Pure Canvas Confetti Explosion (zero dependencies)
  function fireConfetti() {
    const canvas = document.getElementById("confettiCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];
    const particles = [];
    const count = 90;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.8) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        alpha: 1
      });
    }

    let animationFrame;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.rSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    }
    render();
  }

  // Render Checkpoint Stepper Timeline
  function renderTimeline() {
    const container = document.getElementById("timelineContainer");
    if (!container) return;
    container.innerHTML = "";

    JOURNEY_LEVELS.forEach((level) => {
      const isCompleted = level.id <= maxCompletedCheckpoint;
      const isActive = level.id === currentCheckpoint;
      const isLocked = level.id > currentCheckpoint;

      const item = document.createElement("div");
      item.className = "step-item " +
        (isCompleted ? "completed " : "") +
        (isActive ? "active " : "") +
        (isLocked ? "locked" : "");

      item.innerHTML =
        '<div class="step-circle">' + (isCompleted ? "✓" : level.id) + '</div>' +
        '<span class="step-title">Stage ' + level.id + '</span>';

      item.addEventListener("click", () => {
        initAudio();
        if (isCompleted) {
          // Client rule: Past activities cannot be replayed repeatedly
          activeLevelId = level.id;
          renderLevel();
          showToast("⚠️ Activity already completed! Client rules prevent replaying past stages.");
        } else if (isLocked) {
          showToast("🔒 Locked! Please complete Stage " + currentCheckpoint + " first.");
        } else {
          activeLevelId = level.id;
          renderLevel();
        }
      });

      container.appendChild(item);
    });

    // Update Header Status Badge
    const badge = document.getElementById("journeyBadge");
    if (badge) {
      if (maxCompletedCheckpoint >= JOURNEY_LEVELS.length) {
        badge.innerHTML = "🏆 All " + JOURNEY_LEVELS.length + " Stages Completed!";
        badge.style.background = "#ecfdf5";
        badge.style.color = "#059669";
        badge.style.borderColor = "#a7f3d0";
      } else {
        badge.innerHTML = "Resuming from Checkpoint " + currentCheckpoint + " of " + JOURNEY_LEVELS.length;
      }
    }
  }

  // Render Current Level / Activity
  function renderLevel() {
    const puzzleBox = document.getElementById("puzzleBox");
    const completedNotice = document.getElementById("completedNotice");
    const victoryScreen = document.getElementById("victoryScreen");
    const levelBadge = document.getElementById("levelBadge");
    const levelTitle = document.getElementById("levelTitle");
    const levelDesc = document.getElementById("levelDesc");

    if (!puzzleBox || !completedNotice || !victoryScreen) return;

    // Check if entire journey is finished
    if (maxCompletedCheckpoint >= JOURNEY_LEVELS.length && activeLevelId > JOURNEY_LEVELS.length) {
      puzzleBox.style.display = "none";
      completedNotice.style.display = "none";
      victoryScreen.style.display = "block";
      levelBadge.textContent = "Journey Master";
      levelTitle.textContent = "All Curriculum Stages Cleared!";
      levelDesc.textContent = "Your checkpoint progress is securely saved to your school student dashboard.";
      return;
    }

    const level = JOURNEY_LEVELS.find((l) => l.id === activeLevelId);
    if (!level) return;

    levelBadge.textContent = level.badge;
    levelTitle.textContent = level.title;
    levelDesc.textContent = level.desc;

    // CLIENT RULE: Past completed stages cannot be replayed repeatedly
    if (level.id <= maxCompletedCheckpoint) {
      puzzleBox.style.display = "none";
      victoryScreen.style.display = "none";
      completedNotice.style.display = "block";
      return;
    }

    // Active Playable Stage
    completedNotice.style.display = "none";
    victoryScreen.style.display = "none";
    puzzleBox.style.display = "flex";

    puzzleBox.innerHTML =
      '<div class="question-hint">' + level.hint + '</div>' +
      '<div class="puzzle-question">' + level.question + '</div>' +
      '<div class="options-grid" id="optionsGrid"></div>';

    const grid = document.getElementById("optionsGrid");
    level.options.forEach((opt, index) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML =
        '<span class="opt-icon">' + opt.icon + '</span>' +
        '<span class="opt-label">' + opt.label + '</span>' +
        '<span class="opt-sub">' + opt.sub + '</span>';

      btn.addEventListener("click", () => handleAnswer(level, index, btn));
      grid.appendChild(btn);
    });
  }

  // Handle Answer Selection
  function handleAnswer(level, selectedIndex, buttonElement) {
    initAudio();

    if (selectedIndex === level.correctIndex) {
      buttonElement.classList.add("correct");
      playChime(true);
      fireConfetti();
      showToast("🎉 Excellent! Correct Answer. Checkpoint Saved!");

      // Disable all buttons in this level
      const allBtns = document.querySelectorAll(".option-btn");
      allBtns.forEach((b) => (b.disabled = true));

      // Advance checkpoint progress state
      maxCompletedCheckpoint = Math.max(maxCompletedCheckpoint, level.id);
      const nextLevelId = level.id + 1;
      currentCheckpoint = nextLevelId;

      // Post progress event to parent window LMS platform
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "EDUCATION_GAME_CHECKPOINT_COMPLETED",
            completedCheckpoint: level.id,
            nextCheckpoint: nextLevelId,
            stateData: {
              currentLevel: nextLevelId,
              lastCompleted: level.id,
              timestamp: Date.now()
            }
          },
          "*"
        );
      }

      // Transition smoothly to next checkpoint
      setTimeout(() => {
        activeLevelId = nextLevelId;
        renderTimeline();
        renderLevel();
      }, 1400);

    } else {
      buttonElement.classList.add("wrong");
      playChime(false);
      showToast("❌ Try again! Pick the best matching answer.");
      setTimeout(() => {
        buttonElement.classList.remove("wrong");
      }, 700);
    }
  }

  // Setup Event Listeners
  function init() {
    // Sound Toggle Button
    const soundBtn = document.getElementById("soundToggleBtn");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? "🔊 Sound: ON" : "🔇 Sound: OFF";
        if (soundEnabled) {
          initAudio();
          playChime(true);
        }
      });
    }

    // Jump to Active Stage button
    const jumpBtn = document.getElementById("jumpToActiveBtn");
    if (jumpBtn) {
      jumpBtn.addEventListener("click", () => {
        activeLevelId = Math.min(currentCheckpoint, JOURNEY_LEVELS.length);
        renderTimeline();
        renderLevel();
      });
    }

    // Handle postMessage from Parent Platform (LMS)
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "INIT_JOURNEY_STATE") {
        if (typeof event.data.checkpoint === "number") {
          currentCheckpoint = event.data.checkpoint;
        }
        if (typeof event.data.maxCompleted === "number") {
          maxCompletedCheckpoint = event.data.maxCompleted;
        }
        activeLevelId = Math.min(currentCheckpoint, JOURNEY_LEVELS.length);
        renderTimeline();
        renderLevel();
      }
    });

    // Window resize handler for confetti canvas
    window.addEventListener("resize", () => {
      const canvas = document.getElementById("confettiCanvas");
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });

    // Initial render
    renderTimeline();
    renderLevel();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
