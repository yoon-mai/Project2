"use client";

import { useMemo, useState } from "react";

type TNode={value:number;left:TNode|null;right:TNode|null;height:number};
type Step={root:TNode|null;message:string;path:number[];kind:"path"|"insert"|"rotate"|"done"};
const h=(n:TNode|null)=>n?.height||0;
const clone=(n:TNode|null):TNode|null=>n?{...n,left:clone(n.left),right:clone(n.right)}:null;
const refresh=(n:TNode)=>{n.height=1+Math.max(h(n.left),h(n.right));return n;};
const right=(y:TNode)=>{const x=y.left!,t=x.right;x.right=y;y.left=t;refresh(y);return refresh(x);};
const left=(x:TNode)=>{const y=x.right!,t=y.left;y.left=x;x.right=t;refresh(x);return refresh(y);};

function rawInsert(root:TNode|null,value:number){
  if(!root)return {root:{value,left:null,right:null,height:1} as TNode,path:[]};
  const path:number[]=[];let n=root;
  while(true){path.push(n.value);if(value<n.value){if(!n.left){n.left={value,left:null,right:null,height:1};break;}n=n.left;}else{if(!n.right){n.right={value,left:null,right:null,height:1};break;}n=n.right;}}
  const rec=(x:TNode|null):number=>{if(!x)return 0;x.height=1+Math.max(rec(x.left),rec(x.right));return x.height;};rec(root);return {root,path};
}
function balance(n:TNode|null,events:string[]):TNode|null{
  if(!n)return null;n.left=balance(n.left,events);n.right=balance(n.right,events);refresh(n);const bf=h(n.left)-h(n.right);
  if(bf>1){if(h(n.left!.left)<h(n.left!.right)){events.push(`${n.left!.value} を左回転（LRの1段階目）`);n.left=left(n.left!);}events.push(`${n.value} を右回転`);return right(n);}
  if(bf<-1){if(h(n.right!.right)<h(n.right!.left)){events.push(`${n.right!.value} を右回転（RLの1段階目）`);n.right=right(n.right!);}events.push(`${n.value} を左回転`);return left(n);}return n;
}
function makeSteps(values:number[]):Step[]{let root:TNode|null=null;const steps:Step[]=[{root:null,message:"空のAVL木から始めます",path:[],kind:"done"}];values.forEach(value=>{const raw=rawInsert(root,value);root=raw.root;raw.path.forEach((v,i)=>steps.push({root:clone(root),message:`${value} と ${v} を比較 → ${value<v?"左":"右"}へ進む`,path:raw.path.slice(0,i+1),kind:"path"}));steps.push({root:clone(root),message:`${value} を空いている位置へ追加。まだ回転前です`,path:[...raw.path,value],kind:"insert"});const events:string[]=[];root=balance(root,events);events.forEach(message=>steps.push({root:clone(root),message,path:[],kind:"rotate"}));steps.push({root:clone(root),message:`${value} の追加と平衡化が完了しました`,path:[],kind:"done"});});return steps;}
function layout(root:TNode|null){const out:{node:TNode;x:number;y:number;parent?:{x:number;y:number}}[]=[];function walk(n:TNode|null,x:number,y:number,gap:number,parent?:{x:number;y:number}){if(!n)return;out.push({node:n,x,y,parent});walk(n.left,x-gap,y+92,Math.max(38,gap*.55),{x,y});walk(n.right,x+gap,y+92,Math.max(38,gap*.55),{x,y});}walk(root,360,45,155);return out;}

export default function AvlLab({onAddNote}:{onAddNote:(text:string)=>void}){
  const[values,setValues]=useState([30,20,10,25,28]);const[input,setInput]=useState(40);const[page,setPage]=useState(0);const[red,setRed]=useState<number[]>([]);
  const steps=useMemo(()=>makeSteps(values),[values]);const step=steps[Math.min(page,steps.length-1)],items=layout(step.root);
  function add(){if(values.includes(input))return;const next=[...values,input];setValues(next);setPage(makeSteps(next).length-1);}
  function remove(){const next=values.filter(v=>v!==input);setValues(next);setRed(v=>v.filter(x=>x!==input));setPage(Math.max(0,makeSteps(next).length-1));}
  function markRed(){if(!values.includes(input))return;setRed(v=>v.includes(input)?v.filter(x=>x!==input):[...v,input]);}
  return <section className="lab-page"><div className="feature-hero"><span className="avl-icon">↻</span><div><p className="eyebrow">INTERACTIVE AVL LAB</p><h1>AVL木 回転ラボ</h1><p>比較の道のり、挿入直後、回転、完了までを1ページずつ追えます。</p></div></div>
    <div className="lab-controls panel"><div className="value-input"><input type="number" value={input} onChange={e=>setInput(Number(e.target.value))}/><button onClick={add}>＋ 追加</button><button className="danger" onClick={remove}>− 削除</button><button className="red-action" onClick={markRed}>● 赤を指定</button></div><div className="sequence">{values.map(v=><button key={v} className={red.includes(v)?"red-value":""} onClick={()=>setInput(v)}>{v}</button>)}</div></div>
    <div className="avl-workspace panel"><div className="step-bar"><button onClick={()=>setPage(p=>Math.max(0,p-1))}>← 前へ</button><div><b>{step.kind.toUpperCase()} · STEP {Math.min(page,steps.length-1)+1} / {steps.length}</b><span>{step.message}</span></div><button onClick={()=>setPage(p=>Math.min(steps.length-1,p+1))}>次へ →</button></div>
      <div className="avl-canvas">{items.map(({node,x,y,parent})=><div key={`${node.value}-${x}`}>{parent&&<i className="avl-edge" style={{left:parent.x+29,top:parent.y+29,width:Math.hypot(x-parent.x,y-parent.y),transform:`rotate(${Math.atan2(y-parent.y,x-parent.x)*180/Math.PI}deg)`}}/>}<button className={`avl-node ${Math.abs(h(node.left)-h(node.right))>1?"unbalanced":""} ${step.path.includes(node.value)?"on-path":""} ${red.includes(node.value)?"red-marked":""}`} style={{left:x,top:y}} onClick={()=>setInput(node.value)} onDoubleClick={()=>setRed(v=>v.includes(node.value)?v.filter(x=>x!==node.value):[...v,node.value])}><b>{node.value}</b><small>BF {h(node.left)-h(node.right)}</small></button></div>)}</div>
      <div className="legend"><span><i className="ok"></i>| BF | ≤ 1</span><span><i className="path-dot"></i>比較した道</span><span><i className="bad"></i>回転が必要</span><button onClick={()=>onAddNote(`AVL木メモ：\n${step.message}\n通った道：${step.path.join(" → ")||"—"}\n平衡係数 BF = 左の高さ − 右の高さ`)}>このステップをノートへ</button></div></div></section>;
}
