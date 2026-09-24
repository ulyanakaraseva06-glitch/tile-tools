import { useEffect, useMemo, useState } from 'react';

type CatalogAttribute = { name?: string; values?: string[] };
type CatalogTile = {
  id:string; name:string; shortName:string|null; brand:string|null; article:string|null;
  sizes:string[]; surfaces:string[]; previewUrl:string|null; imageUrls:string[]; imageCount:number;
  attributes:CatalogAttribute[]; hex:string; isFavorite:boolean;
};
const FAVORITES_KEY='tt_tile_favorites_v1';
function getLocal(){try{return new Set<string>(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'));}catch{return new Set<string>();}}
function csrf(){return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content||window.parent?.document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content||'';}

export function SharedTilePicker({onSelect,onClose}:{onSelect:(tile:CatalogTile)=>void;onClose:()=>void}){
  const [tiles,setTiles]=useState<CatalogTile[]>([]); const [favorites,setFavorites]=useState(getLocal); const [query,setQuery]=useState(''); const [surface,setSurface]=useState(''); const [activeTile,setActiveTile]=useState<CatalogTile|null>(null); const [activeImage,setActiveImage]=useState(0);
  useEffect(()=>{fetch('/api/catalog/tiles.php').then((r)=>r.json()).then((data)=>{const items=data.items||[];setTiles(items);if(data.authenticated)setFavorites(new Set(items.filter((tile:CatalogTile)=>tile.isFavorite).map((tile:CatalogTile)=>tile.id)));});},[]);
  const surfaces=useMemo(()=>[...new Set(tiles.flatMap((tile)=>tile.surfaces||[]))].sort(),[tiles]);
  const visible=useMemo(()=>tiles.filter((tile)=>(!surface||tile.surfaces?.includes(surface))&&(!query||`${tile.name} ${tile.shortName||''} ${tile.article||''}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')))).sort((a,b)=>Number(favorites.has(b.id))-Number(favorites.has(a.id))||(a.shortName||a.name).localeCompare(b.shortName||b.name,'ru')),[tiles,surface,query,favorites]);
  async function toggle(id:string){const adding=!favorites.has(id);const next=new Set(favorites);if(adding)next.add(id);else next.delete(id);setFavorites(next);localStorage.setItem(FAVORITES_KEY,JSON.stringify([...next]));await fetch('/api/favorites/index.php',{method:adding?'PUT':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:csrf(),entityType:'tile',entityId:id})});}
  function openTile(tile:CatalogTile){setActiveTile(tile);setActiveImage(0);}
  const images=activeTile?(activeTile.imageUrls?.length?activeTile.imageUrls:[activeTile.previewUrl].filter((item):item is string=>Boolean(item))):[];
  return <div className="shared-media-picker">
    <div className="shared-media-heading"><strong>Медиатека плитки</strong><button type="button" onClick={onClose}>×</button></div>
    <div className="shared-media-filters"><input placeholder="Поиск по названию или артикулу" value={query} onChange={(e)=>setQuery(e.target.value)}/><select value={surface} onChange={(e)=>setSurface(e.target.value)}><option value="">Все поверхности</option>{surfaces.map((item)=><option key={item}>{item}</option>)}</select></div>
    <div className="shared-media-grid">{visible.map((tile)=><article key={tile.id}><button type="button" className={favorites.has(tile.id)?'shared-media-heart active':'shared-media-heart'} onClick={()=>void toggle(tile.id)}>{favorites.has(tile.id)?'♥':'♡'}</button><button type="button" className="shared-media-select" onClick={()=>openTile(tile)}>{tile.previewUrl?<img src={tile.previewUrl} alt=""/>:<span style={{background:tile.hex}}/>}<strong>{tile.shortName||tile.name}</strong><small>{tile.sizes[0]||''} · {tile.imageCount||tile.imageUrls?.length||1} рисунков</small></button></article>)}</div>
    {activeTile?<div className="shared-media-detail" role="dialog" aria-modal="true" aria-label={`Варианты ${activeTile.shortName||activeTile.name}`}>
      <div className="shared-media-detail-heading"><button type="button" onClick={()=>setActiveTile(null)}>← Каталог</button><strong>{activeTile.shortName||activeTile.name}</strong><button type="button" className={favorites.has(activeTile.id)?'active':''} onClick={()=>void toggle(activeTile.id)}>{favorites.has(activeTile.id)?'♥':'♡'}</button></div>
      <div className="shared-media-detail-preview">{images[activeImage]?<img src={images[activeImage]} alt=""/>:<span style={{background:activeTile.hex}}/>}</div>
      <div className="shared-media-detail-meta"><span>{activeTile.article?`Артикул ${activeTile.article}`:'Артикул не указан'}</span><span>{activeTile.sizes.join(', ')}</span><span>{activeTile.surfaces.join(', ')}</span></div>
      <div className="shared-media-variants">{images.map((url,index)=><button type="button" className={index===activeImage?'active':''} key={url} onClick={()=>setActiveImage(index)}><img src={url} alt={`Рисунок ${index+1}`}/></button>)}</div>
      <button type="button" className="shared-media-apply" disabled={!images[activeImage]} onClick={()=>images[activeImage]&&onSelect({...activeTile,previewUrl:images[activeImage]})}>Добавить выбранный рисунок</button>
    </div>:null}
  </div>;
}
