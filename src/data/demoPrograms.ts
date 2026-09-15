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
  if (/深夜|late|リラックス|relax/.test(key)) return banks.late
  return banks.chat
}

export function createDemoSegment(input: GenerateInput): Segment {
  const bank = selectBank(input)
  const [segmentTitle, a, b, closing] = bank[input.segmentIndex % bank.length]
  const topic = input.topic.trim() || '今夜の気になること'
  const extra: Line = input.talkBalance > 25
    ? { speaker: 'B', text: `ところで「${topic.slice(0, 36)}」から、次はどんな景色が見えてきますか？` }
    : { speaker: 'A', text: `「${topic.slice(0, 36)}」というテーマを、もう少し整理して眺めてみます。` }
  return {
    programTitle: /f1/i.test(topic) ? 'F1 NIGHT TALK' : input.mode === 'late-night' ? 'MIDNIGHT LETTERS' : 'YOUR NIGHT FREQUENCY',
    segmentTitle,
    mood: input.mood,
    lines: [{ speaker: 'A', text: a }, { speaker: 'B', text: b }, extra, { speaker: 'A', text: closing }],
  }
}
