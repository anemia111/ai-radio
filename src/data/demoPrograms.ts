import type { GenerateInput, Line, Segment } from '../types/radio'

const banks: Record<string, Array<[string, string, string, string]>> = {
  f1: [
    ['グリッドの空気', '開幕前のピットレーンって、静かなのに妙な熱がありますよね。', 'わかります。マシンより先に、スタッフの歩く速さで緊張が伝わってくるんです。', '今夜はタイムだけでなく、その空気ごと追いかけてみましょう。'],
    ['勝負を分ける一手', 'レースは最速の一台だけで決まらない。タイヤをいつ替えるかが物語になります。', '一周待つか、今飛び込むか。見ている側まで監督になった気分ですよ。', 'しかも正解はチェッカーまで分からない。そこが面白いんです。'],
    ['ドライバーのリズム', '速いドライバーほど、派手さより再現性が際立ちます。', '同じコーナーを何十周も、ほぼ同じ呼吸で通る。想像するとすごい集中力です。', 'その小さな積み重ねが、最後の数秒になるんですね。'],
  ],
  game: [
    ['セーブデータの向こう側', '子どもの頃に遊んだゲームって、音を聞くだけで部屋の景色まで戻ってきませんか。', 'あります。起動画面だけで、宿題を後回しにした罪悪感まで復元されます。', 'はは、それも含めて完璧な記憶ですね。'],
    ['寄り道の価値', '目的地があるのに、つい脇道へ入ってしまう。それがゲームの贅沢です。', '本筋より釣りに詳しくなったりしますよね。世界を自分の速度で歩けるのがいい。', '今夜も少し、いい寄り道をしましょう。'],
  ],
  tech: [
    ['道具と相棒の間', 'AIは便利な道具から、一緒に考える相棒へ少しずつ近づいています。', 'でも最後に面白い問いを選ぶのは人。そこはまだ譲りたくないですね。', '同感です。答えより、問いのセンスが大事な時代かもしれません。'],
    ['小さな未来', '未来って、派手な発明より毎日の小さな省力化から来る気がします。', '気づいたら昨日の面倒を忘れている。それが一番自然な進歩ですね。', '今夜は、そんな静かな変化を拾っていきます。'],
  ],
  sports: [
    ['勝負の前の静けさ', '大きな試合ほど、始まる直前の静けさに物語があります。', '選手の表情を見るだけで、こちらまで呼吸が浅くなりますよね。', '結果だけではなく、その一瞬も味わっていきましょう。'],
    ['数字に残らない仕事', '得点した選手の後ろには、記録に残りにくい動きがあります。', '囮の走りや声掛け。そこに気づくと観戦が急に立体的になります。', '今夜はそんな小さな貢献にも注目します。'],
    ['応援する理由', '強いから応援するだけでなく、応援するから強さを信じられることもあります。', '負けた夜まで含めて、チームとの付き合いですからね。', '次の一戦を待つ時間も、スポーツの一部です。'],
  ],
  anime: [
    ['一話目の約束', 'いい作品の一話目には、この世界でもう少し過ごしたいと思わせる約束があります。', '説明されすぎない余白も大切ですよね。分からないから次を見たくなる。', '今夜はその入口の巧さから話してみます。'],
    ['声と間の演技', '同じ台詞でも、息を置く場所ひとつで人物の見え方が変わります。', '絵が止まっていても、声で時間が動く瞬間がありますね。', '耳で見るアニメ、という楽しみ方もありそうです。'],
    ['最終回のあと', '物語が終わった後も、登場人物の日常を想像してしまう作品があります。', '寂しいけれど、それだけ長く一緒にいた証拠ですね。', '余韻まで含めて、作品は心に残ります。'],
  ],
  study: [
    ['小さく始める', '勉強は気合より、始めるまでの摩擦を小さくする工夫が効きます。', '五分だけ開く、でもいいんですよね。始めた自分をまず褒めたい。', '完璧より、今日の一歩を選びましょう。'],
    ['思い出す練習', '読み返すだけでなく、一度閉じて思い出すと記憶は強くなります。', '分からなかった場所が見えるのも収穫ですね。間違いは地図になります。', '答え合わせまでを一つの練習にしてみましょう。'],
    ['休憩の設計', '集中を続けるには、休む時間も先に決めておくのが大切です。', '休憩中に別の大仕事を始めない、これが意外と難しいんです。', '戻ってこられる休み方を作っていきましょう。'],
  ],
  late: [
    ['午前零時の余白', '一日が終わった後の静けさには、昼とは違う考えが浮かびます。', '答えを急がなくていい時間ですね。冷蔵庫の音まで、ちょっと味方に聞こえます。', '眠る少し前まで、ここでゆっくりしていってください。'],
    ['眠らない街角', 'この時間にも、誰かの仕事が始まり、誰かの帰り道が続いています。', '同じ夜を別々の速度で過ごしているんですね。ラジオだけが、その間をつなぐ。', '今聞いているあなたの時間にも、そっと周波数を合わせます。'],
  ],
  chat: [
    ['今夜の話題', '好きなことについて話す時間は、少しだけ一日を広くしてくれます。', '知識を競うより、面白がるほうがラジオ向きですからね。', 'では、肩の力を抜いて始めましょう。'],
    ['もう少しだけ', 'ひとつの話から別の記憶へつながる瞬間が、会話の面白さです。', '予定どおりに進まないほうが、いい夜もあります。', 'このまま、もう少し寄り道してみましょう。'],
  ],
}

function selectBank(input: GenerateInput) {
  const key = `${input.topic} ${input.mode}`.toLowerCase()
  if (/f1|formula|レース/.test(key)) return banks.f1
  if (/ゲーム|game|gaming/.test(key)) return banks.game
  if (/テクノロジー|tech|ai|ガジェット/.test(key)) return banks.tech
  if (/スポーツ|sports|sport/.test(key)) return banks.sports
  if (/アニメ|anime/.test(key)) return banks.anime
  if (/勉強|study|学習/.test(key)) return banks.study
  if (/深夜|late|リラックス|relax/.test(key)) return banks.late
  return banks.chat
}

function subjectFromTopic(topic: string) {
  const subject = topic.replace(/[。！？!?]+$/g, '').replace(/(?:について)?[、,\s]*(?:ゆるく|詳しく|深く|楽しく|おすすめを)?[、,\s]*(?:話して|教えて|聞かせて|聞きたい)(?:ください)?$/u, '').trim()
  return (subject || topic).slice(0, 60)
}

export function createDemoSegment(input: GenerateInput): Segment {
  if (input.mode === 'news' && input.rssItems?.length) {
    const item = input.rssItems[input.segmentIndex % input.rssItems.length]
    return { programTitle: 'AI RADIO NEWSROOM', segmentTitle: item.title.slice(0, 80), mood: input.mood, lines: [
      { speaker: 'A', text: `「${item.title.slice(0, 120)}」というニュースです。` },
      { speaker: 'B', text: item.summary ? item.summary.slice(0, 220) : '現在取得できたのは見出しまでです。' },
      { speaker: 'A', text: item.publishedAt ? `配信日時は${item.publishedAt}。詳しくは配信元の記事をご確認ください。` : '詳しくは配信元の記事をご確認ください。' },
    ] }
  }
  const bank = selectBank(input)
  const [segmentTitle, a, b, closing] = bank[input.segmentIndex % bank.length]
  const topic = input.topic.trim() || '今夜の気になること'
  const subject = subjectFromTopic(topic)
  const isGeneric = bank === banks.chat
  const lead = input.direction === 'continue' ? 'さっきの話をもう一段掘って' : input.direction === 'next' ? '次の角度から' : '今夜のリクエストは'
  const question = /どう|なぜ|何|おすすめ|迷|べき|かな/u.test(topic)
  const first = `${lead}「${topic.slice(0, 90)}」。中心に置くのは「${subject}」です。${isGeneric ? 'まず、気になったきっかけから考えてみましょう。' : a}`
  const second = isGeneric ? (question ? `答えを急ぐより、「${subject}」で何を大事にしたいかを分けると、自分に合う方向が見えそうですね。` : `「${subject}」の面白さは、知識だけでなく、自分の経験や好みと結びつくところにもありそうです。`) : b
  const third = isGeneric ? `たとえば「${subject}」の良いところ、気になるところ、これから試したいこと。この三つに分けると話が具体的になります。` : `「${subject}」という視点で見ると、${closing}`
  const fourth = `ではこのあとも、「${subject}」から離れずに、具体的なポイントを一つずつ拾っていきましょう。`
  const lines: Line[] = [{ speaker: 'A', text: first }, { speaker: 'B', text: second }, { speaker: input.talkBalance > 25 ? 'B' : 'A', text: third }, { speaker: input.talkBalance < -25 ? 'A' : 'B', text: fourth }]
  return {
    programTitle: /f1/i.test(topic) ? 'F1 NIGHT TALK' : input.mode === 'late-night' ? 'MIDNIGHT LETTERS' : 'YOUR NIGHT FREQUENCY',
    segmentTitle,
    mood: input.mood,
    lines,
  }
}
