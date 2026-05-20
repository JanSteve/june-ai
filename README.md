<div align="center">
  
# June A.I.
**Advanced Neural Assistant**

A high-fidelity, minimalist AI interface inspired by modern platforms like Claude and Grok. Powered by ultra-fast LLM inference and hyper-realistic neural voice synthesis.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-00d4ff?style=for-the-badge)](https://jansteve.github.io/jarvis-ai/)
[![Developer](https://img.shields.io/badge/Designed%20&%20Developed%20By-R%20JAN%20STEVE%20DANIEL-ff6b00?style=for-the-badge)](#)

</div>

<br>

## 🧠 The Vision & Origin
The idea for this project was to create a sleek, ultra-premium, distraction-free AI assistant interface. Evolving from early sci-fi HUD concepts, **June A.I.** now utilizes a highly sophisticated "Claude-style" dark mode chat architecture. 

The main purpose of this project was to solve a specific problem: **How do we make interacting with an AI feel as natural, instantaneous, and premium as possible?**

By combining cutting-edge language models (Groq) with industry-leading voice synthesis (ElevenLabs) and wrapping it in a beautifully minimalist UI, this project transforms the standard AI chat experience into an interactive, zero-latency conversation.

## ✨ Key Features
*   **Blazing Fast Brain:** Utilizes Groq Cloud (Llama 3.3 70B & Mixtral) for near-instantaneous language processing.
*   **Hyper-Realistic Voice:** Integrated with ElevenLabs Neural TTS to provide human-quality voice output with natural prosody, breathing, and intonation.
*   **Premium Minimalist UI:** A fully custom, responsive deep dark-mode interface featuring floating inputs, auto-resizing text areas, and elegant micro-animations.
*   **Zero-Latency Sync:** The text interface is perfectly synchronized to reveal messages at the exact millisecond the audio engine begins speaking.
*   **Voice & Text Input:** Speak naturally to June via the integrated microphone or type out complex commands.

## 🚀 How It Is Useful (Solving the Problem)
1.  **Hands-Free Interaction:** The natural voice integration allows users to interact with advanced AI while multitasking.
2.  **Immersive Experience:** The ultra-clean UI design reduces digital fatigue, making prolonged interactions and reading highly pleasant.
3.  **Cost & Token Efficiency:** The system prompt forces strict, hyper-concise single-sentence answers unless specifically asked for details, saving massive amounts of API tokens.
4.  **Instantaneous Flow:** By utilizing Groq, the traditional bottleneck of LLM generation speed is eliminated, creating a conversational flow that feels instantaneous.

## 🛠️ How It Was Built
This project was designed and developed by **Kallepalli Ram Adithya Pranav**. It was built using a lightweight, highly optimized frontend stack to ensure maximum performance across all devices:
*   **Core:** HTML5, Vanilla JavaScript (ES6+), and pure CSS3 (no heavy UI frameworks).
*   **Styling:** Custom CSS variables, smooth transitions, and modern Flexbox layouts.
*   **Intelligence API:** Groq Cloud API for LLM inference.
*   **Speech API:** ElevenLabs API for text-to-speech generation.
*   **Deployment:** Fully automated CI/CD pipeline deploying directly to GitHub Pages.

## 📊 Usage, Quotas, and Limitations

While June A.I. is highly capable, it relies on third-party APIs which have specific usage tiers:

### API Usage & Limits
1.  **Groq API (The Brain):**
    *   Currently running on a highly capable API key.
    *   **Usage:** Capable of handling thousands of requests per day, but subject to rate limits if queried excessively in a short time frame.
2.  **ElevenLabs API (The Voice):**
    *   **Usage:** High-quality TTS consumes character quotas. The system is specifically prompted to give short answers to conserve this limit.
    *   **Fallback:** If the ElevenLabs quota is exceeded, the system is designed to gracefully fall back to your browser's built-in `SpeechSynthesis` so functionality is never lost.

### Technical Limitations
*   **Mobile Autoplay:** Mobile browsers strictly block audio autoplay. June is designed to wait for your first interaction (click/tap) before engaging the voice engine to bypass these restrictions natively.
*   **Browser Compatibility:** The voice recognition feature relies on the Web Speech API, which is natively supported on Google Chrome, Edge, and Safari.

## 💻 Getting Started
1. Visit the [Live Dashboard](https://jansteve.github.io/jarvis-ai/).
2. Ensure you grant **Microphone permissions** if you wish to speak to June.
3. Use the **Settings gear** icon in the top right to adjust Voice Rate, Pitch, or toggle Auto-Speak.
4. Start a conversation!

---
<div align="center">
  <i>"I am fully operational and ready to assist you." — June A.I.</i><br><br>
  <b>Designed and Developed by Kallepalli Ram Adithya Pranav</b>
</div>
