const axios = require('axios');

// Кэш геокодирования: город → [lon, lat]
const geocodeCache = new Map();

// Геокодирование через Nominatim (OpenStreetMap)
async function geocodeCity(city) {
  if (geocodeCache.has(city)) {
    return geocodeCache.get(city);
  }

  try {
    // Запрос к Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Россия')}`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'RussiaRunningMap/1.0 (+https://your-site.onrender.com)'
      }
    });

    const data = response.data;
    if (Array.isArray(data) && data.length > 0) {
      // Берём первый результат (наиболее релевантный)
      const result = data[0];
      const coords = [parseFloat(result.lon), parseFloat(result.lat)];
      geocodeCache.set(city, coords);

      // Уважаем лимиты Nominatim: не более 1 запроса в секунду
      await new Promise(resolve => setTimeout(resolve, 1100));

      return coords;
    }
  } catch (error) {
    console.warn(`⚠️ Не удалось геокодировать город: ${city}`, error.message);
  }

  return null;
}

// Основная функция парсинга
let cachedEvents = [];
let lastFetch = 0;

async function fetchRunningEvents() {
  const now = new Date();
  if (now - lastFetch < 5 * 60 * 1000 && cachedEvents.length > 0) {
    return cachedEvents;
  }

  const events = [];
  let page = 1;

  while (page <= 10) {
    try {
      const res = await axios.get('https://reg.russiarunning.com/api/v1/events', {
        params: { isForeign: false, isCountry: false, page },
        timeout: 10000,
        headers: { 'User-Agent': 'RussiaRunningMap/1.0' }
      });

      const data = res.data.data || [];
      if (data.length === 0) break;

      for (const item of data) {
        const eventDate = new Date(item.date);
        if (eventDate < now) continue; // только будущие

        let lon = item.longitude;
        let lat = item.latitude;
        let city = item.city;

        // Если координат нет — геокодируем город
        if (!lon || !lat || !city) {
          continue; // пропускаем без города
        }

        if (!lon || !lat) {
          const coords = await geocodeCity(city);
          if (coords) {
            lon = coords[0];
            lat = coords[1];
          } else {
            continue; // пропускаем, если не удалось геокодировать
          }
        }

        events.push({
          id: item.id,
          name: item.name,
          date: item.date,
          city: city,
          lon: parseFloat(lon),
          lat: parseFloat(lat),
          link: `https://reg.russiarunning.com/events/${item.id}`
        });
      }

      page++;
    } catch (e) {
      console.warn(`Ошибка на странице ${page}:`, e.message);
      break;
    }
  }

  cachedEvents = events;
  lastFetch = now;
  console.log(`✅ Загружено ${cachedEvents.length} будущих событий`);
  return cachedEvents;
}

module.exports = { fetchRunningEvents };