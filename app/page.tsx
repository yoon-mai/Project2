"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AvlLab from "./AvlLab";
import PythonLab from "./PythonLab";

type NodeKind = "stack" | "list" | "tree" | "text";
type NodeColor = "green" | "red" | "black";
type DiagramNode = { id: number; kind: NodeKind; x: number; y: number; label: string; color?: NodeColor };
type Diagram = { id: number; name: string; nodes: DiagramNode[] };
type View = "notes" | "editor" | "tutor" | "plan" | "library" | "avl" | "python";
type SavedNote = { id:number; title:string; body:string; category:string; updated:string };
type LibraryItem = { id:number; title:string; tag:string; icon:string; text:string };

const noteLibrary = {
  "二分探索木": { category: "DATA STRUCTURES", subtitle: "検索が速い「木」の仕組みを、図で理解する。", body: "二分探索木（BST）は、各ノードについて\n\n・左の部分木：現在の値より小さい\n・右の部分木：現在の値より大きい\n\nというルールを持つデータ構造。平均 O(log n) で検索できる。" },
  "クイックソート": { category: "ALGORITHMS", subtitle: "分割して並べる、高速なソートを理解する。", body: "クイックソートは pivot を1つ選び、小さい値と大きい値に分割する。\n\n1. pivot を決める\n2. 左右に分割する\n3. 各部分を再帰的に並べる\n\n平均計算量は O(n log n)。" },
  "動的計画法": { category: "ALGORITHMS", subtitle: "小さな答えを保存して、大きな問題を解く。", body: "動的計画法（DP）は、同じ部分問題を繰り返し解かないための方法。\n\n・状態を定義する\n・遷移式を作る\n・初期値を決める\n\nメモ化再帰とボトムアップの2つの考え方がある。" },
};

const initialNodes: DiagramNode[] = [
  { id: 1, kind: "tree", x: 300, y: 60, label: "8" },
  { id: 2, kind: "tree", x: 205, y: 172, label: "3" },
  { id: 3, kind: "tree", x: 395, y: 172, label: "10" },
  { id: 4, kind: "tree", x: 140, y: 284, label: "1" },
  { id: 5, kind: "tree", x: 270, y: 284, label: "6" },
  { id: 6, kind: "text", x: 25, y: 33, label: "二分探索木" },
];

const edges = [[1, 2], [1, 3], [2, 4], [2, 5]];

export default function Home() {
  const [view, setView] = useState<View>("notes");
  const [activeNote, setActiveNote] = useState("二分探索木");
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(Object.entries(noteLibrary).map(([title,v],i)=>({id:i+1,title,body:v.body,category:v.category,updated:i===0?"今日":i===1?"昨日":"7月10日"})));
  const [libraryItems,setLibraryItems]=useState<LibraryItem[]>([
    {id:1,title:"二分探索木",tag:"木構造",icon:"○",text:"左右の大小関係を図で理解"},{id:2,title:"赤黒木",tag:"平衡木",icon:"●",text:"赤・黒の規則と回転を整理"},{id:3,title:"スタック",tag:"線形構造",icon:"▤",text:"LIFOの動きを可視化"},{id:4,title:"連結リスト",tag:"線形構造",icon:"▣",text:"ポインタの接続を追いかける"},{id:5,title:"クイックソート",tag:"ソート",icon:"⇄",text:"pivotと分割をステップ表示"},{id:6,title:"動的計画法",tag:"最適化",icon:"▦",text:"状態と遷移を表にまとめる"}
  ]);
  const [nodes, setNodes] = useState<DiagramNode[]>(initialNodes);
  const [diagrams, setDiagrams] = useState<Diagram[]>([{ id: 1, name: "BST 基本形", nodes: initialNodes }]);
  const [activeDiagram, setActiveDiagram] = useState(1);
  const [selected, setSelected] = useState<number | null>(1);
  const [activeTool, setActiveTool] = useState<NodeKind | "select">("select");
  const [note, setNote] = useState("二分探索木（BST）は、各ノードについて\n\n・左の部分木：現在の値より小さい\n・右の部分木：現在の値より大きい\n\nというルールを持つデータ構造。平均 O(log n) で検索できる。");
  const [chat, setChat] = useState([
    { from: "ai", text: "二分探索木について、どこがまだ曖昧ですか？図を使って一緒に整理できます。" },
  ]);
  const [question, setQuestion] = useState("");
  const [toast, setToast] = useState("");
  const [showStudy, setShowStudy] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("manabi-note");
    if (saved) setNote(saved);
  }, []);

  useEffect(() => localStorage.setItem("manabi-note", note), [note]);
  useEffect(()=>{if(view!=="editor")return;setSavedNotes(v=>v.map(n=>n.title===activeNote?{...n,body:note,updated:"たった今"}:n));},[note,activeNote,view]);

  useEffect(() => {
    setDiagrams(v => v.map(d => d.id === activeDiagram ? { ...d, nodes } : d));
  }, [nodes, activeDiagram]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  function addNode(kind: NodeKind) {
    const id = Date.now();
    const labels = { stack: "Stack", list: "Node", tree: "新規", text: "メモ" };
    setNodes(v => [...v, { id, kind, x: 310 + (v.length % 3) * 38, y: 210 + (v.length % 2) * 65, label: labels[kind], color: kind === "tree" ? "green" : undefined }]);
    setSelected(id);
    setActiveTool(kind);
  }

  function onPointerDown(e: React.PointerEvent, node: DiagramNode) {
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { id: node.id, dx: e.clientX - rect.left - node.x, dy: e.clientY - rect.top - node.y };
    setSelected(node.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { id, dx, dy } = dragRef.current;
    setNodes(v => v.map(n => n.id === id ? { ...n, x: Math.max(8, Math.min(rect.width - 88, e.clientX - rect.left - dx)), y: Math.max(8, Math.min(rect.height - 70, e.clientY - rect.top - dy)) } : n));
  }

  function sendQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setChat(v => [...v, { from: "you", text: q }, { from: "ai", text: "いい質問です。BSTでは「比較 → 左右どちらかへ移動」を繰り返します。たとえば 6 を探すなら 8 より小さいので左、3 より大きいので右へ進みます。右の図で経路をたどってみましょう。" }]);
    setQuestion("");
  }

  function openNote(name: string) {
    const saved=savedNotes.find(n=>n.title===name);const preset=noteLibrary[name as keyof typeof noteLibrary];
    setActiveNote(name); setNote(saved?.body||preset?.body||""); setView("editor");
    setNodes(name === "二分探索木" ? initialNodes : []); setToast(`${name}を開きました`);
  }

  function newNote() { const id=Date.now(),title=`無題のノート ${savedNotes.length+1}`;setSavedNotes(v=>[{id,title,body:"",category:"MY NOTE",updated:"たった今"},...v]);setActiveNote(title);setNote("");setNodes([]);setView("editor");setToast("新しいノートを作成しました"); }
  function renameNote(id:number){const current=savedNotes.find(n=>n.id===id);if(!current)return;const title=window.prompt("ノート名を編集",current.title)?.trim();if(!title)return;setSavedNotes(v=>v.map(n=>n.id===id?{...n,title}:n));if(activeNote===current.title)setActiveNote(title);}
  function deleteNote(id:number){const target=savedNotes.find(n=>n.id===id);setSavedNotes(v=>v.filter(n=>n.id!==id));if(target?.title===activeNote)setView("notes");setToast("ノートを削除しました");}
  function addLibraryItem(){const title=window.prompt("教材名")?.trim();if(!title)return;const text=window.prompt("教材の説明","自分で作った学習テンプレート")?.trim()||"自作教材";setLibraryItems(v=>[...v,{id:Date.now(),title,tag:"自作教材",icon:"✎",text}]);setToast("教材ライブラリに追加しました");}
  function editLibraryItem(id:number){const item=libraryItems.find(x=>x.id===id);if(!item)return;const title=window.prompt("教材名を編集",item.title)?.trim();if(!title)return;setLibraryItems(v=>v.map(x=>x.id===id?{...x,title}:x));}

  async function shareNote() {
    try { await navigator.clipboard.writeText(window.location.href); setToast("共有リンクをコピーしました"); }
    catch { setToast("このページのURLを共有してください"); }
  }

  function createDiagram() {
    const id = Date.now();
    setDiagrams(v => [...v, { id, name: `図解 ${v.length + 1}`, nodes: [] }]);
    setActiveDiagram(id); setNodes([]); setSelected(null); setToast("新しい図解を追加しました");
  }

  function switchDiagram(id: number) {
    const target = diagrams.find(d => d.id === id);
    if (!target) return;
    setActiveDiagram(id); setNodes(target.nodes); setSelected(null);
  }

  function duplicateDiagram() {
    const current = diagrams.find(d => d.id === activeDiagram);
    if (!current) return;
    const id = Date.now();
    const copy = current.nodes.map(n => ({ ...n, id: n.id + id }));
    setDiagrams(v => [...v, { id, name: `${current.name} コピー`, nodes: copy }]);
    setActiveDiagram(id); setNodes(copy); setToast("図解を複製しました");
  }

  function deleteDiagram() {
    if (diagrams.length === 1) { setToast("最後の図解は削除できません"); return; }
    const rest = diagrams.filter(d => d.id !== activeDiagram);
    setDiagrams(rest); setActiveDiagram(rest[0].id); setNodes(rest[0].nodes); setToast("図解を削除しました");
  }

  function setNodeColor(color: NodeColor) {
    if (!selected) return;
    setNodes(v => v.map(n => n.id === selected && n.kind === "tree" ? { ...n, color } : n));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">ま</span><span>manabi</span></div>
        <button className="new-note" onClick={newNote}>＋ 新しいノート</button>
        <nav aria-label="メインメニュー">
          <button className={`nav-item ${view === "notes" || view === "editor" ? "active" : ""}`} onClick={() => setView("notes")}><span>▱</span> マイノート</button>
          <button className={`nav-item ${view === "tutor" ? "active" : ""}`} onClick={() => setView("tutor")}><span>✦</span> AI チューター</button>
          <button className={`nav-item ${view === "plan" ? "active" : ""}`} onClick={() => setView("plan")}><span>◫</span> 学習プラン</button>
          <button className={`nav-item ${view === "library" ? "active" : ""}`} onClick={() => setView("library")}><span>▦</span> 教材ライブラリ</button>
          <button className={`nav-item ${view === "avl" ? "active" : ""}`} onClick={() => setView("avl")}><span>↻</span> AVL木ラボ</button>
          <button className={`nav-item ${view === "python" ? "active" : ""}`} onClick={() => setView("python")}><span>Py</span> Python Lab</button>
        </nav>
        {view === "editor" && <><p className="section-label">最近のノート</p><div className="recent-list">{savedNotes.slice(0,5).map(n=><button key={n.id} className={`recent ${activeNote===n.title?"active":""}`} onClick={()=>openNote(n.title)}><b>{n.title}</b><small>{n.category}・{n.updated}</small></button>)}</div></>}
        <div className="profile"><span className="avatar">M</span><span><b>Mai</b><small>今週 4日 学習</small></span><button>•••</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">{view === "notes"||view==="editor" ? "マイノート" : view === "tutor" ? "AI チューター" : view === "plan" ? "学習プラン" : view === "library" ? "教材ライブラリ" : view === "avl" ? "AVL木ラボ" : "Python Lab"} <span>/</span> {view === "editor" ? activeNote : view==="notes"?"すべてのノート":"インタラクティブ学習"}</div>
          <div className="top-actions"><span className="saved">✓ 保存済み</span><button className="ghost" onClick={shareNote}>共有</button><button className="primary" onClick={() => setShowStudy(true)}>学習を始める</button></div>
        </header>

        <div className="content">
          {view === "notes" && <section className="notes-index"><div className="notes-index-head"><div><p className="eyebrow">MY NOTES</p><h1>マイノート</h1><p>作ったノートを新しい順に並べています。ダブルクリックで名前を編集できます。</p></div><button onClick={newNote}>＋ 新しいノート</button></div><div className="notes-column">{savedNotes.map(n=><article key={n.id} className="note-row panel" onDoubleClick={()=>renameNote(n.id)}><button className="note-open" onClick={()=>openNote(n.title)}><span className="note-row-icon">≡</span><span><small>{n.category}</small><b>{n.title}</b><p>{n.body.trim().slice(0,95)||"まだ内容がありません"}</p></span><time>{n.updated}</time></button><div className="hover-actions"><button onClick={()=>renameNote(n.id)}>編集</button><button className="delete" onClick={()=>deleteNote(n.id)}>削除</button></div></article>)}</div></section>}

          {view === "editor" && <>
          <div className="title-row"><div><p className="eyebrow">{savedNotes.find(n=>n.title===activeNote)?.category||"MY NOTE"}</p><h1 onDoubleClick={()=>{const n=savedNotes.find(x=>x.title===activeNote);if(n)renameNote(n.id)}}>{activeNote}</h1><p className="subtitle">{noteLibrary[activeNote as keyof typeof noteLibrary]?.subtitle||"自分の言葉と図で理解をまとめる。"}</p></div><button className="more" onClick={() => setToast("タイトルはダブルクリックで編集できます")}>•••</button></div>

          <div className="study-grid">
            <article className="note-card panel">
              <div className="panel-head"><div><span className="panel-icon">≡</span><b>ノート</b></div><span>自動保存</span></div>
              <textarea aria-label="学習ノート" value={note} onChange={e => setNote(e.target.value)} spellCheck={false} />
              <div className="tip"><span>✦</span><p><b>AI ヒント</b><br />「なぜ O(log n) になるのか」を図の高さと関連づけて説明してみよう。</p><button onClick={() => setNote(v => v + "\n\n木が平衡なら、比較のたびに候補が約半分になるため高さは log n になる。")}>ノートに追加</button></div>
            </article>

            <article className="diagram-card panel">
              <div className="diagram-tabs">
                <div>{diagrams.map(d => <button key={d.id} className={activeDiagram === d.id ? "active" : ""} onDoubleClick={()=>{const name=window.prompt("図解名を編集",d.name)?.trim();if(name)setDiagrams(v=>v.map(x=>x.id===d.id?{...x,name}:x));}} onClick={() => switchDiagram(d.id)}>{d.name}</button>)}<button className="add-tab" onClick={createDiagram}>＋</button></div>
                <div><button title="複製" onClick={duplicateDiagram}>⧉</button><button title="削除" onClick={deleteDiagram}>×</button></div>
              </div>
              <div className="diagram-top">
                <div><span className="panel-icon">◇</span><b>図解キャンバス</b></div>
                <div className="canvas-actions"><button title="元に戻す" onClick={() => setNodes(v => v.slice(0, -1))}>↶</button><button title="リセット" onClick={() => setNodes(initialNodes)}>↷</button><i></i><button onClick={() => setZoom(v => Math.max(70, v - 10))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(v => Math.min(140, v + 10))}>＋</button><button title="全画面" onClick={() => canvasRef.current?.requestFullscreen?.()}>⌗</button></div>
              </div>
              <div className="canvas-wrap">
                <div className="toolbox" aria-label="図形ツール">
                  <button className={activeTool === "select" ? "on" : ""} onClick={() => setActiveTool("select")} title="選択">↖</button>
                  <button onClick={() => addNode("text")} title="テキスト">T</button>
                  <button onClick={() => addNode("tree")} title="木のノード">○</button>
                  <button onClick={() => addNode("list")} title="連結リスト">▣</button>
                  <button onClick={() => addNode("stack")} title="スタック">▤</button>
                  <button title="矢印" onClick={() => setToast("接続したい2つのノードを順番に選びます")}>↗</button>
                </div>
                {selected && nodes.find(n => n.id === selected)?.kind === "tree" && <div className="color-palette"><span>ノード色</span><button className="green" onClick={() => setNodeColor("green")} title="緑"></button><button className="red" onClick={() => setNodeColor("red")} title="赤"></button><button className="black" onClick={() => setNodeColor("black")} title="黒"></button></div>}
                <div className="canvas" ref={canvasRef} style={{ zoom: zoom / 100 }} onPointerMove={onPointerMove} onPointerUp={() => dragRef.current = null} onPointerLeave={() => dragRef.current = null} onClick={() => setSelected(null)}>
                  <svg className="connectors" aria-hidden="true">
                    {edges.map(([a, b]) => { const from = nodeMap.get(a), to = nodeMap.get(b); return from && to ? <line key={`${a}-${b}`} x1={from.x + 30} y1={from.y + 30} x2={to.x + 30} y2={to.y + 30} /> : null; })}
                  </svg>
                  {nodes.map(node => <div key={node.id} className={`diagram-node ${node.kind} ${node.color || "green"} ${selected === node.id ? "selected" : ""}`} style={{ transform: `translate(${node.x}px, ${node.y}px)` }} onDoubleClick={() => { const label = window.prompt("ラベルを編集", node.label); if (label) setNodes(v => v.map(n => n.id === node.id ? {...n, label} : n)); }} onPointerDown={e => onPointerDown(e, node)}>
                    {node.kind === "stack" ? <><span>{node.label}</span><i></i><i></i><i></i></> : node.kind === "list" ? <><span>{node.label}</span><b>•</b></> : node.label}
                    <button className="node-delete" title="削除" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setNodes(v=>v.filter(n=>n.id!==node.id));}}>×</button>
                  </div>)}
                  <div className="canvas-note"><b>ルール</b><br />左 &lt; 親 &lt; 右</div>
                </div>
              </div>
              <div className="diagram-foot"><span><kbd>Space</kbd> + ドラッグで移動</span><span>ダブルクリックで編集</span></div>
            </article>
          </div>

          <section className="ai-card panel">
            <div className="ai-title"><span className="ai-orb">✦</span><div><b>AI チューター</b><p>いまのノートと図を見ながら答えます</p></div><span className="status">● オンライン</span></div>
            <div className="messages">{chat.slice(-3).map((m, i) => <div key={i} className={`message ${m.from}`}><span>{m.from === "ai" ? "✦" : "M"}</span><p>{m.text}</p></div>)}</div>
            <form onSubmit={sendQuestion}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="例：どうして検索が O(log n) になるの？" aria-label="AIへの質問" /><button aria-label="送信">↑</button></form>
          </section>
          </>}

          {view === "tutor" && <section className="feature-page">
            <div className="feature-hero"><span className="ai-orb large">✦</span><div><p className="eyebrow">PERSONAL TUTOR</p><h1>AI チューター</h1><p>ノートの内容をもとに、分からないところを一緒にほどきます。</p></div></div>
            <div className="prompt-grid"><button onClick={() => setQuestion("二分探索木を中学生にも分かるように説明して")}><b>やさしく説明</b><span>難しい概念をかみ砕く</span></button><button onClick={() => setQuestion("理解度を確認する問題を3問出して")}><b>問題を作る</b><span>理解度をチェックする</span></button><button onClick={() => setQuestion("今のノートで足りない点を教えて")}><b>ノートをレビュー</b><span>抜けている視点を見つける</span></button></div>
            <div className="tutor-chat panel"><div className="messages vertical">{chat.map((m, i) => <div key={i} className={`message ${m.from}`}><span>{m.from === "ai" ? "✦" : "M"}</span><p>{m.text}</p></div>)}</div><form onSubmit={sendQuestion}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="何でも質問してください"/><button>↑</button></form></div>
          </section>}

          {view === "plan" && <section className="feature-page">
            <div className="feature-hero"><span className="plan-icon">✓</span><div><p className="eyebrow">STUDY PLAN</p><h1>今週の学習プラン</h1><p>無理なく続けられる、小さなステップに分けました。</p></div></div>
            <div className="progress-card panel"><div><b>今週の進捗</b><strong>68%</strong></div><div className="progress"><i></i></div><small>5つのうち3つ完了・あと約45分</small></div>
            <div className="task-list">{["二分探索木のノートを復習する","探索経路を図に描く","確認問題を3問解く","クイックソートを比較する","今週のまとめを書く"].map((task, i) => <label key={task} className={i < 3 ? "done" : ""}><input type="checkbox" defaultChecked={i < 3} onChange={e => e.currentTarget.parentElement?.classList.toggle("done", e.currentTarget.checked)}/><span><b>{task}</b><small>{i < 3 ? "完了" : `${15 + i * 5}分`}</small></span></label>)}</div>
          </section>}

          {view === "library" && <section className="feature-page library-page">
            <div className="feature-hero library-heading"><span className="library-icon">▦</span><div><p className="eyebrow">LEARNING LIBRARY</p><h1>教材ライブラリ</h1><p>図解テンプレートから、新しい学習ノートをすぐ始められます。</p></div><button onClick={addLibraryItem}>＋ 教材を追加</button></div>
            <div className="library-filters"><button className="active">すべて</button><button>データ構造</button><button>アルゴリズム</button><button>数学</button></div>
            <div className="library-grid">{libraryItems.map(item=><article key={item.id} className="library-card" onDoubleClick={()=>editLibraryItem(item.id)}><button className="library-open" onClick={()=>{if(item.title in noteLibrary)openNote(item.title);else{const id=Date.now();const body=`${item.title}の学習ノート\n\nここにポイントを書きましょう。`;setSavedNotes(v=>[{id,title:item.title,body,category:item.tag,updated:"たった今"},...v]);setActiveNote(item.title);setNote(body);setNodes([]);setView("editor");}}}><span className="library-card-icon">{item.icon}</span><small>{item.tag}</small><b>{item.title}</b><p>{item.text}</p><i>テンプレートを使う →</i></button><div className="hover-actions"><button onClick={()=>editLibraryItem(item.id)}>編集</button><button className="delete" onClick={()=>setLibraryItems(v=>v.filter(x=>x.id!==item.id))}>削除</button></div></article>)}</div>
          </section>}
          {view === "avl" && <AvlLab onAddNote={text=>{setNote(v=>`${v}\n\n${text}`);setToast("AVLのステップをノートに追加しました");}}/>}
          {view === "python" && <PythonLab onAddNote={text=>{setNote(v=>`${v}\n\n${text}`);setToast("Pythonの内容をノートに追加しました");}}/>}
        </div>
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      {showStudy && <div className="modal-backdrop" onClick={() => setShowStudy(false)}><div className="study-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowStudy(false)}>×</button><p className="eyebrow">QUICK CHECK</p><h2>理解度チェック</h2><p>二分探索木で値「6」を探すとき、最初にどちらへ進みますか？</p><div className="answer-list"><button onClick={() => setToast("正解！ 6は8より小さいので左です")}>左の部分木</button><button onClick={() => setToast("もう一度。6と8を比較してみよう")}>右の部分木</button></div></div></div>}
    </main>
  );
}
