"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NodeKind = "stack" | "list" | "tree" | "text";
type DiagramNode = { id: number; kind: NodeKind; x: number; y: number; label: string };

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
  const [nodes, setNodes] = useState<DiagramNode[]>(initialNodes);
  const [selected, setSelected] = useState<number | null>(1);
  const [activeTool, setActiveTool] = useState<NodeKind | "select">("select");
  const [note, setNote] = useState("二分探索木（BST）は、各ノードについて\n\n・左の部分木：現在の値より小さい\n・右の部分木：現在の値より大きい\n\nというルールを持つデータ構造。平均 O(log n) で検索できる。");
  const [chat, setChat] = useState([
    { from: "ai", text: "二分探索木について、どこがまだ曖昧ですか？図を使って一緒に整理できます。" },
  ]);
  const [question, setQuestion] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("manabi-note");
    if (saved) setNote(saved);
  }, []);

  useEffect(() => localStorage.setItem("manabi-note", note), [note]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  function addNode(kind: NodeKind) {
    const id = Date.now();
    const labels = { stack: "Stack", list: "Node", tree: "新規", text: "メモ" };
    setNodes(v => [...v, { id, kind, x: 310 + (v.length % 3) * 38, y: 210 + (v.length % 2) * 65, label: labels[kind] }]);
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">ま</span><span>manabi</span></div>
        <button className="new-note">＋ 新しいノート</button>
        <nav aria-label="メインメニュー">
          <button className="nav-item active"><span>▱</span> マイノート</button>
          <button className="nav-item"><span>✦</span> AI チューター</button>
          <button className="nav-item"><span>◫</span> 学習プラン</button>
        </nav>
        <p className="section-label">最近のノート</p>
        <div className="recent-list">
          <button className="recent active"><b>二分探索木</b><small>データ構造・今日</small></button>
          <button className="recent"><b>クイックソート</b><small>アルゴリズム・昨日</small></button>
          <button className="recent"><b>動的計画法</b><small>アルゴリズム・7月10日</small></button>
        </div>
        <div className="profile"><span className="avatar">M</span><span><b>Mai</b><small>今週 4日 学習</small></span><button>•••</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">マイノート <span>/</span> データ構造</div>
          <div className="top-actions"><span className="saved">✓ 保存済み</span><button className="ghost">共有</button><button className="primary">学習を始める</button></div>
        </header>

        <div className="content">
          <div className="title-row"><div><p className="eyebrow">DATA STRUCTURES</p><h1>二分探索木</h1><p className="subtitle">検索が速い「木」の仕組みを、図で理解する。</p></div><button className="more">•••</button></div>

          <div className="study-grid">
            <article className="note-card panel">
              <div className="panel-head"><div><span className="panel-icon">≡</span><b>ノート</b></div><span>自動保存</span></div>
              <textarea aria-label="学習ノート" value={note} onChange={e => setNote(e.target.value)} spellCheck={false} />
              <div className="tip"><span>✦</span><p><b>AI ヒント</b><br />「なぜ O(log n) になるのか」を図の高さと関連づけて説明してみよう。</p><button onClick={() => setNote(v => v + "\n\n木が平衡なら、比較のたびに候補が約半分になるため高さは log n になる。")}>ノートに追加</button></div>
            </article>

            <article className="diagram-card panel">
              <div className="diagram-top">
                <div><span className="panel-icon">◇</span><b>図解キャンバス</b></div>
                <div className="canvas-actions"><button title="元に戻す">↶</button><button title="やり直す">↷</button><i></i><button>−</button><span>100%</span><button>＋</button><button title="全画面">⌗</button></div>
              </div>
              <div className="canvas-wrap">
                <div className="toolbox" aria-label="図形ツール">
                  <button className={activeTool === "select" ? "on" : ""} onClick={() => setActiveTool("select")} title="選択">↖</button>
                  <button onClick={() => addNode("text")} title="テキスト">T</button>
                  <button onClick={() => addNode("tree")} title="木のノード">○</button>
                  <button onClick={() => addNode("list")} title="連結リスト">▣</button>
                  <button onClick={() => addNode("stack")} title="スタック">▤</button>
                  <button title="矢印">↗</button>
                </div>
                <div className="canvas" ref={canvasRef} onPointerMove={onPointerMove} onPointerUp={() => dragRef.current = null} onPointerLeave={() => dragRef.current = null} onClick={() => setSelected(null)}>
                  <svg className="connectors" aria-hidden="true">
                    {edges.map(([a, b]) => { const from = nodeMap.get(a), to = nodeMap.get(b); return from && to ? <line key={`${a}-${b}`} x1={from.x + 30} y1={from.y + 30} x2={to.x + 30} y2={to.y + 30} /> : null; })}
                  </svg>
                  {nodes.map(node => <div key={node.id} className={`diagram-node ${node.kind} ${selected === node.id ? "selected" : ""}`} style={{ transform: `translate(${node.x}px, ${node.y}px)` }} onPointerDown={e => onPointerDown(e, node)}>
                    {node.kind === "stack" ? <><span>{node.label}</span><i></i><i></i><i></i></> : node.kind === "list" ? <><span>{node.label}</span><b>•</b></> : node.label}
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
        </div>
      </section>
    </main>
  );
}
