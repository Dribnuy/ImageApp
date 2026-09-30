import type { WeatherCardProps } from "../types/types";

const WeatherCard = ({ city, temperature, condition}: WeatherCardProps)  => {
  return (
    <div className="bg-blue-400 p-6 rounded-xl shadow-lg max-w-lg text-white text-center">
      <h1 className="text-2xl font-bold">{city}</h1>
      <p className="text-5xl font-extrabold">{temperature}</p>
      <p className="text-lg italic">{condition}</p>
    </div>
  );
}

export default WeatherCard;


 