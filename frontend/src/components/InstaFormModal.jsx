import { useState, useEffect } from 'react';
import api from '../config/api';

const CURRENCIES  = ['INR', 'USD', 'GBP', 'EURO'];
const MANAGED_BY  = [
  'Aaisha','Bhanu','Garima','Other agency','Inhouse manager','Iplix',
  'BrandzUp Media','Qyuki Digital Media','Sociopool','Eleve Media',
  'Times Internet','Third Eye Blind Productions','Impel Entertainment',
  'CollabX','GryNow Influencer Marketing','PRchitects','Socio Influencer',
  'Creators Gram','SocioBerry','Wesocioo','Hype Up Media and Entertainment',
  'Infinitum Network Solutions','Digimonks','Visual Gaming','8bitcreatives',
  'Big Bad Wolf','BELIEVE DIGITAL','Creators Company','Tamada Media',
  'Silly Monks Entertainment','Infitumnetwork'
];
const STATUS_OPTS = [
  { value: '0', label: 'Unconfirmed' },
  { value: '1', label: 'Confirmed'   },
  { value: '2', label: 'Managed'     },
  { value: '3', label: 'Followed'    },
  { value: '4', label: 'Suspended'   },
];

const FIELD = {
  name: '', instagram_url: '', gender: '', category: '', website: '',
  email: '', phone: '', currency: '', reel_price: '', post_price: '',
  story_price: '', barter: '2', language: '', country: '', bio: '',
  status: '', conversation_email: '', managedby: '', freepromotion: false, note: ''
};

function InstaFormModal({ igId, onClose, onSave }) {
  const [form,      setForm]      = useState(FIELD);
  const [languages, setLanguages] = useState([]);
  const [countries, setCountries] = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [errors,    setErrors]    = useState({});

  // Load dropdowns
  useEffect(() => {
    api.get('/filters/add-languages').then(r => setLanguages(r.data || [])).catch(() => {});
    api.get('/filters/countries').then(r => setCountries(r.data || [])).catch(() => {});
  }, []);

  // Load existing data
  useEffect(() => {
    if (!igId) return;
    api.get(`/insta/influencer/${igId}`)
      .then(r => {
        const d = r.data;
        setForm({
          name:               d.name             || '',
          instagram_url:      d.username ? `https://www.instagram.com/${d.username}` : '',
          gender:             d.gender            || d.approach || '',
          category:           d.category          || '',
          website:            d.website           || '',
          email:              d.emails            || '',
          phone:              d.phone             || '',
          currency:           d.currency          || '',
          reel_price:         d.inf_price         != null ? String(d.inf_price)         : '',
          post_price:         d.pitching_price    != null ? String(d.pitching_price)    : '',
          story_price:        d.story_price       != null ? String(d.story_price)       : '',
          barter:             d.barter === true || d.barter === 1 || d.barter === '1' ? '1' : '2',
          language:           d.language          || '',
          country:            d.country           || '',
          bio:                d.bio               || '',
          status:             d.status            != null ? String(d.status) : '',
          conversation_email: d.conemail          || d.conversation_email || '',
          managedby:          d.managedby         || '',
          freepromotion:      !!(d.freepromotion  || d.free_promotion),
          note:               d.note              || '',
        });
      })
      .catch(err => console.error('Failed to load IG influencer:', err));
  }, [igId]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.instagram_url.trim()) e.instagram_url = 'Instagram URL is required';
    if (form.status === '1' && !form.conversation_email.trim())
      e.conversation_email = 'Conversation email required when Confirmed';
    if (form.currency && (!form.reel_price || Number(form.reel_price) <= 0))
      e.reel_price = 'Reel price required when currency is set';
    if (form.currency && (!form.post_price || Number(form.post_price) <= 0))
      e.post_price = 'Post price required when currency is set';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put(`/insta/update/${igId}`, form);
      onSave && onSave();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const lbl = 'block text-sm font-medium text-gray-700 mb-1';
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400';
  const err = 'text-red-500 text-xs mt-0.5';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col m-4">

        {/* header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Change Instagram Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Name */}
          <div>
            <label className={lbl}>Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className={inp} placeholder="Influencer Name"/>
          </div>

          {/* Instagram URL */}
          <div>
            <label className={lbl}>Instagram URL <span className="text-red-500">*</span></label>
            <input type="text" name="instagram_url" value={form.instagram_url} onChange={handleChange} className={inp} placeholder="https://instagram.com/username"/>
            {errors.instagram_url && <p className={err}>{errors.instagram_url}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className={lbl}>Gender</label>
            <div className="flex gap-4">
              {['male','female','Neutral'].map(g => (
                <label key={g} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={handleChange}/>
                  <span className="capitalize">{g}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={lbl}>Category</label>
            <input type="text" name="category" value={form.category} onChange={handleChange} className={inp} placeholder="e.g. Actor, Blogger"/>
          </div>

          {/* Website */}
          <div>
            <label className={lbl}>Website</label>
            <input type="text" name="website" value={form.website} onChange={handleChange} className={inp} placeholder="https://..."/>
          </div>

          {/* Email */}
          <div>
            <label className={lbl}>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className={inp} placeholder="Email"/>
          </div>

          {/* Contact */}
          <div>
            <label className={lbl}>Contact</label>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} className={inp} placeholder="Contact Number"/>
          </div>

          {/* Price — currency + reel + post + story */}
          <div>
            <label className={lbl}>Price</label>
            <div className="grid grid-cols-4 gap-2">
              <select name="currency" value={form.currency} onChange={handleChange} className={inp}>
                <option value="">Currency</option>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" name="reel_price"  value={form.reel_price}  onChange={handleChange} className={inp} placeholder="Reel price"  min="0"/>
              <input type="number" name="post_price"  value={form.post_price}  onChange={handleChange} className={inp} placeholder="Post price"  min="0"/>
              <input type="number" name="story_price" value={form.story_price} onChange={handleChange} className={inp} placeholder="Story price" min="0"/>
            </div>
            {errors.reel_price && <p className={err}>{errors.reel_price}</p>}
            {errors.post_price && <p className={err}>{errors.post_price}</p>}
          </div>

          {/* Barter */}
          <div>
            <label className={lbl}>Barter</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" name="barter" value="1" checked={form.barter === '1'} onChange={handleChange}/> Yes
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input type="radio" name="barter" value="2" checked={form.barter === '2'} onChange={handleChange}/> No
              </label>
            </div>
          </div>

          {/* Language */}
          <div>
            <label className={lbl}>Language</label>
            <select name="language" value={form.language} onChange={handleChange} className={inp}>
              <option value="">Choose Language</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className={lbl}>Country</label>
            <select name="country" value={form.country} onChange={handleChange} className={inp}>
              <option value="">Choose Country</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className={lbl}>Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} className={inp}/>
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {STATUS_OPTS.map(o => (
                <label key={o.value} className="flex items-center gap-1 text-sm">
                  <input type="radio" name="status" value={o.value} checked={form.status === o.value} onChange={handleChange}/>
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {/* Conversation Email */}
          <div>
            <label className={lbl}>Conversation Email</label>
            <input type="email" name="conversation_email" value={form.conversation_email} onChange={handleChange} className={inp} placeholder="Conversation Email"/>
            {errors.conversation_email && <p className={err}>{errors.conversation_email}</p>}
          </div>

          {/* Managed By */}
          <div>
            <label className={lbl}>Managed By</label>
            <select name="managedby" value={form.managedby} onChange={handleChange} className={inp}>
              <option value="">Choose managed by</option>
              {MANAGED_BY.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Free Promotion */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="freepromotion" checked={form.freepromotion} onChange={handleChange} className="w-4 h-4"/>
              Free Promotion
            </label>
          </div>

          {/* Note */}
          <div>
            <label className={lbl}>Note</label>
            <textarea name="note" value={form.note} onChange={handleChange} rows={3} className={inp} placeholder="Note"/>
          </div>
        </div>

        {/* footer */}
        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
            Close
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
            {saving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstaFormModal;
