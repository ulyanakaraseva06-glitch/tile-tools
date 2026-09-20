-- Нормализованный индекс каталога из sravni-plitku.
-- Исходный JSON и исходные изображения остаются нетронутыми;
-- импорт создаёт отдельную системную копию метаданных и файлов.

CREATE TABLE IF NOT EXISTS tt_catalog_tiles (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(255) NULL,
  brand VARCHAR(160) NULL,
  colors JSON NULL,
  sizes JSON NULL,
  surfaces JSON NULL,
  designs JSON NULL,
  hex_color CHAR(7) NULL,
  source_payload JSON NOT NULL,
  preview_media_id CHAR(36) NULL,
  source_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_catalog_tile_brand (brand),
  CONSTRAINT fk_catalog_preview_media FOREIGN KEY (preview_media_id) REFERENCES tt_media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
