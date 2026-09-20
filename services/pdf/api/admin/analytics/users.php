<?php
declare(strict_types=1);

require __DIR__ . '/../../_analytics_bootstrap.php';

analytics_require_method('GET');
analytics_require_admin();

analytics_json_response([
  'ok' => false,
  'error' => 'endpoint_disabled',
  'message' => 'Anonymous analytics mode does not expose user or lead data.'
], 410);
