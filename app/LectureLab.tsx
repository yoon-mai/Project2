"use client";

import { useEffect, useMemo, useState } from "react";

type Lecture = {
  id: number;
  week: string;
  title: string;
  source: string;
  translation: string;
  summary: string;
  engine?: "browser-ai" | "study-assist";
};

type TranslationEngine = {
  translate: (text: string) => Promise<string>;
};

type TranslatorFactory = {
  availability?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: { addEventListener: (name: string, cb: (event: { loaded: number; total: number }) => void) => void }) => void;
  }) => Promise<TranslationEngine>;
};

declare global {
  interface Window {
    Translator?: TranslatorFactory;
  }
}

const protectedTerms = [
  "Binary Search Tree", "Red-Black Tree", "AVL Tree", "Data Structure", "Linked List",
  "Depth-First Search", "Breadth-First Search", "Dynamic Programming", "time complexity",
  "space complexity", "Big-O notation", "Stack", "Queue", "Heap", "Hash Table", "Graph",
  "Tree", "Array", "Algorithm", "Node", "Edge", "root", "leaf",
];

const glossary: Array<[RegExp, string]> = [
  [/binary search trees?/gi, "Binary Search Tree"], [/red-black trees?/gi, "Red-Black Tree"],
  [/avl trees?/gi, "AVL Tree"], [/data structures?/gi, "Data Structure"],
  [/linked lists?/gi, "Linked List"], [/depth-first search/gi, "Depth-First Search"],
  [/breadth-first search/gi, "Breadth-First Search"], [/dynamic programming/gi, "Dynamic Programming"],
  [/time complexity/gi, "時間計算量"], [/space complexity/gi, "空間計算量"],
  [/worst[- ]case/gi, "最悪ケース"], [/average[- ]case/gi, "平均ケース"],
  [/best[- ]case/gi, "最良ケース"], [/insertion/gi, "挿入"], [/deletion/gi, "削除"],
  [/traversal/gi, "走査"], [/search operation/gi, "検索操作"], [/key value/gi, "キー値"],
];

const phraseRules: Array<[RegExp, string]> = [
  [/^this lecture (introduces|explains|covers)\s*/i, "このLectureでは、"],
  [/^in this lecture,?\s*/i, "このLectureでは、"], [/^we will (learn|study|discuss)\s*/i, "ここでは、"],
  [/the key idea is/gi, "重要な考え方は"], [/is defined as/gi, "は〜と定義されます"],
  [/refers to/gi, "とは〜を指します"], [/is used to/gi, "は〜するために使われます"],
  [/for example/gi, "例えば"], [/in other words/gi, "言い換えると"], [/in summary/gi, "まとめると"],
  [/therefore/gi, "したがって"], [/however/gi, "一方で"], [/because/gi, "なぜなら"],
  [/the main advantage is/gi, "主な利点は"], [/the main disadvantage is/gi, "主な欠点は"],
  [/we need to/gi, "〜する必要があります"], [/it is important to/gi, "〜することが重要です"],
  [/can be used/gi, "使用できます"], [/consists of/gi, "〜で構成されます"],
];

function protectTerms(text: string) {
  const kept: string[] = [];
  let value = text;
  protectedTerms.forEach((term) => {
    value = value.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (found) => {
      kept.push(found);
      return `MANABITERM${kept.length - 1}`;
    });
  });
  return { value, restore: (translated: string) => kept.reduce((out, term, index) => out.replace(new RegExp(`MANABI\\s*_?\\s*TERM\\s*_?\\s*${index}`, "gi"), term), translated) };
}

function studyAssist(text: string) {
  let result = text;
  for (const [pattern, replacement] of glossary) result = result.replace(pattern, replacement);
  for (const [pattern, replacement] of phraseRules) result = result.replace(pattern, replacement);
  return result;
}

function lineKind(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return { prefix: "", content: "", kind: "blank" as const };
  const bullet = trimmed.match(/^([-*•])\s+(.+)/);
  if (bullet) return { prefix: "• ", content: bullet[2], kind: "bullet" as const };
  const numbered = trimmed.match(/^(\d+[.)])\s+(.+)/);
  if (numbered) return { prefix: `${numbered[1]} `, content: numbered[2], kind: "number" as const };
  const heading = /^#{1,6}\s+(.+)/.exec(trimmed);
  if (heading) return { prefix: "## ", content: heading[1], kind: "heading" as const };
  const looksLikeHeading = trimmed.length < 75 && !/[.!?。]$/.test(trimmed);
  return { prefix: looksLikeHeading ? "## " : "", content: trimmed, kind: looksLikeHeading ? "heading" as const : "paragraph" as const };
}

async function createBrowserTranslator(onDownload: (progress: number) => void) {
  if (!window.Translator) return null;
  try {
    const options = { sourceLanguage: "en", targetLanguage: "ja" };
    const availability = await window.Translator.availability?.(options);
    if (availability === "unavailable") return null;
    return await window.Translator.create({
      ...options,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => onDownload(Math.round((event.loaded / Math.max(event.total, 1)) * 100)));
      },
    });
  } catch {
    return null;
  }
}

async function translateDocument(source: string, onProgress: (message: string) => void) {
  const lines = source.split("\n");
  onProgress("翻訳AIを準備しています…");
  const translator = await createBrowserTranslator((progress) => onProgress(`初回用の翻訳AIを準備中… ${progress}%`));
  const output: string[] = [];
  let translatedCount = 0;
  const targetCount = lines.filter((line) => line.trim()).length;

  for (const line of lines) {
    const parsed = lineKind(line);
    if (parsed.kind === "blank") {
      output.push("");
      continue;
    }
    let translated = "";
    if (translator) {
      const protectedText = protectTerms(parsed.content);
      try {
        translated = protectedText.restore(await translator.translate(protectedText.value));
      } catch {
        translated = studyAssist(parsed.content);
      }
    } else {
      translated = studyAssist(parsed.content);
    }
    translatedCount += 1;
    onProgress(`段落を翻訳中… ${translatedCount} / ${targetCount}`);
    output.push(`${parsed.prefix}${translated}`);
  }
  return { translation: output.join("\n"), engine: translator ? "browser-ai" as const : "study-assist" as const };
}

function cleanLines(text: string) {
  return text.split("\n").map((line) => line.replace(/^##\s+|^•\s+|^\d+[.)]\s+/, "").trim()).filter(Boolean);
}

function unique(items: string[], limit: number) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(key) || item.length < 8) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function selectByKeywords(sourceLines: string[], translatedLines: string[], pattern: RegExp, limit: number) {
  return unique(sourceLines.map((line, index) => pattern.test(line) ? translatedLines[index] : "").filter(Boolean), limit);
}

function detailedSummary(source: string, translation: string) {
  const sourceLines = cleanLines(source);
  const translatedLines = cleanLines(translation);
  const overview = unique(translatedLines.filter((line) => line.length > 28), 3);
  const concepts = unique(translatedLines.filter((line) => line.length > 18), 8);
  const definitions = selectByKeywords(sourceLines, translatedLines, /define|means|refers|consist|represent|called|concept|property/i, 5);
  const process = selectByKeywords(sourceLines, translatedLines, /step|process|operation|insert|delete|search|travers|rotate|compare|update|calculate/i, 6);
  const complexity = selectByKeywords(sourceLines, translatedLines, /complexity|O\s*\(|efficient|performance|worst|average|best|trade-?off|advantage|disadvantage/i, 5);
  const examples = selectByKeywords(sourceLines, translatedLines, /example|application|use case|suppose|consider|instance/i, 4);
  const section = (title: string, items: string[], empty: string) => [
    `## ${title}`,
    ...(items.length ? items.map((item) => `• ${item}`) : [`• ${empty}`]),
    "",
  ];

  return [
    ...section("全体像", overview, "このLectureの中心テーマを、原文と照らし合わせながら確認してください。"),
    ...section("重要ポイント", concepts, "各段落の主張を一つずつ、自分の言葉で言い換えてみましょう。"),
    ...section("用語・定義・性質", definitions, "太字や見出しに出てくる専門用語について、定義と性質をセットで整理しましょう。"),
    ...section("処理の流れ・仕組み", process, "入力 → 処理 → 出力の順で、手順を図にして確認すると理解しやすくなります。"),
    ...section("計算量・利点・注意点", complexity, "操作ごとの時間計算量・空間計算量と、その理由を確認しましょう。"),
    ...section("例・使いどころ", examples, "Lecture内の例を別の値に変えて、同じ手順を再現してみましょう。"),
    "## 復習・試験対策チェック",
    "• 重要用語を一文で定義できるか",
    "• 図を見ずに処理の順番を説明できるか",
    "• 各操作の時間計算量と、その計算量になる理由を説明できるか",
    "• 利点だけでなく、苦手なケースや制約も説明できるか",
    "• 小さなExampleを自分で作り、途中状態を追跡できるか",
  ].join("\n");
}

const youtubeTopics = [
  { pattern: /avl|rotation|balanced tree/i, label: "AVL Trees & Rotations", query: "FIT2004 AVL tree rotations explained", note: "回転とbalance factorを動画で追う" },
  { pattern: /red.?black/i, label: "Red-Black Trees", query: "FIT2004 red black tree insertion deletion", note: "色変更とrotationの規則を確認" },
  { pattern: /binary search tree|\bbst\b/i, label: "Binary Search Trees", query: "FIT2004 binary search tree operations", note: "insert・delete・searchを可視化" },
  { pattern: /dynamic programming|memoization|optimal substructure/i, label: "Dynamic Programming", query: "FIT2004 dynamic programming recurrence tutorial", note: "stateとrecurrenceの作り方を見る" },
  { pattern: /dijkstra|bellman|shortest path/i, label: "Shortest Path", query: "FIT2004 shortest path Dijkstra Bellman Ford", note: "relaxationをステップで理解" },
  { pattern: /minimum spanning|kruskal|prim/i, label: "Minimum Spanning Tree", query: "FIT2004 MST Kruskal Prim algorithm", note: "2つのgreedy手法を比較" },
  { pattern: /depth.first|breadth.first|\bdfs\b|\bbfs\b|graph traversal/i, label: "Graph Traversal", query: "FIT2004 BFS DFS graph traversal", note: "QueueとStackによる違いを見る" },
  { pattern: /network flow|max flow|ford.fulkerson/i, label: "Network Flow", query: "FIT2004 network flow Ford Fulkerson", note: "residual graphの更新を確認" },
  { pattern: /hash|collision|probing/i, label: "Hashing", query: "FIT2004 hashing collision open addressing", note: "collision処理と計算量を復習" },
  { pattern: /quick.?sort|merge.?sort|sorting/i, label: "Sorting Algorithms", query: "FIT2004 sorting algorithms quicksort mergesort", note: "各stepと計算量を比較" },
  { pattern: /heap|priority queue/i, label: "Heap & Priority Queue", query: "FIT2004 heap priority queue explained", note: "heapifyと配列表現を確認" },
  { pattern: /complexity|big.?o|asymptotic/i, label: "Complexity Analysis", query: "FIT2004 time complexity Big O analysis", note: "計算量の導出を例題で練習" },
];

function suggestedVideos(title: string, source: string) {
  const context = `${title}\n${source}`;
  const matched = youtubeTopics.filter((topic) => topic.pattern.test(context));
  const defaults = youtubeTopics.filter((topic) => /Complexity|Dynamic|Graph/.test(topic.label));
  return [...matched, ...defaults].filter((topic, index, items) => items.findIndex((item) => item.label === topic.label) === index).slice(0, 4);
}

function Doc({ text }: { text: string }) {
  return <div className="structured-doc">{text.split("\n").map((line, index) => {
    if (!line) return <br key={index} />;
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line.startsWith("• ")) return <li key={index}>{line.slice(2)}</li>;
    return <p key={index}>{line}</p>;
  })}</div>;
}

export default function LectureLab({ onAddNote }: { onAddNote: (text: string) => void }) {
  const [week, setWeek] = useState("Week 1");
  const [title, setTitle] = useState("Introduction to Data Structures");
  const [source, setSource] = useState("");
  const [files, setFiles] = useState<Lecture[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [tab, setTab] = useState<"source" | "translation" | "summary">("translation");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const current = useMemo(() => files.find((file) => file.id === active), [files, active]);
  const videoSuggestions = useMemo(() => current ? suggestedVideos(current.title, current.source) : [], [current]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("manabi-lectures");
      if (saved) setFiles(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => localStorage.setItem("manabi-lectures", JSON.stringify(files)), [files]);

  async function processLecture(existing?: Lecture) {
    const lectureSource = existing?.source ?? source;
    if (!lectureSource.trim() || working) return;
    setWorking(true);
    setStatus("翻訳を開始しています…");
    const result = await translateDocument(lectureSource, setStatus);
    const updated: Lecture = {
      id: existing?.id ?? Date.now(),
      week: existing?.week ?? week,
      title: existing?.title ?? title,
      source: lectureSource,
      translation: result.translation,
      summary: detailedSummary(lectureSource, result.translation),
      engine: result.engine,
    };
    setFiles((items) => existing ? items.map((item) => item.id === existing.id ? updated : item) : [updated, ...items]);
    setActive(updated.id);
    setTab("translation");
    setWorking(false);
    setStatus(result.engine === "browser-ai" ? "自然な日本語に翻訳しました" : "学習補助翻訳で作成しました");
  }

  return <section className="lab-page lecture-lab">
    <div className="feature-hero"><span className="lecture-icon">L</span><div><p className="eyebrow">LECTURE ORGANIZER</p><h1>Lecture Lab</h1><p>段落構造と専門用語を保った翻訳、詳しい日本語SummaryでLectureを復習できます。</p></div></div>
    {!current ? <>
      <div className="lecture-index-head"><h2>Lecture files</h2><span>{files.length} files</span></div>
      <div className="lecture-file-grid">{files.map((file) => <article key={file.id} className="panel">
        <button onClick={() => { setActive(file.id); setTab("translation"); }}><small>{file.week}</small><b>{file.title}</b><p>{file.summary.replace(/[#•]/g, "").slice(0, 100)}…</p><i>Lectureを読む →</i></button>
        <span onClick={() => setFiles((items) => items.filter((item) => item.id !== file.id))}>×</span>
      </article>)}</div>
      <div className="lecture-input panel"><div className="lecture-meta"><input value={week} onChange={(event) => setWeek(event.target.value)} /><input value={title} onChange={(event) => setTitle(event.target.value)} /></div><textarea value={source} onChange={(event) => setSource(event.target.value)} placeholder="新しいLecture noteを貼り付け…" /><div className="lecture-process-row"><small>{working ? status : "専門用語は英語のまま残します"}</small><button disabled={working || !source.trim()} onClick={() => processLecture()}>{working ? "翻訳中…" : "翻訳・詳しい要約を作成"}</button></div></div>
    </> : <div className="lecture-reader-layout"><div className="lecture-reader panel">
      <div className="reader-head"><button onClick={() => setActive(null)}>← Lecture files</button><div><small>{current.week}</small><h2>{current.title}</h2></div><button onClick={() => onAddNote(`Lecture: ${current.title}\n\n${current.translation}\n\n${current.summary}`)}>＋ ノートへ</button></div>
      <div className="reader-toolbar"><div className="reader-tabs"><button className={tab === "source" ? "active" : ""} onClick={() => setTab("source")}>原文</button><button className={tab === "translation" ? "active" : ""} onClick={() => setTab("translation")}>翻訳</button><button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>詳しい日本語 Summary</button></div><button className="retranslate-button" disabled={working} onClick={() => processLecture(current)}>{working ? status : "↻ このLectureを再翻訳"}</button></div>
      {current.engine === "study-assist" && tab !== "source" && <p className="translation-notice">この端末ではブラウザ翻訳AIが利用できなかったため、学習用の補助翻訳を表示しています。「再翻訳」で再度試せます。</p>}
      {tab === "source" ? <div className="source-doc"><Doc text={current.source} /></div> : tab === "translation" ? <div className="translation-doc"><Doc text={current.translation} /></div> : <div className="summary-doc"><Doc text={current.summary} /></div>}
    </div><aside className="youtube-suggest panel"><div className="youtube-head"><span>▶</span><div><p className="eyebrow">WATCH NEXT</p><h3>YouTube references</h3></div></div><p>Lectureの内容に近い解説を、YouTubeですぐ探せます。</p><div>{videoSuggestions.map((video, index) => <a key={video.label} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`} target="_blank" rel="noreferrer"><span>{String(index + 1).padStart(2, "0")}</span><div><b>{video.label}</b><small>{video.note}</small></div><i>↗</i></a>)}</div><a className="youtube-all" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`FIT2004 ${current.title}`)}`} target="_blank" rel="noreferrer">「{current.title}」で検索する ↗</a><small className="youtube-note">YouTubeの検索結果が開きます。動画の正確性はLecture noteと照らして確認してください。</small></aside></div>}
  </section>;
}
