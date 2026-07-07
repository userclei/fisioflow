import { useEffect, useState } from "react";

const WORDS = ["ganhar tempo", "cobrar sem esquecer", "passar na prova", "atender mais pacientes", "profissionalizar sua rotina"];

export function AnimatedWords() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      key={index}
      className="relative inline-block bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent"
      style={{ animation: "fadeSlideUp 0.5s ease-out" }}
    >
      {WORDS[index]}
    </span>
  );
}
