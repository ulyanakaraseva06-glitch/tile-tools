import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { helpQuestions, helpVideoScenes } from './helpContent';

export function HelpGuide() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [activeId, setActiveId] = useState(helpQuestions[0].id);
  const active = helpQuestions.find((item) => item.id === activeId) ?? helpQuestions[0];
  const scene = helpVideoScenes[sceneIndex];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setSceneIndex((current) => (current + 1) % helpVideoScenes.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <>
      <section className="help-video-block" aria-label="Обзор сервиса">
        <div className="help-video-frame">
          {helpVideoScenes.map((item, index) => (
            <img
              key={item.src}
              src={item.src}
              alt=""
              className={index === sceneIndex ? 'active' : ''}
            />
          ))}
          <div className="help-video-caption">
            <strong>{scene.title}</strong>
            <span>{scene.caption}</span>
          </div>
          <button
            type="button"
            className="help-video-play"
            onClick={() => setPlaying((current) => !current)}
            aria-label={playing ? 'Пауза' : 'Смотреть'}
          >
            {playing ? <Pause size={22} /> : <Play size={22} />}
          </button>
        </div>
      </section>

      <section className="help-qa" aria-label="Вопросы и ответы">
        <div className="help-questions">
          {helpQuestions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === active.id ? 'active' : ''}
              onClick={() => setActiveId(item.id)}
            >
              {item.question}
            </button>
          ))}
        </div>
        <article className="help-answer">
          <h2>{active.question}</h2>
          {active.answer.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
      </section>
    </>
  );
}
