-- Каталог оборудования Tile Tools. Данные ниже являются демонстрационными
-- и могут быть заменены поставщиками через будущую административную форму.

CREATE TABLE IF NOT EXISTS tt_equipment_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  purpose VARCHAR(120) NOT NULL,
  availability ENUM('in_stock','on_order') NOT NULL DEFAULT 'in_stock',
  equipment_type VARCHAR(120) NOT NULL,
  dimensions VARCHAR(120) NULL,
  short_description VARCHAR(500) NOT NULL,
  visual_key VARCHAR(80) NOT NULL DEFAULT 'display',
  popularity INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_equipment_filter (is_active, category, brand, availability),
  INDEX idx_equipment_popularity (popularity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO tt_equipment_items
  (id, name, brand, category, purpose, availability, equipment_type, dimensions, short_description, visual_key, popularity)
VALUES
  ('eq-italon-large-format', 'Стенд для крупноформатных плит', 'ITALON', 'stands', 'Для шоурума', 'in_stock', 'Стенд', '1200 x 2780 мм', 'Поворотные модули для показа крупного формата.', 'italon', 98),
  ('eq-kerama-collection', 'Экспозитор для коллекций', 'Kerama Marazzi', 'expositors', 'Для коллекций', 'in_stock', 'Экспозитор', '20 панелей', 'Поворотная система для системной презентации серий.', 'kerama', 94),
  ('eq-laparet-panels', 'Демонстрационные панели', 'LAPARET', 'panels', 'Для образцов', 'in_stock', 'Панель', '600 x 1200 мм', 'Готовое решение для акцентной демонстрации плитки.', 'laparet', 89),
  ('eq-estima-samples', 'Набор образцов в кейсе', 'ESTIMA', 'samples', 'Для выездов', 'in_stock', 'Набор образцов', '20 образцов', 'Компактный кейс для встреч с клиентами.', 'estima', 87),
  ('eq-atlas-showroom', 'Модульная система шоурума', 'Atlas Concorde', 'showrooms', 'Для шоурума', 'in_stock', 'Шоурумная система', 'От 20 м²', 'Гибкая композиция стоек и панелей для салона.', 'atlas', 84),
  ('eq-donolux-track', 'Трековое освещение', 'Donolux', 'lighting', 'Для освещения', 'in_stock', 'Освещение', '3 светильника', 'Профессиональная подсветка фактуры керамики.', 'donolux', 78),
  ('eq-cersanit-book', 'Стенд-книжка для образцов', 'Cersanit', 'stands', 'Для образцов', 'in_stock', 'Стенд', '10 панелей', 'Компактное решение для демонстрации коллекций.', 'cersanit', 76),
  ('eq-vitra-desk', 'Консультационный стол', 'VitrA', 'accessories', 'Для консультаций', 'on_order', 'Мебель', 'С местом для хранения', 'Рабочее место менеджера с хранением образцов.', 'vitra', 71)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), brand = VALUES(brand), category = VALUES(category), purpose = VALUES(purpose),
  availability = VALUES(availability), equipment_type = VALUES(equipment_type), dimensions = VALUES(dimensions),
  short_description = VALUES(short_description), visual_key = VALUES(visual_key), popularity = VALUES(popularity), is_active = 1;
