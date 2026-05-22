"use strict";

/**
 * Same-origin path for Metro to proxy `POST /api/config/pri` in development.
 * `GET /api/config/pub` uses {@link WEB_DEV_CONFIG_PROXY_PATH} unchanged.
 */
exports.WEB_DEV_CONFIG_PRI_PROXY_PATH = "/__expo_dev_config_pri_proxy__";
