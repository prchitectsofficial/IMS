function SummaryStats({ stats }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600">Total Influencers</div>
        <div className="text-2xl font-bold">{stats.totalInfluencers}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600">Total Comments</div>
        <div className="text-2xl font-bold">{stats.totalComments}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="text-sm text-gray-600">Channels with Comments</div>
        <div className="text-2xl font-bold">{stats.channelsWithComments}</div>
      </div>
    </div>
  );
}

export default SummaryStats;

