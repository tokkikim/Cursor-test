// Show episodes: the everyday 윤슬만 show and the Titanic special.
import * as Y from './score.js';
import * as T from './titanic.js';
import { DEFS as YDEFS, spotLocal } from './scenes.js';
import { SHAPES, shapeFor } from './formations.js';

function beatFn(grid) {
  return st => {
    for (const [from, to, len, per] of grid) {
      if (st >= from && st < to) { const x = (st - from) / len, idx = Math.floor(x); return { on: true, idx, since: (x - idx) * len, len, down: idx % per === 0 }; }
    }
    return { on: false, idx: 0, since: 99, len: 1, down: false };
  };
}

export const EPISODES = {
  yunseul: {
    id: 'yunseul', title: '윤슬만의 밤', subtitle: '윤슬만의 밤 10시, 13분의 하늘', place: '윤슬만',
    SHOW_LEN: Y.SHOW_LEN, SCENES: Y.SCENES, CHAPTERS: Y.CHAPTERS, SONGS: Y.SONGS, arrange: Y.arrange, beatAt: beatFn(Y.GRID),
    defs: YDEFS, snapScene: 'main', spotScene: 'main', soloDark: 200 / 12, customFrom: 400,
    spotAt: show => spotLocal(show.shapeKey),
    spotLabel: count => SHAPES[shapeFor(count)].spotLabel,
    cardHead: snap => snap.spot ? SHAPES[snap.key].spotTopic + ' 나였어요' : snap.countText + '개의 불빛 중 하나',
    cardSub: snap => '오늘 밤, 우리가 모여 ' + SHAPES[snap.key].became
  },
  titanic: {
    id: 'titanic', title: T.META.title, subtitle: T.META.subtitle, place: T.META.place,
    SHOW_LEN: T.SHOW_LEN, SCENES: T.SCENES, CHAPTERS: T.CHAPTERS, SONGS: T.SONGS, arrange: T.arrange, beatAt: beatFn(T.GRID),
    defs: T.DEFS, snapScene: T.META.snapScene, spotScene: T.META.spotScene, soloDark: T.META.soloDark, customFrom: T.CUSTOM_FROM,
    spotAt: () => T.DEFS.ship.spotAt,
    spotLabel: () => T.META.spotLabel,
    cardHead: snap => snap.spot ? T.META.spotTopic + ' 나였어요' : snap.countText + '개의 불빛과 함께 기억했어요',
    cardSub: () => T.META.cardLine
  }
};
