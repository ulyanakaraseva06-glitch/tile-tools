-- Tile Tools: базовые сущности поверх существующей таблицы users «СравниПлитку».
-- Выполнять сначала на staging. Данная миграция не меняет исходные проекты.

CREATE TABLE IF NOT EXISTS tt_media_assets (
  id CHAR(36) PRIMARY KEY,
  owner_user_id INT NULL,
  scope ENUM('system','personal','shared') NOT NULL DEFAULT 'personal',
  kind ENUM('image','document','video','other') NOT NULL DEFAULT 'image',
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  mime_type VARCHAR(120) NOT NULL,
  bytes BIGINT UNSIGNED NOT NULL,
  width_px INT NULL,
  height_px INT NULL,
  checksum_sha256 CHAR(64) NULL,
  status ENUM('ready','processing','deleted','failed') NOT NULL DEFAULT 'processing',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_media_owner_status (owner_user_id, status),
  INDEX idx_media_scope_status (scope, status),
  CONSTRAINT fk_tt_media_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_projects (
  id CHAR(36) PRIMARY KEY,
  owner_user_id INT NOT NULL,
  project_type ENUM('visualization','calculation','pdf') NOT NULL,
  schema_version INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft','active','done','archived','deleted') NOT NULL DEFAULT 'draft',
  payload JSON NOT NULL,
  preview_media_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_projects_owner_status (owner_user_id, status, updated_at),
  CONSTRAINT fk_tt_project_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_project_preview FOREIGN KEY (preview_media_id) REFERENCES tt_media_assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_project_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id CHAR(36) NOT NULL,
  entity_type ENUM('tile','media','equipment') NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  role_name VARCHAR(80) NOT NULL DEFAULT 'reference',
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_item (project_id, entity_type, entity_id, role_name),
  INDEX idx_project_items_entity (entity_type, entity_id),
  CONSTRAINT fk_tt_project_item_project FOREIGN KEY (project_id) REFERENCES tt_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_favorite_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entity_type ENUM('tile','media','equipment','project','service') NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorite_item (user_id, entity_type, entity_id),
  INDEX idx_favorites_user_created (user_id, created_at),
  CONSTRAINT fk_tt_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_lead_requests (
  id CHAR(36) PRIMARY KEY,
  user_id INT NULL,
  source_type ENUM('equipment','service','partner') NOT NULL,
  source_entity_id VARCHAR(255) NULL,
  name VARCHAR(160) NOT NULL,
  phone_or_email VARCHAR(255) NOT NULL,
  message TEXT NULL,
  status ENUM('new','sent','in_progress','closed','failed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leads_status_created (status, created_at),
  CONSTRAINT fk_tt_lead_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tt_import_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source_filename VARCHAR(255) NOT NULL,
  project_type ENUM('visualization','calculation','pdf') NULL,
  result ENUM('success','rejected','failed') NOT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_import_audit_user_created (user_id, created_at),
  CONSTRAINT fk_tt_import_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
