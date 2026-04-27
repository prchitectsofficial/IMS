import { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import FiltersPanel from '../components/FiltersPanel';
import SummaryStats from '../components/SummaryStats';
import InfluencerTable from '../components/InfluencerTable';
import InfluencerFormModal from '../components/InfluencerFormModal';
import CommentsModal from '../components/CommentsModal';
import ChannelDetailModal from '../components/ChannelDetailModal';
import api from '../config/api';

const DEFAULT_FILTERS = {
  platform: 'All',
  search: '',
  status: 'Confirmed',
  sortBy: 'Avg Views DESC',
  views: '101',
  languages: [],
  emailFilter: 'All',
  barterFilter: 'All',
  excludeOldContent: false,
  dateFrom: '',
  dateTo: '',
  // Instagram-only filters
  priceFilter: '',
  followersFilter: '',
};

function ImsPage() {
  const [summary, setSummary]         = useState({ totalInfluencers: 0, totalComments: 0, channelsWithComments: 0 });
  const [influencers, setInfluencers] = useState([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [filters, setFilters]         = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage]               = useState(1);
  const [showAddModal, setShowAddModal]           = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState(null);
  const [commentsModal, setCommentsModal]         = useState({ show: false, influencerId: null });
  const [expandedSimilarId, setExpandedSimilarId] = useState(null);
  const [similarDataById, setSimilarDataById]     = useState({});
  const [loadingSimilarId, setLoadingSimilarId]   = useState(null);
  const [channelDetailModal, setChannelDetailModal] = useState({ show: false, influencer: null });
  const [toast, setToast]             = useState(null);

  useEffect(() => { fetchSummary(); fetchLanguages(); }, []);
  useEffect(() => { fetchInfluencers(); }, [appliedFilters, page]);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchLanguages = async () => {
    try { await api.get('/filters/languages'); } catch (_) {}
  };

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const isIG = appliedFilters.platform === 'Instagram';

      if (isIG) {
        // Instagram-only mode — dedicated endpoint
        const params = {
          status:          appliedFilters.status           || undefined,
          sortBy:          appliedFilters.sortBy           || undefined,
          barterFilter:    appliedFilters.barterFilter !== 'All' ? appliedFilters.barterFilter : undefined,
          priceFilter:     appliedFilters.priceFilter      || undefined,
          followersFilter: appliedFilters.followersFilter  || undefined,
          page,
          limit: 20
        };
        Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
        const response = await api.get('/insta/list', { params });
        setInfluencers(response.data.rows);
        setTotalCount(response.data.totalCount);
      } else {
        // YT / All mode — existing endpoint
        const params = {
          search:           appliedFilters.search           || undefined,
          status:           appliedFilters.status           || undefined,
          sortBy:           appliedFilters.sortBy           || undefined,
          views:            appliedFilters.views            || undefined,
          languages:        appliedFilters.languages?.length > 0 ? appliedFilters.languages : undefined,
          emailFilter:      appliedFilters.emailFilter !== 'All' ? appliedFilters.emailFilter : undefined,
          barterFilter:     appliedFilters.barterFilter !== 'All' ? appliedFilters.barterFilter : undefined,
          excludeOldContent: appliedFilters.excludeOldContent || undefined,
          dateFrom:         appliedFilters.dateFrom          || undefined,
          dateTo:           appliedFilters.dateTo            || undefined,
          page,
          limit: 20
        };
        Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
        const response = await api.get('/list', { params });
        setInfluencers(response.data.rows);
        setTotalCount(response.data.totalCount);
      }
    } catch (error) {
      console.error('Error fetching influencers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setAppliedFilters(filters); setPage(1); };
  const handleReset  = () => { setFilters(DEFAULT_FILTERS); setAppliedFilters(DEFAULT_FILTERS); setPage(1); };
  const handleFilterChange = (newFilters) => setFilters(prev => ({ ...prev, ...newFilters }));

  const handleAddInfluencer = () => { setEditingInfluencer(null); setShowAddModal(true); };

  const handleEditInfluencer = async (influencer) => {
    try {
      const res = await api.get(`/influencer/${influencer.id}`);
      setEditingInfluencer(res.data);
      setShowAddModal(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load influencer');
    }
  };

  const handleSaveInfluencer = async (formData) => {
    try {
      // Instagram add — route to dedicated IG endpoint
      if (formData._platform === 'instagram') {
        const { _platform, ...igPayload } = formData;
        const res = await api.post('/insta/add', igPayload);
        if (res.data?.success === false) {
          alert(res.data.message || 'Failed to add Instagram influencer');
          return;
        }
        setShowAddModal(false);
        setEditingInfluencer(null);
        showToast('Instagram influencer added');
        fetchInfluencers();
        fetchSummary();
        return;
      }

      // YouTube add or edit
      if (editingInfluencer) {
        await api.put(`/update/${editingInfluencer.id}`, formData);
        setShowAddModal(false); setEditingInfluencer(null);
        showToast('Influencer updated');
        fetchInfluencers(); fetchSummary();
      } else {
        const res = await api.post('/add', formData);
        if (res.data?.success === false) { alert(res.data.message || 'Failed to add influencer'); return; }
        setShowAddModal(false); setEditingInfluencer(null);
        showToast('New channel added');
        fetchInfluencers(); fetchSummary();
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error saving';
      alert(msg);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCommentsClick = (influencerId) => {
    setCommentsModal({ show: true, influencerId });
  };

  const getTagsFromTopTwo = (topTwoTags) => {
    if (!topTwoTags) return [];
    // ES returns already-parsed object e.g. {comedy:{score:45}, entertainment:{score:30}}
    if (typeof topTwoTags === 'object' && !Array.isArray(topTwoTags)) {
      return Object.keys(topTwoTags).filter(Boolean);
    }
    // String from MySQL e.g. '{"comedy":{"score":45}}'
    if (typeof topTwoTags === 'string') {
      const str = topTwoTags.trim();
      if (!str || str === '{}' || str === '[]') return [];
      try {
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return Object.keys(parsed).filter(Boolean);
        }
      } catch (_) {}
      return str.split(',').map(t => t.trim()).filter(Boolean);
    }
    return [];
  };

  const handleSimilarClick = async (influencer) => {
    const id = influencer?.id;
    if (!id) return;
    if (expandedSimilarId === id) { setExpandedSimilarId(null); return; }
    setExpandedSimilarId(id);
    if (similarDataById[id] !== undefined) return;
    setLoadingSimilarId(id);
    try {
      const tags = getTagsFromTopTwo(influencer.top_two_tags);
      const { data } = await api.post('/influencer/similar', { id, tags });
      setSimilarDataById(prev => ({ ...prev, [id]: data.rows || [] }));
    } catch (err) {
      setSimilarDataById(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingSimilarId(null);
    }
  };

  const handleChannelDetailClick = (influencer) => {
    setChannelDetailModal({ show: true, influencer });
  };

  const handleDeleteInfluencer = async (id) => {
    try {
      await api.delete(`/influencer/${id}`);
      setShowAddModal(false); setEditingInfluencer(null);
      showToast('Influencer deleted');
      fetchInfluencers(); fetchSummary();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete';
      alert(msg);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Blue Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-5xl font-bold tracking-tight flex-shrink-0 min-w-[140px]">IMS</h1>
            <div className="flex-1 min-w-0">
              <SearchBar
                searchValue={filters.search}
                onSearchChange={value => setFilters(prev => ({ ...prev, search: value }))}
                onSearch={handleSearch}
                onReset={handleReset}
                onAddClick={handleAddInfluencer}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <SummaryStats stats={summary} />

        {/* Filters — pass platform through filters object */}
        <FiltersPanel filters={filters} onChange={handleFilterChange} />

        {/* Table — pass platform filter for frontend row filtering */}
        <InfluencerTable
          influencers={influencers}
          loading={loading}
          platform={appliedFilters.platform || 'All'}
          onEdit={handleEditInfluencer}
          onCommentsClick={handleCommentsClick}
          onSimilarClick={handleSimilarClick}
          onChannelDetailClick={handleChannelDetailClick}
          expandedSimilarId={expandedSimilarId}
          similarDataById={similarDataById}
          loadingSimilarId={loadingSimilarId}
          page={page}
          totalCount={totalCount}
          onPageChange={setPage}
        />

        {showAddModal && (
          <InfluencerFormModal
            influencer={editingInfluencer}
            onClose={() => { setShowAddModal(false); setEditingInfluencer(null); }}
            onSave={handleSaveInfluencer}
            onDelete={handleDeleteInfluencer}
          />
        )}

        {commentsModal.show && (
          <CommentsModal
            influencerId={commentsModal.influencerId}
            onClose={() => setCommentsModal({ show: false, influencerId: null })}
            onUpdate={() => { fetchInfluencers(); fetchSummary(); }}
          />
        )}

        {channelDetailModal.show && channelDetailModal.influencer && (
          <ChannelDetailModal
            influencer={channelDetailModal.influencer}
            onClose={() => setChannelDetailModal({ show: false, influencer: null })}
          />
        )}
      </div>
    </div>
  );
}

export default ImsPage;
