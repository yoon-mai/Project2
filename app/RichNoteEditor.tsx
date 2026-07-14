"use client";

import { useEffect, useRef } from "react";

export default function RichNoteEditor({value,onChange,notes,onOpenNote,onUploadImage}:{value:string;onChange:(v:string)=>void;notes:string[];onOpenNote:(name:string)=>void;onUploadImage?:(file:File)=>Promise<string>}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value.includes("<")?value:value.split("\n").map(x=>`<p>${x||"<br>"}</p>`).join("");},[value]);
  const cmd=(name:string,arg?:string)=>{document.execCommand(name,false,arg);ref.current?.focus();onChange(ref.current?.innerHTML||"");};
  async function image(file?:File){if(!file)return;if(onUploadImage){try{cmd("insertImage",await onUploadImage(file));return;}catch{}}const reader=new FileReader();reader.onload=()=>cmd("insertImage",String(reader.result));reader.readAsDataURL(file);}
  function link(){const url=window.prompt("リンク先URL","https://");if(url)cmd("createLink",url);}
  function noteLink(name:string){if(!name)return;cmd("insertHTML",`<a href="#note:${encodeURIComponent(name)}" data-note="${name}">📎 ${name}</a>`);}
  return <div className="rich-editor"><div className="rich-toolbar"><select aria-label="文字サイズ" onChange={e=>cmd("fontSize",e.target.value)} defaultValue="3"><option value="2">小</option><option value="3">標準</option><option value="4">大</option><option value="5">特大</option></select><label className="color-tool" title="文字色"><input type="color" onChange={e=>cmd("foreColor",e.target.value)}/><span>A</span></label><button onClick={()=>cmd("bold")}><b>B</b></button><button onClick={()=>cmd("italic")}><i>I</i></button><button onClick={()=>cmd("insertUnorderedList")}>• List</button><button onClick={link}>🔗 URL</button><label className="image-tool">▧ 画像<input type="file" accept="image/*" onChange={e=>image(e.target.files?.[0])}/></label><select aria-label="関連ノート" onChange={e=>{noteLink(e.target.value);e.target.value=""}} defaultValue=""><option value="">関連ノート</option>{notes.map(n=><option key={n} value={n}>{n}</option>)}</select></div><div ref={ref} className="rich-surface" contentEditable suppressContentEditableWarning onInput={()=>onChange(ref.current?.innerHTML||"")} onPaste={e=>{const file=[...e.clipboardData.files].find(f=>f.type.startsWith("image/"));if(file){e.preventDefault();image(file);}}} onClick={e=>{const a=(e.target as HTMLElement).closest("a[data-note]") as HTMLElement|null;if(a){e.preventDefault();onOpenNote(a.dataset.note||"");}}}/><p className="editor-help">スクリーンショットはペーストできます。画像もノートと一緒にクラウドへ保存されます。</p></div>;
}
