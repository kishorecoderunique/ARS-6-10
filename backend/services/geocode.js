const cache = new Map();

async function reverseGeocodeAddress(config, lat, lng) {
  const key = `${lat},${lng}`;
  if (cache.has(key)) return cache.get(key);

  if (config && config.geocodingKey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('key', config.geocodingKey);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
          const result = { address: data.results[0].formatted_address, provider: 'google' };
          cache.set(key, result);
          return result;
        }
      }
    } catch (e) {}
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'ARS-Disaster-Rescue/1.0' } });
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        const result = { address: data.display_name, provider: 'openstreetmap' };
        cache.set(key, result);
        return result;
      }
    }
  } catch (e) {}

  return { address: 'Unknown location', provider: null };
}

async function reverseGeocode(config, lat, lng) {
  const res = await reverseGeocodeAddress(config, lat, lng);
  return res.address || 'Unknown location';
}

module.exports = { reverseGeocode, reverseGeocodeAddress };
