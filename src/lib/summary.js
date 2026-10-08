// Picks a short note for the save page from the six mood values.
// Axis order: 0 happy, 1 calm, 2 tired, 3 sad, 4 angry, 5 anxious.
// Rules are checked in order; the first match wins. The same values always get the same note.
const HIGH = 7;

const M = {
  quiet: [
    { en: "A quiet, neutral kind of day. Those count too.", zh: "平平淡淡的一天，這樣也很好。" },
    { en: "Nothing too big today. Enjoy the calm in between.", zh: "今天沒什麼大起伏，好好享受這份平靜。" },
  ],
  lot: [
    { en: "You've been through a lot today. Take care of yourself, and talk to someone you trust if you need to.", zh: "今天辛苦了，記得照顧好自己，需要的話，找信任的人聊聊吧" },
    { en: "Today was heavy. No need to rush to fix everything. Rest first.", zh: "今天真的很沉重。不用急著把一切解決，先好好休息吧", heavyOnly: true },
    { en: "Sounds like an emotional rollercoaster today! Rest well and take care of yourself.", zh: "今天像坐了一趟情緒雲霄飛車！好好休息，照顧好自己。" },
  ],
  pairs: {
    "0-1": { en: "Happy and at ease. What a cozy day.", zh: "又開心又平靜，很舒服的一天。" },
    "0-2": { en: "Tired but happy. Worth it!", zh: "累得很值得的那種累！" },
    "1-2": { en: "A perfect day to recharge!", zh: "適合好好充電的一天！" },
    "2-3": { en: "Rest, snacks, early night.", zh: "休息、吃點好吃的、早點睡。" },
    "2-5": { en: "Running on empty and still worrying. Time to switch off.", zh: "電量見底還在擔心，該關機休息了。" },
    "3-4": { en: "Give yourself some space before deciding what to do.", zh: "先給自己一點空間，再決定怎麼做。" },
    "3-5": { en: "Heavy heart, busy mind. Want to try writing your feelings down?", zh: "心很沉、腦袋很亂，要不要試試看把感受寫下來呢？" },
    "4-5": { en: "On edge today. Pause for a moment and take a deep breath.", zh: "今天很緊繃。先暫停一下，深呼吸一分鐘。" },
  },
  upsDowns: [
    { en: "Ups and downs all day. Give yourself credit for riding it out.", zh: "一整天起起伏伏，能撐過來的你很棒。" },
  ],
  standout: [
    { en: "Congrats on such a happy day! You deserve a celebration.", zh: "恭喜你度過這麼開心的一天！值得好好慶祝一下。" },
    { en: "Peaceful vibes only. Your mind finally got a break.", zh: "滿滿的平靜感，你的心終於好好放了個假。" },
    { en: "Running low on battery today. Sleep early, you've earned it.", zh: "今天電量偏低，早點睡吧，你值得好好休息。" },
    { en: "Sending you a hug. Tomorrow is a fresh start.", zh: "給你一個抱抱，明天又是新的開始。" },
    { en: "Your anger is valid. Let it out somewhere safe: a walk, a workout, a journal.", zh: "生氣是正常的。找個安全的方式發洩吧：散步、運動，或寫下來。" },
    { en: "Lots on your mind today. One thing at a time, you've got this.", zh: "今天心裡塞了好多事。一次一件就好，你可以的。" },
  ],
  mild: [
    { en: "A little bit happy today. Small joys add up.", zh: "今天有點小開心，小確幸累積起來就是大幸福。" },
    { en: "A quietly calm day. Nice and easy.", zh: "安安靜靜的平靜一天，剛剛好。" },
    { en: "A bit tired today. An early night wouldn't hurt.", zh: "今天有點累，早點睡不會錯。" },
    { en: "A little down today. That's okay, it happens.", zh: "今天有點低落，沒關係，偶爾會這樣。" },
    { en: "A bit grumpy today. A snack and a break might help.", zh: "今天有點小煩躁，吃點東西休息一下吧。" },
    { en: "A little uneasy today. Try writing down what's on your mind.", zh: "今天有點不安，試著把心裡的事寫下來。" },
  ],
};

// Stable pick: the same values always choose the same variant.
function pick(list, values) {
  const seed = values.reduce((h, v) => (h * 31 + Math.round(v * 10)) >>> 0, 7);
  return list[seed % list.length];
}

export function moodSummary(values, lang = "en") {
  const v = values.map((x) => Math.round(x * 10) / 10);
  const order = v.map((x, i) => i).sort((a, b) => v[b] - v[a] || a - b); // ties: earlier clockwise first
  const [t1, t2] = order;
  const high = order.filter((i) => v[i] >= HIGH);
  let m;
  if (v.every((x) => x <= 2)) m = pick(M.quiet, v);                                    // 1. quiet day
  else if (high.length >= 3) {                                                        // 2. a lot at once
    const list = high.includes(0) || high.includes(1) ? M.lot.filter((x) => !x.heavyOnly) : M.lot;
    m = pick(list, v);
  } else {
    const key = [Math.min(t1, t2), Math.max(t1, t2)].join("-");
    if (v[t1] >= 6 && v[t2] >= 6 && v[t1] - v[t2] <= 1 && M.pairs[key]) m = M.pairs[key]; // 3. named pair
    else if (high.length === 2) m = pick(M.upsDowns, v);                               // 4. ups and downs
    else if (v[t1] >= HIGH) m = M.standout[t1];                                       // 5. one feeling stands out
    else m = M.mild[t1];                                                              // 6. mild day
  }
  return m[lang] || m.en;
}
