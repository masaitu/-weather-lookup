const cityCoordinates = {
  nairobi: { name: 'Nairobi, Kenya', lat: -1.2864, lon: 36.8172 },
  london: { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  'new york': { name: 'New York, USA', lat: 40.7128, lon: -74.006 },
  tokyo: { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  paris: { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  sydney: { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 }
};

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loadingEl = document.getElementById('loading');
const resultEl = document.getElementById('weatherResult');
const cityNameEl = document.getElementById('cityName');
const tempEl = document.getElementById('temp');
const windEl = document.getElementById('wind');
const iconEl = document.getElementById('icon');
const errorMsgEl = document.getElementById('errorMsg');

const baseIcon = (body, extra = '') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="${body}" />
      ${extra}
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const icons = {
  clear: () =>
    baseIcon(
      '#fff7ed',
      `<circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#f59e0b" stroke-width="3" />
       <g stroke="#f59e0b" stroke-width="3">
         <line x1="32" y1="6" x2="32" y2="16" />
         <line x1="32" y1="48" x2="32" y2="58" />
         <line x1="6" y1="32" x2="16" y2="32" />
         <line x1="48" y1="32" x2="58" y2="32" />
         <line x1="13" y1="13" x2="20" y2="20" />
         <line x1="44" y1="44" x2="51" y2="51" />
         <line x1="13" y1="51" x2="20" y2="44" />
         <line x1="44" y1="20" x2="51" y2="13" />
       </g>`
    ),
  cloudy: () =>
    baseIcon(
      '#eef2ff',
      `<ellipse cx="36" cy="36" rx="18" ry="12" fill="#cbd5e1" />
       <ellipse cx="26" cy="38" rx="12" ry="10" fill="#e2e8f0" />`
    ),
  rain: () =>
    baseIcon(
      '#e0f2fe',
      `<ellipse cx="34" cy="32" rx="18" ry="11" fill="#94a3b8" />
       <ellipse cx="26" cy="36" rx="12" ry="9" fill="#cbd5e1" />
       <g stroke="#0ea5e9" stroke-width="4" stroke-linecap="round">
         <line x1="22" y1="44" x2="18" y2="54" />
         <line x1="32" y1="44" x2="28" y2="54" />
         <line x1="42" y1="44" x2="38" y2="54" />
       </g>`
    ),
  storm: () =>
    baseIcon(
      '#fef2f2',
      `<ellipse cx="34" cy="32" rx="18" ry="11" fill="#cbd5e1" />
       <ellipse cx="26" cy="36" rx="12" ry="9" fill="#e2e8f0" />
       <polygon points="30,40 38,40 32,52 40,52 30,64" fill="#f97316" stroke="#ea580c" stroke-width="2" />`
    ),
  snow: () =>
    baseIcon(
      '#e0f2fe',
      `<ellipse cx="34" cy="32" rx="18" ry="11" fill="#cbd5e1" />
       <ellipse cx="26" cy="36" rx="12" ry="9" fill="#e2e8f0" />
       <g stroke="#1e293b" stroke-width="3" stroke-linecap="round">
         <line x1="24" y1="44" x2="22" y2="54" />
         <line x1="32" y1="44" x2="30" y2="54" />
         <line x1="40" y1="44" x2="38" y2="54" />
         <line x1="28" y1="49" x2="36" y2="49" />
         <line x1="26" y1="52" x2="34" y2="52" />
       </g>`
    ),
  mist: () =>
    baseIcon(
      '#e2e8f0',
      `<g stroke="#475569" stroke-width="4" stroke-linecap="round">
         <line x1="16" y1="26" x2="48" y2="26" />
         <line x1="12" y1="34" x2="44" y2="34" />
         <line x1="18" y1="42" x2="50" y2="42" />
       </g>`
    )
};

const iconForCode = (code) => {
  if (code === 0) return { src: icons.clear(), alt: 'Clear sky' };
  if ([1, 2, 3].includes(code)) return { src: icons.cloudy(), alt: 'Partly cloudy' };
  if ([45, 48].includes(code)) return { src: icons.mist(), alt: 'Fog or mist' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { src: icons.rain(), alt: 'Rainy conditions' };
  }
  if (code >= 71 && code <= 77) return { src: icons.snow(), alt: 'Snowy weather' };
  if (code >= 95) return { src: icons.storm(), alt: 'Thunderstorm' };
  return { src: icons.cloudy(), alt: 'Mixed cloud cover' };
};

const setLoading = (isLoading) => {
  loadingEl.classList.toggle('hidden', !isLoading);
  searchBtn.disabled = isLoading;
};

const showError = (message) => {
  errorMsgEl.textContent = message;
  errorMsgEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
};

const clearError = () => {
  errorMsgEl.textContent = '';
  errorMsgEl.classList.add('hidden');
};

const normalizeCity = (value) => value.trim().toLowerCase();

const fetchWeather = async (cityKey) => {
  const city = cityCoordinates[cityKey];
  if (!city) {
    throw new Error('invalid-city');
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('api-error');
  }

  const data = await response.json();
  if (!data.current_weather) {
    throw new Error('no-data');
  }

  return {
    city: city.name,
    temperature: data.current_weather.temperature,
    windSpeed: data.current_weather.windspeed,
    weatherCode: data.current_weather.weathercode
  };
};

const updateUI = ({ city, temperature, windSpeed, weatherCode }) => {
  cityNameEl.textContent = city;
  tempEl.textContent = temperature.toFixed(1);
  windEl.textContent = windSpeed.toFixed(1);

  const { src, alt } = iconForCode(weatherCode);
  iconEl.src = src;
  iconEl.alt = `${alt} icon`;

  resultEl.classList.remove('hidden');
};

const handleSearch = async () => {
  const value = normalizeCity(cityInput.value);
  if (!value) {
    showError('Please enter a city name.');
    return;
  }

  clearError();
  setLoading(true);
  resultEl.classList.add('hidden');

  try {
    const weather = await fetchWeather(value);
    updateUI(weather);
  } catch (error) {
    if (error.message === 'invalid-city') {
      showError('City not found. Try Nairobi, London, New York, Tokyo, Paris, or Sydney.');
    } else if (error.message === 'api-error') {
      showError('The weather service did not respond. Please try again in a moment.');
    } else if (error.message === 'no-data') {
      showError('Weather data is missing right now. Please try another city.');
    } else {
      showError('Network error. Check your connection and try again.');
    }
  } finally {
    setLoading(false);
  }
};

searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});
