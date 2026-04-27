function SearchBar({ searchValue = '', onSearchChange, onSearch, onReset, onAddClick }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="flex items-center gap-3">
      <form onSubmit={handleSubmit} className="flex-1 flex items-center">
        <input
          type="text"
          placeholder="Search influencers..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-700 text-white rounded-r-lg hover:bg-blue-800 font-medium"
        >
          Search
        </button>
      </form>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border-2 border-white/80 bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        title="Reset all filters"
        aria-label="Reset filters"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button
        onClick={onAddClick}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
        title="Add Influencer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Add Influencer
      </button>
    </div>
  );
}

export default SearchBar;

