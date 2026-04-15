import {
  createWindow, vstack, hstack, label, button,
  signal, GLib} from '../dist/gtk.mjs';
import { attachDevTools } from '../devtools/bridge-agent.mjs';

const cities = signal([
  { name: 'New York', temp: 72, condition: 'Sunny', icon: '☀️' },
  { name: 'London', temp: 58, condition: 'Rainy', icon: '🌧️' },
  { name: 'Tokyo', temp: 68, condition: 'Cloudy', icon: '☁️' },
  { name: 'Sydney', temp: 82, condition: 'Sunny', icon: '☀️' },
  { name: 'Paris', temp: 64, condition: 'Partly Cloudy', icon: '⛅' },
]);

const selectedCity = signal(null);
const unit = signal('F');

function selectCity(city) {
  selectedCity.value = city;
}

function toggleUnit() {
  unit.value = unit.value === 'F' ? 'C' : 'F';
}

function convertTemp(tempF) {
  if (unit.value === 'C') {
    return Math.round((tempF - 32) * 5 / 9);
  }
  return tempF;
}

function refreshWeather() {
  cities.value = cities.value.map(city => ({
    ...city,
    temp: city.temp + Math.floor(Math.random() * 5) - 2,
  }));
}

const { open, close, win } = createWindow({ title: 'Weather App', width: 450, height: 400 });

attachDevTools(win, { signals: { cities, selectedCity, unit } });

// Fallback timeout for E2E / headless runs
GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => { close(); return GLib.SOURCE_REMOVE; });

open(() => vstack([
  label('Weather App'),
  hstack([
    label(`Unit: ${unit.value}`),
    button(`Switch to ${unit.value === 'F' ? 'Celsius' : 'Fahrenheit'}`, { onClick: toggleUnit }),
    button('Refresh', { onClick: refreshWeather }),
  ]),
  hstack([
    vstack([
      label('Cities'),
      ...cities.value.map(city => button(`${city.icon} ${city.name}`, { onClick: () => selectCity(city) })),
    ]),
    vstack([
      label('Details'),
      selectedCity.value
        ? vstack([
            label(`${selectedCity.value.icon} ${selectedCity.value.name}`),
            label(`${convertTemp(selectedCity.value.temp)}°${unit.value}`),
            label(selectedCity.value.condition),
          ])
        : label('Select a city'),
    ]),
  ]),
  label('All Cities'),
  ...cities.value.map(city => hstack([
    label(city.icon),
    label(city.name),
    label(`${convertTemp(city.temp)}°${unit.value}`),
    label(city.condition),
  ])),
]));
