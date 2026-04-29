const { withInfoPlist } = require("@expo/config-plugins");

/**
 * Merges `NSAppTransportSecurity` → `NSExceptionDomains` for cleartext HTTP to named hosts
 * (development / staging). Domains from `app.config` plugin props (sourced from
 * `IOS_ATS_INSECURE_HTTP_DOMAINS` in app.config.js).
 */
function withIosAtsInsecureHttp(config, props = {}) {
  const { domains: raw = [] } = props;
  const domains = Array.isArray(raw) ? raw.map((d) => String(d).trim()).filter(Boolean) : [];

  return withInfoPlist(config, (infoPlist) => {
    const ats = { ...(infoPlist.NSAppTransportSecurity || {}) };

    if (domains.length === 0) {
      delete ats.NSExceptionDomains;
    } else {
      ats.NSExceptionDomains = {};
      for (const host of domains) {
        ats.NSExceptionDomains[host] = { NSExceptionAllowsInsecureHTTPLoads: true };
      }
    }

    infoPlist.NSAppTransportSecurity = { ...ats };
    return infoPlist;
  });
}

module.exports = withIosAtsInsecureHttp;
