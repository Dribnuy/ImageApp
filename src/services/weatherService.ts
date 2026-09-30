
const API_KEY = "a23f7aae93e1d803a306d51c6652011e";
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const getWeatherByCity = async (city: string) => {
  const response = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};