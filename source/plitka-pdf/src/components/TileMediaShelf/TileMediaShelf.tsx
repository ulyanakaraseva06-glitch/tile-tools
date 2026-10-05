import { useEffect, useMemo, useState } from 'react';
import { GripVertical, Image as ImageIcon, Search } from 'lucide-react';

type CatalogTile = {
  id: string;
  name: string;
  shortName: string | null;
  brand: string | null;
  article: string | null;
  sizes: string[];
  surfaces: string[];
  previewUrl: string | null;
  imageUrls: string[];
  hex: string;
};

export function TileMediaShelf() {
  const [tiles, setTiles] = useState<CatalogTile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/catalog/tiles.php')
      .then((response) => response.json())
      .then((payload) => setTiles(payload.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('ru');
    return tiles.filter((tile) => !search || `${tile.name} ${tile.shortName ?? ''} ${tile.brand ?? ''} ${tile.article ?? ''}`.toLocaleLowerCase('ru').includes(search));
  }, [tiles, query]);

  return (
    <section className="tile-media-shelf">
      <header><span><ImageIcon size={15} /><b>Медиатека</b></span><small>{visible.length}</small></header>
      <label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти плитку" /></label>
      <p>Перетащите карточку на страницу — добавятся изображение и характеристики товара.</p>
      {loading ? <div className="tile-media-status">Загрузка…</div> : (
        <div className="tile-media-cards">
          {visible.map((tile) => {
            const image = tile.previewUrl || tile.imageUrls?.[0] || '';
            const payload = {
              id: tile.id,
              name: tile.shortName || tile.name,
              brand: tile.brand || '',
              article: tile.article || '',
              size: tile.sizes?.[0] || '',
              surface: tile.surfaces?.[0] || '',
              image,
              hex: tile.hex
            };
            return <article key={tile.id} draggable onDragStart={(event) => { event.dataTransfer.setData('application/x-pdf-product', JSON.stringify(payload)); event.dataTransfer.effectAllowed = 'copy'; }}>
              <span className="tile-media-image">{image ? <img src={image} alt="" /> : <i style={{ background: tile.hex }} />}</span>
              <span className="tile-media-copy"><strong>{tile.shortName || tile.name}</strong><small>{tile.sizes?.[0] || 'Размер не указан'}</small></span>
              <GripVertical size={15} />
            </article>;
          })}
          {!visible.length && <div className="tile-media-status">Ничего не найдено</div>}
        </div>
      )}
    </section>
  );
}
