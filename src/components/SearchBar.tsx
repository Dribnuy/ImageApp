import { Search } from "lucide-react";
import type { FormEvent } from "react";

interface SearchBarProps {
  onSearch: (city: string) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const input = form.elements.namedItem("search") as HTMLInputElement;
    const city = input.value;

    onSearch(city);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors duration-200" />

          <input
            name="search"
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          />
        </div>
      </form>
    </div>
  );
}

export default SearchBar;
