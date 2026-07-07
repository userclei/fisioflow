import { useEffect, useState } from "react";

const WORDS = [
  "ganhar tempo",
  "cobrar sem esquecer",
  "passar na prova",
  "atender mais pacientes",
  "profissionalizar sua rotina",
  "reduzir a papelada",
  "organizar sua agenda",
  "fidelizar seus pacientes",
  "escalar sua clínica",
  "ter mais liberdade",
  "controlar seu financeiro",
  "criar prontuários completos",
];

export function AnimatedWords() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 4200);
    return () => clearInterval(id);
  }, []);

  // Reserva a largura da maior frase para evitar reflow do layout
  const longest = WORDS.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="relative inline-grid align-baseline">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {longest}
      </span>
      <span
        key={index}
        className="col-start-1 row-start-1 whitespace-nowrap bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent"
        style={{ animation: "fadeSlideUp 0.7s ease-out" }}
      >
        {WORDS[index]}
      </span>
    </span>
  );
}
