import { useState, useEffect } from 'react';
import api from '../config/api';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'Other'];
const STATUS_OPTIONS = [
  { value: 'Unconfirmed', label: 'Unconfirmed' },
  { value: 'Auto Mail', label: 'Auto Mail' },
  { value: 'Manual Mail', label: 'Manual Mail' },
  { value: 'Responded', label: 'Responded' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Managed', label: 'Managed' },
  { value: 'Suspended', label: 'Suspended' },
];
const MANAGED_BY_OPTIONS = ['In-house', 'Agency', 'External', 'Partner', 'Other'];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;

function stripCommentDisplay(str) {
  if (str == null || typeof str !== 'string') return '';
  return str.replace(/^\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s*Admin:\s*/gi, '').trim() || str;
}

function InfluencerFormModal({ influencer, onClose, onSave, onDelete }) {
  const isEdit = !!influencer;
  const [deleting, setDeleting] = useState(false);
  const [addLanguages, setAddLanguages] = useState([]);
  const [countries, setCountries] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    channel_name: '',
    channel_url: '',
    gender: '',
    email: '',
    contact_number: '',
    currency: '',
    video_price: '',
    pitching_price: '',
    barter: 'no',
    language: '',
    city: '',
    country: '',
    status: '',
    conversation_email: '',
    managed_by: '',
    free_promotion: false,
    note: '',
    admin_note: '',
  });

  useEffect(() => {
    api.get('/filters/add-languages').then((r) => setAddLanguages(r.data || [])).catch(() => setAddLanguages([]));
    api.get('/filters/countries').then((r) => setCountries(r.data || [])).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (influencer) {
      const statusLabel = influencer.status || (influencer.confirmedValue != null && {
        1: 'Unconfirmed', 2: 'Auto Mail', 3: 'Manual Mail', 4: 'Responded',
        5: 'Confirmed', 6: 'Managed', 7: 'Suspended', 9: 'BMI', 10: 'Confirmed PPC',
      }[influencer.confirmedValue]) || '';
      setFormData({
        name: influencer.name || '',
        channel_name: influencer.channel_name || '',
        channel_url: influencer.channel_url || (influencer.channel ? `https://www.youtube.com/channel/${influencer.channel}` : '') || '',
        gender: influencer.approach || influencer.gender || '',
        email: influencer.yt_email || influencer.email || '',
        contact_number: influencer.cont_number || '',
        currency: influencer.currency || '',
        video_price: influencer.yt_price ?? '',
        pitching_price: influencer.est_price ?? '',
        barter: (influencer.barter === 1 || influencer.barter === '1' || influencer.barter === true) ? 'yes' : 'no',
        language: influencer.language || '',
        city: influencer.city || '',
        country: influencer.country || '',
        status: statusLabel,
        conversation_email: influencer.conemail || '',
        managed_by: influencer.managedby || '',
        free_promotion: !!(influencer.freepromotion ?? influencer.free_promotion),
        note: stripCommentDisplay(influencer.note),
        admin_note: stripCommentDisplay(influencer.admin_note),
      });
    } else {
      setFormData({
        name: '', channel_name: '', channel_url: '', gender: '', email: '', contact_number: '',
        currency: '', video_price: '', pitching_price: '', barter: 'no', language: '', city: '', country: '',
        status: '', conversation_email: '', managed_by: '',
        free_promotion: false, note: '', admin_note: '',
      });
    }
    setErrors({});
  }, [influencer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  function validate() {
    const e = {};
    if (!(formData.channel_name || '').trim()) e.channel_name = 'Channel name is required';
    if (!(formData.channel_url || '').trim()) e.channel_url = 'Channel URL is required';
    if (!(formData.gender || '').trim()) e.gender = 'Gender is required';
    if (!(formData.email || '').trim()) e.email = 'Email is required';
    else if (!emailRegex.test(formData.email.trim())) e.email = 'Enter a valid email';
    if ((formData.contact_number || '').trim() && !phoneRegex.test(formData.contact_number.trim())) e.contact_number = 'Enter a valid phone number';
    if (!(formData.language || '').trim()) e.language = 'Language is required';
    if (!(formData.country || '').trim()) e.country = 'Country is required';

    if (formData.status === 'Confirmed') {
      if (!(formData.currency || '').trim()) e.currency = 'Currency is required when status is Confirmed';
      const vp = Number(formData.video_price);
      if (formData.video_price === '' || formData.video_price == null || isNaN(vp) || vp <= 0) e.video_price = 'Video price must be greater than 0 when status is Confirmed';
      if (!(formData.pitching_price || '').toString().trim()) e.pitching_price = 'Pitching price is required when status is Confirmed';
      if (!(formData.conversation_email || '').trim()) e.conversation_email = 'Conversation email is required when status is Confirmed';
    }

    if (formData.status === 'Managed') {
      if (!(formData.managed_by || '').trim()) e.managed_by = 'Managed by is required when status is Managed';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: formData.name.trim(),
      channel_name: formData.channel_name.trim(),
      channel_url: formData.channel_url.trim(),
      gender: formData.gender,
      email: formData.email.trim(),
      phone: formData.contact_number.trim() || undefined,
      currency: formData.currency || undefined,
      video_price: formData.video_price,
      pitching_price: formData.pitching_price,
      barter: formData.barter,
      language: formData.language,
      city: formData.city.trim() || undefined,
      country: formData.country,
      status: formData.status,
      conversation_email: formData.conversation_email.trim() || undefined,
      managed_by: formData.managed_by || undefined,
      free_promotion: formData.free_promotion,
      note: formData.note.trim() || undefined,
      admin_note: formData.admin_note.trim() || undefined,
    };
    if (isEdit) {
      const statusToNum = { Unconfirmed: 1, 'Auto Mail': 2, 'Manual Mail': 3, Responded: 4, Confirmed: 5, Managed: 6, Suspended: 7, BMI: 9, 'Confirmed PPC': 10 };
      onSave({
        name: payload.name,
        channel_name: payload.channel_name,
        channel_url: payload.channel_url,
        approach: formData.gender,
        gender: formData.gender,
        yt_email: payload.email,
        cont_number: payload.phone || '',
        currency: payload.currency,
        yt_price: payload.video_price !== '' && payload.video_price != null ? Number(payload.video_price) : '',
        est_price: payload.pitching_price !== '' && payload.pitching_price != null ? Number(payload.pitching_price) : '',
        barter: payload.barter === 'yes' ? 1 : 0,
        language: payload.language,
        city: payload.city,
        country: payload.country,
        conemail: payload.conversation_email || '',
        managedby: payload.managed_by,
        free_promotion: payload.free_promotion ? 1 : 0,
        note: payload.note || '',
        admin_note: payload.admin_note || '',
        confirmed: formData.status ? (statusToNum[formData.status] ?? formData.status) : '',
      });
      return;
    }
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{isEdit ? 'Edit Influencer' : 'Add Influencer'}</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            {/* 1 Name */}
            <div>
              <label className="block font-medium mb-0.5">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            {/* 2 Channel Name (required) */}
            <div>
              <label className="block font-medium mb-0.5">Channel Name <span className="text-red-500">*</span></label>
              <input type="text" name="channel_name" value={formData.channel_name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
              {errors.channel_name && <p className="text-red-500 text-xs mt-0.5">{errors.channel_name}</p>}
            </div>
            {/* 3 Channel URL (required) */}
            <div>
              <label className="block font-medium mb-0.5">Channel URL <span className="text-red-500">*</span></label>
              <input type="text" name="channel_url" value={formData.channel_url} onChange={handleChange} placeholder="https://www.youtube.com/channel/..." className="w-full px-3 py-2 border border-gray-300 rounded" />
              {errors.channel_url && <p className="text-red-500 text-xs mt-0.5">{errors.channel_url}</p>}
            </div>
            {/* 4 Gender (radio) */}
            <div>
              <label className="block font-medium mb-1">Gender <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                {['male', 'female', 'neutral'].map((g) => (
                  <label key={g} className="flex items-center gap-1">
                    <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} />
                    <span className="capitalize">{g}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-xs mt-0.5">{errors.gender}</p>}
            </div>
            {/* 5 Email (required) */}
            <div>
              <label className="block font-medium mb-0.5">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
              {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
            </div>
            {/* 6 Contact Number (optional) */}
            <div>
              <label className="block font-medium mb-0.5">Contact Number</label>
              <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
              {errors.contact_number && <p className="text-red-500 text-xs mt-0.5">{errors.contact_number}</p>}
            </div>
            {/* 7 Price section */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-medium mb-0.5">Currency</label>
                <select name="currency" value={formData.currency} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded">
                  <option value="">Select</option>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.currency && <p className="text-red-500 text-xs mt-0.5">{errors.currency}</p>}
              </div>
              <div>
                <label className="block font-medium mb-0.5">Video Price</label>
                <input type="number" min="0" step="any" name="video_price" value={formData.video_price} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
                {errors.video_price && <p className="text-red-500 text-xs mt-0.5">{errors.video_price}</p>}
              </div>
              <div>
                <label className="block font-medium mb-0.5">Pitching Price</label>
                <input type="number" min="0" step="any" name="pitching_price" value={formData.pitching_price} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
                {errors.pitching_price && <p className="text-red-500 text-xs mt-0.5">{errors.pitching_price}</p>}
              </div>
            </div>
            {/* 8 Barter */}
            <div>
              <label className="block font-medium mb-1">Barter</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1"><input type="radio" name="barter" value="yes" checked={formData.barter === 'yes'} onChange={handleChange} /> Yes</label>
                <label className="flex items-center gap-1"><input type="radio" name="barter" value="no" checked={formData.barter === 'no'} onChange={handleChange} /> No</label>
              </div>
            </div>
            {/* 9 Language (required) */}
            <div>
              <label className="block font-medium mb-0.5">Language <span className="text-red-500">*</span></label>
              <select name="language" value={formData.language} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="">Select</option>
                {addLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.language && <p className="text-red-500 text-xs mt-0.5">{errors.language}</p>}
            </div>
            {/* 10 City */}
            <div>
              <label className="block font-medium mb-0.5">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            {/* 11 Country (required) */}
            <div>
              <label className="block font-medium mb-0.5">Country <span className="text-red-500">*</span></label>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="">Select</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className="text-red-500 text-xs mt-0.5">{errors.country}</p>}
            </div>
            {/* Status (radio) */}
            <div>
              <label className="block font-medium mb-1">Status</label>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {STATUS_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-1">
                    <input type="radio" name="status" value={o.value} checked={formData.status === o.value} onChange={handleChange} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* 15 Conversation Email */}
            <div>
              <label className="block font-medium mb-0.5">Conversation Email</label>
              <input type="email" name="conversation_email" value={formData.conversation_email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded" />
              {errors.conversation_email && <p className="text-red-500 text-xs mt-0.5">{errors.conversation_email}</p>}
            </div>
            {/* 16 Managed By */}
            <div>
              <label className="block font-medium mb-0.5">Managed By</label>
              <select name="managed_by" value={formData.managed_by} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded">
                <option value="">Select</option>
                {MANAGED_BY_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.managed_by && <p className="text-red-500 text-xs mt-0.5">{errors.managed_by}</p>}
            </div>
            {/* 17 Free Promotion */}
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="free_promotion" checked={formData.free_promotion} onChange={handleChange} className="w-4 h-4 rounded border-gray-300" />
                <span className="font-medium">Free Promotion</span>
              </label>
            </div>
            {/* 18 Note */}
            <div>
              <label className="block font-medium mb-0.5">Note</label>
              <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            {/* 19 Admin Note */}
            <div>
              <label className="block font-medium mb-0.5">Admin Note</label>
              <textarea name="admin_note" value={formData.admin_note} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {isEdit && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this influencer?')) {
                        setDeleting(true);
                        onDelete(influencer.id).finally(() => setDeleting(false));
                      }
                    }}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  Close
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {isEdit ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InfluencerFormModal;
