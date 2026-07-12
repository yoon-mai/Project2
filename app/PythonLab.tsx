"use client";

import { useState } from "react";

declare global { interface Window { loadPyodide?: (options:{indexURL:string})=>Promise<any>; __pyodide?:any } }
const CDN="https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

function explain(code:string, output:string) {
  if(code.includes("for ")) return `forループが要素を順番に処理しています。今回の出力は「${output.trim().split("\n").slice(-1)[0]||"なし"}」です。range()の開始・終了値に注目してみよう。`;
  if(code.includes("def ")) return "defで関数を定義し、呼び出した時だけ中の処理が実行されます。引数とreturnで、入力から出力を作っています。";
  if(code.includes("class ")) return "classでデータと処理をひとまとめにしています。インスタンスごとに異なる状態を持てるのがポイントです。";
  return "コードは上から順に評価され、print()に渡された値が出力欄に表示されます。値を少し変えて、結果の違いを確かめてみよう。";
}

export default function PythonLab({onAddNote}:{onAddNote:(text:string)=>void}) {
  const [code,setCode]=useState("numbers = [8, 3, 10, 1, 6]\n\nfor value in numbers:\n    if value < 8:\n        print(f\"{value} は 8 の左側\")\n    else:\n        print(f\"{value} は 8 以上\")");
  const [output,setOutput]=useState("実行ボタンを押すと、ここに結果が表示されます。"); const [running,setRunning]=useState(false); const [loaded,setLoaded]=useState(false);
  async function getPython(){ if(window.__pyodide)return window.__pyodide; if(!window.loadPyodide){ await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");s.src=CDN+"pyodide.js";s.onload=()=>resolve();s.onerror=()=>reject(new Error("Python実行環境を読み込めませんでした"));document.head.appendChild(s);}); } window.__pyodide=await window.loadPyodide!({indexURL:CDN}); setLoaded(true); return window.__pyodide; }
  async function run(){ setRunning(true); setOutput("Pythonを準備しています…"); try{const py=await getPython(); let text=""; py.setStdout({batched:(s:string)=>{text+=s+"\n";}}); py.setStderr({batched:(s:string)=>{text+=s+"\n";}}); await py.loadPackagesFromImports(code); const result=await py.runPythonAsync(code); if(result!==undefined&&result!==null)text+=String(result); setOutput(text.trim()||"（出力はありません）");}catch(e){setOutput(`エラー：${e instanceof Error?e.message:String(e)}`);}finally{setRunning(false);}}
  const guide=explain(code,output);
  return <section className="lab-page"><div className="feature-hero"><span className="python-icon">Py</span><div><p className="eyebrow">PYTHON PLAYGROUND</p><h1>Python Lab</h1><p>コードを書いて、その場で出力とポイントを確認できます。</p></div></div>
    <div className="python-grid"><div className="code-panel panel"><div className="code-head"><b>main.py</b><span>{loaded?"● Python 準備完了":"ブラウザ内で安全に実行"}</span></div><textarea value={code} onChange={e=>setCode(e.target.value)} spellCheck={false}/><div className="code-actions"><button onClick={()=>setCode("")}>クリア</button><button className="run" onClick={run} disabled={running}>{running?"実行中…":"▶ 実行する"}</button></div></div>
      <div className="result-column"><div className="output-panel panel"><div className="code-head"><b>出力</b><span>OUTPUT</span></div><pre>{output}</pre></div><div className="explain-panel panel"><p className="eyebrow">POINT</p><b>このコードのポイント</b><p>{guide}</p><button onClick={()=>onAddNote(`Pythonコード：\n${code}\n\n出力：\n${output}\n\nポイント：\n${guide}`)}>＋ 自分のノートに追加</button></div></div></div>
  </section>;
}
