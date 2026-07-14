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

type LineGuide={line:number;code:string;description:string;scope:string;kind:string};
function explainLines(source:string):LineGuide[]{
  const blocks:{indent:number;label:string}[]=[];
  return source.split("\n").map((raw,index)=>{
    const text=raw.trim();
    const indent=raw.match(/^ */)?.[0].length||0;
    while(blocks.length&&indent<=blocks[blocks.length-1].indent)blocks.pop();
    const scope=blocks.at(-1)?.label||"トップレベル";
    let description="この式または処理をPythonが評価します。",kind="処理";
    if(!text){description="処理を読みやすく区切る空行です。実行結果には影響しません。";kind="空行";}
    else if(text.startsWith("#")){description="実行されないコメントです。コードの目的や注意点を人向けに残します。";kind="コメント";}
    else if(/^from\s+\S+\s+import\s+/.test(text)){const match=text.match(/^from\s+(\S+)\s+import\s+(.+)/);description=`${match?.[1]}から${match?.[2]}を読み込み、この後のコードで使えるようにします。`;kind="読み込み";}
    else if(/^import\s+/.test(text)){description=`${text.replace(/^import\s+/,"")}を読み込み、用意されている機能を使えるようにします。`;kind="読み込み";}
    else if(/^def\s+/.test(text)){const match=text.match(/^def\s+(\w+)\s*\((.*?)\)/);description=`関数${match?.[1]||""}を定義します。${match?.[2]?`受け取る引数は ${match[2]} です。`:"引数はありません。"}この時点では中身はまだ実行されません。`;kind="関数定義";}
    else if(/^class\s+/.test(text)){const name=text.match(/^class\s+(\w+)/)?.[1];description=`${name||"新しいclass"}という設計図を定義します。中にデータと処理をまとめられます。`;kind="class";}
    else if(/^for\s+/.test(text)){const match=text.match(/^for\s+(.+?)\s+in\s+(.+?):/);description=`${match?.[2]||"対象"}から要素を1つずつ取り出し、${match?.[1]||"変数"}に入れて内側の処理を繰り返します。`;kind="繰り返し";}
    else if(/^while\s+/.test(text)){description=`条件「${text.replace(/^while\s+/,"").replace(/:$/,"")}」がTrueの間、内側の処理を繰り返します。`;kind="繰り返し";}
    else if(/^if\s+/.test(text)){description=`条件「${text.replace(/^if\s+/,"").replace(/:$/,"")}」を確認し、Trueなら字下げされた処理へ進みます。`;kind="条件分岐";}
    else if(/^elif\s+/.test(text)){description=`前の条件がFalseだった場合に、追加の条件「${text.replace(/^elif\s+/,"").replace(/:$/,"")}」を確認します。`;kind="条件分岐";}
    else if(/^else\s*:/.test(text)){description="直前のif／elif条件がどれもFalseだった場合に、内側の処理を実行します。";kind="条件分岐";}
    else if(/^return\b/.test(text)){description=`関数の処理をここで終了し、${text.replace(/^return\s*/,"")||"値なし"}を呼び出し元へ返します。`;kind="返り値";}
    else if(/^print\s*\(/.test(text)){description=`括弧内の値 ${text.slice(text.indexOf("(")+1,-1)} を出力欄に表示します。`;kind="出力";}
    else if(/\.append\s*\(/.test(text)){const match=text.match(/^(\w+)\.append\((.*)\)/);description=`List ${match?.[1]||""} の末尾に ${match?.[2]||"値"} を追加します。`;kind="List操作";}
    else if(/^break\b/.test(text)){description="現在のfor／whileループをここで終了し、ループの次へ進みます。";kind="制御";}
    else if(/^continue\b/.test(text)){description="この周の残りを飛ばし、次の繰り返しへ進みます。";kind="制御";}
    else if(/^try\s*:/.test(text)){description="エラーが起きる可能性のある処理を試します。エラー時はexceptへ移ります。";kind="エラー処理";}
    else if(/^except\b/.test(text)){description="try内で指定されたエラーが起きた場合に、この内側の処理を実行します。";kind="エラー処理";}
    else if(/^[A-Za-z_]\w*\s*=/.test(text)){const match=text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)/);description=`右側の ${match?.[2]||"値"} を評価し、変数 ${match?.[1]||""} に保存します。`;kind="代入";}
    else if(/^[A-Za-z_]\w*\s*\(.*\)/.test(text)){const name=text.match(/^([A-Za-z_]\w*)/)?.[1];description=`関数 ${name||""} を呼び出し、括弧内の値を渡して処理を実行します。`;kind="関数呼出";}
    if(text.endsWith(":"))blocks.push({indent,label:kind});
    return{line:index+1,code:raw,description,scope,kind};
  });
}

export default function PythonLab({onAddNote}:{onAddNote:(text:string)=>void}) {
  const [code,setCode]=useState("numbers = [8, 3, 10, 1, 6]\n\nfor value in numbers:\n    if value < 8:\n        print(f\"{value} は 8 の左側\")\n    else:\n        print(f\"{value} は 8 以上\")");
  const [output,setOutput]=useState("実行ボタンを押すと、ここに結果が表示されます。"); const [running,setRunning]=useState(false); const [loaded,setLoaded]=useState(false);
  async function getPython(){ if(window.__pyodide)return window.__pyodide; if(!window.loadPyodide){ await new Promise<void>((resolve,reject)=>{const s=document.createElement("script");const timer=window.setTimeout(()=>reject(new Error("Pythonの準備に時間がかかっています。通信を確認してもう一度実行してください。")),45000);s.src=CDN+"pyodide.js";s.crossOrigin="anonymous";s.onload=()=>{window.clearTimeout(timer);resolve();};s.onerror=()=>{window.clearTimeout(timer);reject(new Error("Python実行環境を読み込めませんでした"));};document.head.appendChild(s);}); } window.__pyodide=await window.loadPyodide!({indexURL:CDN}); setLoaded(true); return window.__pyodide; }
  async function run(){const prepared=repairIndentation(code);if(prepared!==code)setCode(prepared);setRunning(true);setOutput("Pythonを準備しています…（初回は少し時間がかかります）");try{const py=await getPython();let text="";py.setStdout({batched:(s:string)=>{text+=s+"\n";}});py.setStderr({batched:(s:string)=>{text+=s+"\n";}});await py.loadPackagesFromImports(prepared);const result=await py.runPythonAsync(prepared);if(result!==undefined&&result!==null)text+=String(result);setOutput(text.trim()||"実行できました（printによる出力はありません）");}catch(e){setOutput(readableError(e,prepared));}finally{setRunning(false);}}
  const guide=explain(code,output);
  const lineGuides=explainLines(code);
  const guideText=lineGuides.filter(line=>line.code.trim()).map(line=>`${line.line}行目「${line.code.trim()}」\n→ ${line.description}`).join("\n\n");
  return <section className="lab-page"><div className="feature-hero"><span className="python-icon">Py</span><div><p className="eyebrow">PYTHON PLAYGROUND</p><h1>Python Lab</h1><p>コードを書いて、その場で出力とポイントを確認できます。</p></div></div>
    <div className="python-grid"><div className="code-panel panel"><div className="code-head"><b>main.py</b><span>{loaded?"● Python 準備完了":"初回のみPythonを読み込みます"}</span></div><div className="python-indent-note"><b>Pythonは字下げが文法です</b><span>コピペ時のタブ・全角空白・共通の余白は自動で整えます。</span></div><textarea value={code} onChange={e=>setCode(e.target.value)} onPaste={e=>{const text=e.clipboardData.getData("text/plain");if(text){e.preventDefault();setCode(repairIndentation(text));}}} spellCheck={false}/><div className="code-actions"><button onClick={()=>setCode("")}>クリア</button><button onClick={()=>setCode(repairIndentation(code))}>インデントを整える</button><button className="run" onClick={run} disabled={running}>{running?"実行中…":"▶ 実行する"}</button></div></div>
      <div className="result-column"><div className="output-panel panel"><div className="code-head"><b>出力</b><span>OUTPUT</span></div><pre>{output}</pre></div><div className="explain-panel panel"><p className="eyebrow">OVERVIEW</p><b>コード全体のポイント</b><p>{guide}</p></div></div></div>
    <section className="line-explain-panel panel"><div className="line-explain-head"><div><p className="eyebrow">LINE BY LINE</p><h2>1行ずつの解説</h2><p>コードは上から順に実行されます。字下げされた行は、表示されたブロックの中で動きます。</p></div><button onClick={()=>onAddNote(`Pythonコード：\n${code}\n\n出力：\n${output}\n\n全体のポイント：\n${guide}\n\n行ごとの解説：\n${guideText}`)}>＋ 解説ごとノートに追加</button></div><div className="line-guide-list">{lineGuides.map(line=><article key={line.line} className={line.code.trim()?"":"blank-line"}><span className="line-number">{line.line}</span><div className="line-code"><small>{line.scope}</small><code>{line.code||"（空行）"}</code></div><div className="line-description"><b>{line.kind}</b><p>{line.description}</p></div></article>)}</div></section>
  </section>;
}
