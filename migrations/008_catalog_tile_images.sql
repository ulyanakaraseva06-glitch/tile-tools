-- Несколько исходных изображений (faces) для одной модели плитки.
-- Первая запись используется как обложка, остальные — при раскладке и в галерее.

CREATE TABLE IF NOT EXISTS tt_catalog_tile_images (
  tile_id VARCHAR(120) NOT NULL,
  media_id CHAR(36) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (tile_id, media_id),
  UNIQUE KEY uq_catalog_tile_image_order (tile_id, sort_order),
  INDEX idx_catalog_tile_image_media (media_id),
  CONSTRAINT fk_catalog_tile_image_tile FOREIGN KEY (tile_id) REFERENCES tt_catalog_tiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_tile_image_media FOREIGN KEY (media_id) REFERENCES tt_media_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
