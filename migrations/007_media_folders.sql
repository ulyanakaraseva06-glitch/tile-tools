-- Personal catalogue folders for the shared Tile Tools media library.

CREATE TABLE IF NOT EXISTS tt_media_folders (
  id CHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_folder_name (user_id, name),
  INDEX idx_media_folders_user_updated (user_id, updated_at),
  CONSTRAINT fk_media_folder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_media_folder_tiles (
  folder_id CHAR(36) NOT NULL,
  tile_id VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (folder_id, tile_id),
  INDEX idx_media_folder_tiles_tile (tile_id),
  CONSTRAINT fk_media_folder_tile_folder FOREIGN KEY (folder_id) REFERENCES tt_media_folders(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_folder_tile_catalog FOREIGN KEY (tile_id) REFERENCES tt_catalog_tiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
