const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "sync-ios-metadata-from-env.sh";

/**
 * Ensures Podfile runs sync-ios-metadata-from-env.sh on each `pod install`
 * (including after `expo prebuild`), matching the committed Podfile hook.
 */
function withIosEnvSyncPodfile(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfilePath)) {
        return cfg;
      }
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) {
        return cfg;
      }

      const needle = "    end\n  end\n\n  post_integrate";
      if (!contents.includes(needle)) {
        throw new Error(
          "[withIosEnvSyncPodfile] Podfile layout changed; add the sync-ios-metadata-from-env.sh block manually to post_install."
        );
      }

      const injection = `    end

    # Repo .env → MARKETING_VERSION / PRODUCT_NAME / CFBundle* (ios/scripts/sync-ios-metadata-from-env.sh)
    sync_env = File.expand_path('scripts/sync-ios-metadata-from-env.sh', __dir__)
    if File.file?(sync_env)
      Pod::UI.puts '[.env] sync-ios-metadata-from-env.sh'
      system('bash', sync_env) || raise(Pod::Informative, '[.env] sync-ios-metadata-from-env.sh failed')
    end
  end

  post_integrate`;

      contents = contents.replace(needle, injection);
      fs.writeFileSync(podfilePath, contents);
      return cfg;
    },
  ]);
}

module.exports = withIosEnvSyncPodfile;
