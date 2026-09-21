import React from 'react';
import {createRoot} from 'react-dom/client';
import {pageTemplates} from '../src/data/pageTemplates';
import {PdfPageRenderer} from '../src/components/PdfPageRenderer/PdfPageRenderer';
import '../src/styles/globals.css';
import '../src/styles/themes.css';
const params = new URLSearchParams(location.search);
const start = Number(params.get('start') || 0);
const landscape = params.get('format') === 'landscape';
const scale = .25;
const width = landscape ? 1123 : 794;
const height = landscape ? 794 : 1123;
createRoot(document.getElementById('root')!).render(<><style>{`body{overflow:auto!important;background:#dadadd;padding:20px} .review-grid{width:1200px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.review-card{background:white;padding:12px;min-width:0}.review-card h2{font:12px Segoe UI;height:32px}.review-page{width:${width*scale}px;height:${height*scale}px;position:relative}.review-page>.pdf-page{transform:scale(${scale});transform-origin:top left;box-shadow:none}`}</style><h1>Шаблоны {start+1}–{Math.min(start+8,pageTemplates.length)} / {pageTemplates.length}</h1><nav>{Array.from({length:Math.ceil(pageTemplates.length/8)},(_,i)=><a style={{marginRight:12}} href={`?start=${i*8}&format=${landscape?'landscape':'portrait'}`}>{i+1}</a>)}<a href={`?start=${start}&format=${landscape?'portrait':'landscape'}`}>Ориентация</a></nav><div className="review-grid">{pageTemplates.slice(start,start+8).map((t,i)=><article className="review-card" key={t.id}><h2>{start+i+1}. {t.title}</h2><div className="review-page"><PdfPageRenderer page={{id:t.id,templateId:t.id,title:t.title,order:start+i,zones:t.defaultZones}} pageFormat={landscape?'a4_landscape':'a4_portrait'} /></div></article>)}</div></>);

