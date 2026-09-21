CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(80) NOT NULL,
  event_name VARCHAR(80) NOT NULL,
  occurred_at DATETIME NOT NULL,
  anonymous_id VARCHAR(120) NOT NULL,
  user_id VARCHAR(120) NULL,
  session_id VARCHAR(120) NOT NULL,
  project_id VARCHAR(120) NULL,
  document_id VARCHAR(120) NULL,
  properties_json LONGTEXT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_analytics_events_event_id (event_id),
  KEY idx_analytics_events_occurred_at (occurred_at),
  KEY idx_analytics_events_event_name (event_name),
  KEY idx_analytics_events_anonymous_id (anonymous_id),
  KEY idx_analytics_events_session_id (session_id),
  KEY idx_analytics_events_user_id (user_id),
  KEY idx_analytics_events_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_visitors (
  anonymous_id VARCHAR(120) NOT NULL,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  visit_count INT UNSIGNED NOT NULL DEFAULT 1,
  user_id VARCHAR(120) NULL,
  email VARCHAR(160) NULL,
  phone VARCHAR(80) NULL,
  company VARCHAR(160) NULL,
  referrer VARCHAR(255) NULL,
  utm_source VARCHAR(120) NULL,
  utm_medium VARCHAR(120) NULL,
  utm_campaign VARCHAR(160) NULL,
  PRIMARY KEY (anonymous_id),
  KEY idx_analytics_visitors_last_seen_at (last_seen_at),
  KEY idx_analytics_visitors_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id VARCHAR(120) NOT NULL,
  anonymous_id VARCHAR(120) NOT NULL,
  user_id VARCHAR(120) NULL,
  started_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  entry_path VARCHAR(255) NULL,
  referrer VARCHAR(255) NULL,
  utm_source VARCHAR(120) NULL,
  utm_medium VARCHAR(120) NULL,
  utm_campaign VARCHAR(160) NULL,
  PRIMARY KEY (session_id),
  KEY idx_analytics_sessions_anonymous_id (anonymous_id),
  KEY idx_analytics_sessions_started_at (started_at),
  KEY idx_analytics_sessions_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_lead_statuses (
  subject_key VARCHAR(160) NOT NULL,
  status ENUM('new', 'reviewed', 'contacted', 'not_relevant') NOT NULL DEFAULT 'new',
  note TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_key),
  KEY idx_analytics_lead_statuses_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

