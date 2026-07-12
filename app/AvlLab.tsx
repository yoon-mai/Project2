"use client";

import { useMemo, useState } from "react";

type TNode = { value:number; left:TNode|null; right:TNode|null; height:number };
type Step = { root:TNode|null; message:string; rotation?:string };

const h = (n:TNode|null) => n?.height || 0;
const clone = (n:TNode|null):TNode|null => n ? { ...n, left:clone(n.left), right:clone(n.right) } : null;
const refresh = (n:TNode) => { n.height = 1 + Math.max(h(n.left), h(n.right)); return n; };
const rotateRight = (y:TNode) => { const x=y.left!, t=x.right; x.right=y; y.left=t; refresh(y); return refresh(x); };
const rotateLeft = (x:TNode) => { const y=x.right!, t=y.left; y.left=x; x.right=t; refresh(x); return refresh(y); };

function insert(node:TNode|null, value:number, events:string[]):TNode {
  if (!node) return { value, left:null, right:null, height:1 };
  if (value < node.value) node.left = insert(node.left,value,events);
  else if (value > node.value) node.right = insert(node.right,value,events);
  else return node;
  refresh(node);
  const bf=h(node.left)-h(node.right);
  if (bf>1 && value<node.left!.value) { events.push(`${node.value} で右回転（LL型）`); return rotateRight(node); }
  if (bf<-1 && value>node.right!.value) { events.push(`${node.value} で左回転（RR型）`); return rotateLeft(node); }
  if (bf>1 && value>node.left!.value) { events.push(`${node.left!.value} で左回転 → ${node.value} で右回転（LR型）`); node.left=rotateLeft(node.left!); return rotateRight(node); }
  if (bf<-1 && value<node.right!.value) { events.push(`${node.right!.value} で右回転 → ${node.value} で左回転（RL型）`); node.right=rotateRight(node.right!); return rotateLeft(node); }
  return node;
}

function makeSteps(values:number[]):Step[] {
  let root:TNode|null=null; const steps:Step[]=[{root:null,message:"空のAVL木から始めます"}];
  values.forEach(value=>{ const events:string[]=[]; root=insert(root,value,events); steps.push({root:clone(root),message:`${value} を追加。各ノードの平衡係数を確認します`}); events.forEach(rotation=>steps.push({root:clone(root),message:rotation,rotation})); });
  return steps;
}

function layout(root:TNode|null) {
  const out:{node:TNode;x:number;y:number;parent?:{x:number;y:number}}[]=[];
  function walk(n:TNode|null,x:number,y:number,gap:number,parent?:{x:number;y:number}) { if(!n)return; out.push({node:n,x,y,parent}); walk(n.left,x-gap,y+92,Math.max(38,gap*.55),{x,y}); walk(n.right,x+gap,y+92,Math.max(38,gap*.55),{x,y}); }
  walk(root,360,45,155); return out;
}

export default function AvlLab({onAddNote}:{onAddNote:(text:string)=>void}) {
  const [values,setValues]=useState([30,20,10,25,28]); const [input,setInput]=useState(40); const [page,setPage]=useState(0);
  const steps=useMemo(()=>makeSteps(values),[values]); const step=steps[Math.min(page,steps.length-1)]; const items=layout(step.root);
  function add(){ if(values.includes(input))return; const next=[...values,input]; setValues(next); setPage(makeSteps(next).length-1); }
  function remove(){ const next=values.filter(v=>v!==input); setValues(next); setPage(Math.max(0,makeSteps(next).length-1)); }
  return <section className="lab-page">
    <div className="feature-hero"><span className="avl-icon">↻</span><div><p className="eyebrow">INTERACTIVE AVL LAB</p><h1>AVL木 回転ラボ</h1><p>追加・削除のあと、平衡係数と回転を1ページずつ追えます。</p></div></div>
    <div className="lab-controls panel"><div className="value-input"><input type="number" value={input} onChange={e=>setInput(Number(e.target.value))}/><button onClick={add}>＋ 追加</button><button className="danger" onClick={remove}>− 削除</button></div><div className="sequence">{values.map(v=><button key={v} onClick={()=>setInput(v)}>{v}</button>)}</div></div>
    <div className="avl-workspace panel">
      <div className="step-bar"><button onClick={()=>setPage(p=>Math.max(0,p-1))}>← 前へ</button><div><b>STEP {Math.min(page,steps.length-1)+1} / {steps.length}</b><span>{step.message}</span></div><button onClick={()=>setPage(p=>Math.min(steps.length-1,p+1))}>次へ →</button></div>
      <div className="avl-canvas">{items.map(({node,x,y,parent})=><div key={`${node.value}-${x}`}>{parent&&<i className="avl-edge" style={{left:parent.x+29,top:parent.y+29,width:Math.hypot(x-parent.x,y-parent.y),transform:`rotate(${Math.atan2(y-parent.y,x-parent.x)*180/Math.PI}deg)`}}/>}<button className={`avl-node ${Math.abs(h(node.left)-h(node.right))>1?"unbalanced":""}`} style={{left:x,top:y}} onClick={()=>setInput(node.value)}><b>{node.value}</b><small>BF {h(node.left)-h(node.right)}</small></button></div>)}</div>
      <div className="legend"><span><i className="ok"></i>| BF | ≤ 1</span><span><i className="bad"></i>回転が必要</span><button onClick={()=>onAddNote(`AVL木メモ：\n${step.message}\n平衡係数 BF = 左部分木の高さ − 右部分木の高さ`)}>このステップをノートへ</button></div>
    </div>
  </section>;
}
