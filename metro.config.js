const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js optionally imports @opentelemetry/api for tracing. It's
// not installed and not used; Metro (especially the web bundler) fails to resolve
// the optional dynamic import. Stub it to an empty module on all platforms.
const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return { type: 'empty' };
  }
  return (original ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
