(() => {
  const headline = document.querySelector('.typing-headline');
  if (!headline) return;

  const main = headline.querySelector('.typed-main');
  const accent = headline.querySelector('.typed-accent');
  const caret = headline.querySelector('.typing-caret');
  const phrase = 'Cristo é o caminho para o sucesso e a fonte do empreendedor';
  const accentStart = phrase.indexOf('fonte');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(length) {
    main.textContent = phrase.slice(0, Math.min(length, accentStart));
    accent.textContent = length > accentStart ? phrase.slice(accentStart, length) : '';
  }

  headline.classList.add('typing-active');
  if (reducedMotion) {
    render(phrase.length);
    caret.hidden = true;
    return;
  }

  let index = 0;
  render(0);
  function typeNext() {
    index += 1;
    render(index);
    if (index < phrase.length) {
      const character = phrase[index - 1];
      const delay = character === ' ' ? 92 : character === ',' ? 180 : 43 + Math.random() * 34;
      setTimeout(typeNext, delay);
    } else {
      headline.classList.add('typing-complete');
      setTimeout(() => { caret.classList.add('caret-fade'); }, 1800);
    }
  }
  setTimeout(typeNext, 380);
})();
