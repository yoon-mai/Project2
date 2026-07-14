"use client";

import { useState } from "react";

declare global { interface Window { loadPyodide?: (options:{indexURL:string})=>Promise<any>; __pyodide?:any } }
const CDN="https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

function normalizeCode(raw:string){
  const lines=raw.replace(/\r\n?/g,"\n").replace(/\t/g,"    ").replace(/\u00a0/g," ").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").split("\n");
  while(lines[0]?.trim()==="")lines.shift();
  while(lines.at(-1)?.trim()==="")lines.pop();
  const indents=lines.filter(line=>line.trim()).map(line=>line.match(/^ */)?.[0].length||0);
  const common=indents.length?Math.min(...indents):0;
  return lines.map(line=>line.slice(Math.min(common,line.length)).replace(/[ \t]+$/g,"")).join("\n");
}

function needsIndentRepair(source:string){
  const lines=source.split("\n");
  for(let i=0;i<lines.length-1;i++){
    if(!/:\s*(#.*)?$/.test(lines[i].trim()))continue;
    const current=lines[i].match(/^ */)?.[0].length||0;
    const next=lines.slice(i+1).find(line=>line.trim());
    if(next&&(next.match(/^ */)?.[0].length||0)<=current)return true;
  }
  return false;
}

function repairIndentation(source:string){
  const normalized=normalizeCode(source);
  if(!needsIndentRepair(normalized))return normalized;
  let level=0;
  return normalized.split("\n").map(line=>{
    const text=line.trim();
    if(!text){level=0;return "";}
    if(/^(elif\b|else\s*:|except\b|finally\s*:|case\b)/.test(text))level=Math.max(0,level-1);
    const result=`${"    ".repeat(level)}${text}`;
    if(/:\s*(#.*)?$/.test(text))level+=1;
    return result;
  }).join("\n");
}

function readableError(error:unknown,source:string){
  const raw=error instanceof Error?(error.stack||error.message):String(error);
  const line=raw.match(/File "<exec>", line (\d+)/)?.[1]||raw.match(/line (\d+)/i)?.[1];
  const kind=raw.match(/(IndentationError|SyntaxError|NameError|TypeError|IndexError|KeyError|ValueError):\s*([^\n]+)/);
  const codeLine=line?source.split("\n")[Number(line)-1]:"";
  const advice=raw.includes("IndentationError")?"if・for・while・def の次の行は、先頭を4スペース下げてください。":raw.includes("SyntaxError")?"記号・コロン（:）・括弧・引用符が揃っているか確認してください。":"エラーが出た行と、その直前で作った変数を確認してください。";
  return [`実行エラー${kind?`：${kind[1]}`:""}`,line?`場所：${line}行目${codeLine?`  ${codeLine.trim()}`:""}`:"",kind?.[2]||raw.split("\n").slice(-1)[0],"",`ヒント：${advice}`].filter(Boolean).join("\n");
}

function explain(code:string, output:string) {
  if(code.includes("for ")) return `forループが要素を順番に処理しています。今回の出力は「${output.trim().split("\n").slice(-1)[0]||"なし"}」です。range()の開始・終了値に注目してみよう。`;
  if(code.includes("def ")) return "defで関数を定義し、呼び出した時だけ中の処理が実行されます。引数とreturnで、入力から出力を作っています。";
  if(code.includes("class ")) return "classでデータと処理をひとまとめにしています。インスタンスごとに異なる状態を持てるのがポイントです。";
  return "コードは上から順に評価され、print()に渡された値が出力欄に表示されます。値を少し変えて、結果の違いを確かめてみよう。";
}

export default function PythonLab({onAddNote}:{onAddNote:(text:string)=>void}) {
  const [code,setCode]=useState("numbers = [8, 3, 10, 1, 6]\n\nfor value in numbers:\n    if value < 8:\n        print(f\"{value} は 8 の左側\")\n    else:\n        print(f\"{value} は 8 以上\")");
  const [output,setOutput]=useState("実行ボタンを押すと、ここに結果が表示されます。"); const [running,setRunning]=useState(false); const [loaded,setLoaded]=useState(false);
  async function getPython(){ if(window.__pyodide)return window.__pyodide; if(!window.loadPyodide){ await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");const timer=window.setTimeout(()=>reject(new Error("Pythonの準備に時間がかかっています。通信を確認してもう一度実行してください。")),45000);s.src=CDN+"pyodide.js";s.crossOrigin="anonymous";s.onload=()=>{window.clearTimeout(timer);resolve();};s.onerror=()=>{window.clearTimeout(timer);reject(new Error("Python実行環境を読み込めませんでした"));};document.head.appendChild(s);}); } window.__pyodide=await window.loadPyodide!({indexURL:CDN}); setLoaded(true); return window.__pyodide; }
  async function run(){const prepared=repairIndentation(code);if(prepared!==code)setCode(prepared);setRunning(true);setOutput("Pythonを準備しています…（初回は少し時間がかかります）");try{const py=await getPython();let text="";py.setStdout({batched:(s:string)=>{text+=s+"\n";}});py.setStderr({batched:(s:string)=>{text+=s+"\n";}});await py.loadPackagesFromImports(prepared);const result=await py.runPythonAsync(prepared);if(result!==undefined&&result!==null)text+=String(result);setOutput(text.trim()||"実行できました（printによる出力はありません）");}catch(e){setOutput(readableError(e,prepared));}finally{setRunning(false);}}
  const guide=explain(code,output);
  return <section className="lab-page"><div className="feature-hero"><span className="python-icon">Py</span><div><p className="eyebrow">PYTHON PLAYGROUND</p><h1>Python Lab</h1><p>コードを書いて、その場で出力とポイントを確認できます。</p></div></div>
    <div className="python-grid"><div className="code-panel panel"><div className="code-head"><b>main.py</b><span>{loaded?"● Python 準備完了":"初回のみPythonを読み込みます"}</span></div><div className="python-indent-note"><b>Pythonは字下げが文法です</b><span>コピペ時のタブ・全角空白・共通の余白は自動で整えます。</span></div><textarea value={code} onChange={e=>setCode(e.target.value)} onPaste={e=>{const text=e.clipboardData.getData("text/plain");if(text){e.preventDefault();setCode(repairIndentation(text));}}} spellCheck={false}/><div className="code-actions"><button onClick={()=>setCode("")}>クリア</button><button onClick={()=>setCode(repairIndentation(code))}>インデントを整える</button><button className="run" onClick={run} disabled={running}>{running?"実行中…":"▶ 実行する"}</button></div></div>
      <div className="result-column"><div className="output-panel panel"><div className="code-head"><b>出力</b><span>OUTPUT</span></div><pre>{output}</pre></div><div className="explain-panel panel"><p className="eyebrow">POINT</p><b>このコードのポイント</b><p>{guide}</p><button onClick={()=>onAddNote(`Pythonコード：\n${code}\n\n出力：\n${output}\n\nポイント：\n${guide}`)}>＋ 自分のノートに追加</button></div></div></div>
  </section>;
}
