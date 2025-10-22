const axios = require('axios');
const cheerio = require('cheerio');

// Кэш геокодирования
const geocodeCache = new Map();

async function geocodeCity(city) {
  if (geocodeCache.has(city)) return geocodeCache.get(city);

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Россия')}`;
    const res = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'RussiaRunningMap/1.0' }
    });

    const data = res.data;
    if (Array.isArray(data) && data.length > 0) {
      const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      geocodeCache.set(city, coords);
      await new Promise(r => setTimeout(r, 1100));
      return coords;
    }
  } catch (e) {
    console.warn(`Геокодирование не удалось: ${city}`);
  }
  return null;
}

let cachedEvents = [];
let lastFetch = 0;

async function fetchRunningEvents() {
  const now = new Date();
  if (now - lastFetch < 5 * 60 * 1000 && cachedEvents.length > 0) {
    return cachedEvents;
  }

  const events = [];
  let page = 1;

  while (page <= 5) {
    try {
      const url = `https://reg.russiarunning.com/events/future?isForeign=false&isCountry=false&page=${page}`;
      const res = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const $ = cheerio.load(res.data);
      let found = false;

      // Парсим карточки событий
      $('div.event-card, .event-item, .event, [class*="event"]').each((i, el) => {
        found = true;

        const title = $(el).find('h2, h3, .event-title, a').first().text().trim();
        const link = $(el).find('a').attr('href');
        const dateText = $(el).find('.event-date, time, .date').text().trim();
        const city = $(el).find('.event-city, .city, .location').text().trim();

        if (!title || !link) return;

        // Пробуем распарсить дату
        let date = null;
        const dateMatch = dateText.match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);
        if (dateMatch) {
          const day = parseInt(dateMatch[1]);
          const monthName = dateMatch[2].toLowerCase();
          const year = parseInt(dateMatch[3]);

          const months = {
            'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
            'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
            'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
          };

          const month = months[monthName];
          if (month !== undefined) {
            date = new Date(year, month, day);
          }
        }

        if (!date || date < now) return;

        // Геокодирование
        let coords = null;
        if (city) {
          coords = await geocodeCity(city);
        }
        if (!coords) return;

        events.push({
          name: title,
          date: date.toISOString(),
          city: city,
          lon: coords[0],
          lat: coords[1],
          link: link.startsWith('http') ? link : `https://reg.russiarunning.com${link}`
        });
      });

      if (!found) break; // больше нет событий
      page++;
    } catch (e) {
      console.error(`Ошибка на странице ${page}:`, e.message);
      break;
    }
  }

  cachedEvents = events;
  lastFetch = now;
  console.log(`✅ Загружено ${cachedEvents.length} событий`);
  return cachedEvents;
}

module.exports = { fetchRunningEvents };