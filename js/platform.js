// Связь с площадкой. Сейчас — обычный браузер: прогресс хранится в браузере, реклама — заглушка.
// На шаге 2 здесь появится Яндекс SDK: облачные сохранения и настоящая реклама за награду.
const SAVE_KEY = 'rodnikovo-save-1';

export const platform = {
  name: 'web',
  loadStars(count) {
    const stars = new Array(count).fill(0);
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && Array.isArray(s.stars)) s.stars.forEach((v, i) => { if (i < count) stars[i] = v | 0; });
    } catch (e) {}
    return stars;
  },
  saveStars(stars) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ stars })); } catch (e) {}
  },
  // Реклама за награду: onReward вызывается, когда игрок досмотрел ролик.
  rewarded(onReward) { setTimeout(onReward, 700); },
};
