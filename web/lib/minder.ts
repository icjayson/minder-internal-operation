// Minder AI context — used in every Gemini prompt and shown in-app.

export const MINDER_DESCRIPTION = `Minder AI builds a voice-operated AI assistant for factory workers. \
It sees what they see (camera), hears what they hear (mic), learns SOPs and \
safety protocols, and answers questions hands-free. It reduces onboarding \
time and safety incidents.`;

export const MINDER_ICP = `Ideal Customer Profile:
- Manufacturing companies, 50-500 employees
- Industries: heavy industry, textiles, food processing, automotive parts,
  electronics assembly, laundry/cleaning (already piloting here)
- Buyer personas: COO, VP Operations, Plant Manager, Head of Safety,
  Founder/CEO (for smaller firms)
- Pain points: high onboarding cost, paper-based SOPs, safety incidents,
  language barriers on the floor, supervisor-as-bottleneck
- Geography: EMEA (UK, DACH, Italy, Spain) and SEA (Vietnam, Thailand,
  Indonesia) first

Anti-ICP (score <= 2.5):
- Tech / SaaS companies with no physical operations
- <10 employees (no budget)
- Large enterprises >5000 (too slow, need in-person sales)
- Pure R&D / research outfits`;

export const MINDER_DIFFERENTIATORS = [
  "Hands-free voice interface — workers never put down their tools",
  "Learns each customer's SOPs; isn't a generic LLM chatbot",
  "Works offline on the factory floor; no stable Wi-Fi required",
  "Multilingual — solves language barriers between supervisors and workers",
  "Sees and hears what the worker does (camera + mic), not just text chat",
];
