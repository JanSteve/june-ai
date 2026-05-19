<div align="center">
  
# J.A.R.V.I.S. — AI Assistant
**Just A Rather Very Intelligent System**

A high-fidelity, cinematic AI interface inspired by Tony Stark's legendary assistant. Powered by ultra-fast LLM inference and hyper-realistic neural voice synthesis.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-00d4ff?style=for-the-badge)](https://jansteve.github.io/jarvis-ai/)
[![Developer](https://img.shields.io/badge/Developed%20By-R%20JAN%20STEVE%20DANIEL-ff6b00?style=for-the-badge)](#)

</div>

<br>

## 🧠 The Vision & Origin
The idea for this project was born out of a desire to bridge the gap between standard, text-heavy chatbot interfaces and the immersive, futuristic AI companions seen in science fiction. While models like ChatGPT and Gemini are incredibly smart, their interfaces lack the "soul" and cinematic presence of a true personal assistant. 

The main purpose of this project was to solve that exact problem: **How do we make interacting with an AI feel less like typing into a terminal and more like talking to a sentient, highly capable digital entity?**

By combining cutting-edge language models (Groq) with industry-leading voice synthesis (ElevenLabs) and wrapping it in a highly responsive, glassmorphic HUD (Heads Up Display), this project transforms the standard AI chat experience into an interactive, premium cinematic experience.

## ✨ Key Features
*   **Blazing Fast Brain:** Utilizes Groq Cloud (Llama 3.3 70B & Mixtral) for near-instantaneous language processing.
*   **Hyper-Realistic Voice:** Integrated with ElevenLabs Neural TTS to provide human-quality voice output with natural prosody, breathing, and intonation.
*   **Cinematic HUD:** A fully custom, responsive dark-mode interface featuring scanlines, animated arc reactors, live system metrics, and real-time audio waveforms.
*   **Auto-Boot Sequence:** Seamlessly engages the neural core upon page load without requiring manual API key entry.
*   **Voice & Text Input:** Speak naturally to JARVIS via the integrated microphone or type out complex commands.

## 🚀 How It Is Useful (Solving the Problem)
1.  **Hands-Free Interaction:** The natural voice integration allows users to interact with advanced AI while multitasking, completely hands-free.
2.  **Immersive Experience:** The UI design reduces digital fatigue associated with standard chat boxes, making prolonged interactions more engaging.
3.  **Low Latency:** By utilizing Groq, the traditional bottleneck of LLM generation speed is eliminated, creating a conversational flow that feels instantaneous.
4.  **Customizable Persona:** JARVIS is specifically prompted to maintain a witty, dry British humor and professional demeanor, providing a consistent and entertaining user experience.

## 🛠️ How It Was Built
This project was developed by **R JAN STEVE DANIEL**. It was built using a lightweight, highly optimized frontend stack to ensure maximum performance across devices:
*   **Core:** HTML5, Vanilla JavaScript (ES6+), and pure CSS3 (no heavy UI frameworks).
*   **Styling:** Custom CSS variables, keyframe animations, and glassmorphism techniques to achieve the sci-fi aesthetic.
*   **Intelligence API:** Groq Cloud API for LLM inference.
*   **Speech API:** ElevenLabs API for text-to-speech generation.
*   **Deployment:** Fully automated CI/CD pipeline deploying directly to GitHub Pages.

## 📊 Usage, Quotas, and Limitations

While this JARVIS instance is highly capable, it relies on third-party APIs which have specific usage tiers and limitations:

### API Usage & Limits
1.  **Groq API (The Brain):**
    *   Currently running on a free-tier API key.
    *   **Usage:** Capable of handling thousands of requests per day, but subject to rate limits if queried excessively in a short time frame.
2.  **ElevenLabs API (The Voice):**
    *   **Usage:** The free/starter tier provides a limited number of characters per month (typically ~10,000 characters).
    *   **Limitation:** If JARVIS is asked to read exceedingly long passages (e.g., full essays or codebases) frequently, the voice quota will deplete rapidly. 
    *   **Fallback:** If the ElevenLabs quota is exceeded, the system is designed to gracefully fall back to your browser's built-in `SpeechSynthesis` (standard robotic voice) so functionality is never lost.

### Technical Limitations
*   **Browser Compatibility:** The voice recognition feature relies on the Web Speech API, which is primarily supported on Google Chrome, Edge, and Safari. Firefox users may experience degraded voice input capabilities.
*   **Stateless Memory:** Currently, JARVIS maintains conversation history only for the active session. If the page is refreshed, the short-term memory is cleared.

## 💻 Getting Started
1. Visit the [Live Dashboard](https://jansteve.github.io/jarvis-ai/).
2. Allow the auto-boot sequence to complete (approx. 3-4 seconds).
3. Ensure you grant **Microphone permissions** if you wish to speak to JARVIS.
4. Use the settings panel on the right to adjust Voice Rate and Expressiveness.

---
<div align="center">
  <i>"I am at your complete disposal, sir." — J.A.R.V.I.S.</i><br><br>
  <b>Designed and Developed by R JAN STEVE DANIEL</b>
</div>
