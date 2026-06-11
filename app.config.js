// Dynamic Expo config. Everything lives in app.json; this layer injects the
// Android Google Maps API key from the environment so the key is never committed
// to the repo. Set GOOGLE_MAPS_ANDROID_KEY locally in .env (gitignored) and as an
// EAS secret for cloud builds:
//   eas secret:create --scope project --name GOOGLE_MAPS_ANDROID_KEY --value <key>
//
// Note: maps work in Expo Go and on iOS (Apple Maps) without any key — this only
// matters for standalone Android builds.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_ANDROID_KEY;
  if (key) {
    config.android = config.android || {};
    config.android.config = config.android.config || {};
    config.android.config.googleMaps = { apiKey: key };
  }
  return config;
};
