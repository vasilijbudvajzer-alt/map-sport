const axios = require('axios');

// Координаты городов (fallback)
const CITY_COORDS = {
  'Москва': [37.6173, 55.7558],
  'Санкт-Петербург': [30.3351, 59.9343],
  'Екатеринбург': [60.6122, 56.8389],
  'Новосибирск': [82.9346, 55.0084],
  'Казань': [49.1221, 55.8304],
  'Нижний Новгород': [44.0018, 56.3287],
  'Челябинск': [61.4478, 55.1644],
  'Самара': [50.1001, 53.2001],
  'Омск': [73.3682, 54.9887],
  'Ростов-на-Дону': [39.7231, 47.2357],
  'Уфа': [55.9587, 54.7348],
  'Красноярск': [92.8734, 56.0184],
  'Воронеж': [39.1985, 51.6720],
  'Пермь': [56.2397, 58.0105],
  'Волгоград': [44.5167, 48.7080]
};

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
        timeout: 10000
      });

      const data = res.data.data || [];
      if (data.length === 0) break;

      for (const item of data) {
        const eventDate = new Date(item.date);
        if (eventDate < now) continue; // только предстоящие

        let lon = item.longitude;
        let lat = item.latitude;

        // Fallback: если нет координат — центр города
        if (!lon || !lat) {
          const cityCoords = CITY_COORDS[item.city];
          if (cityCoords) {
            lon = cityCoords[0];
            lat = cityCoords[1];
          } else {
            continue; // пропускаем без гео
          }
        }

        events.push({
          name: item.name,
          date: item.date,
          city: item.city,
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
  console.log(`✅ Загружено ${cachedEvents.length} предстоящих событий`);
  return cachedEvents;
}

module.exports = { fetchRunningEvents };