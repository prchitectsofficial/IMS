import { useState, useEffect } from 'react';
import api from '../config/api';

// ── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'Other'];

const YT_STATUS_OPTIONS = [
  { value: 'Unconfirmed', label: 'Unconfirmed' },
  { value: 'Auto Mail',   label: 'Auto Mail'   },
  { value: 'Manual Mail', label: 'Manual Mail' },
  { value: 'Responded',   label: 'Responded'   },
  { value: 'Confirmed',   label: 'Confirmed'   },
  { value: 'Managed',     label: 'Managed'     },
  { value: 'Suspended',   label: 'Suspended'   },
];

const IG_STATUS_OPTIONS = [
  { value: '0', label: 'Unconfirmed' },
  { value: '1', label: 'Confirmed'   },
  { value: '2', label: 'Managed'     },
  { value: '3', label: 'Followed'    },
  { value: '4', label: 'Suspended'   },
];

const MANAGED_BY_OPTIONS = [
  'In-house','Agency','External','Partner',
  'Aaisha','Bhanu','Garima','Other agency','Inhouse manager','Iplix',
  'BrandzUp Media','Qyuki Digital Media','Sociopool','Eleve Media',
  'Times Internet','Third Eye Blind Productions','Impel Entertainment',
  'CollabX','GryNow Influencer Marketing','PRchitects','Socio Influencer',
  'Creators Gram','SocioBerry','Wesocioo','Hype Up Media and Entertainment',
  'Infinitum Network Solutions','Digimonks','Visual Gaming','8bitcreatives',
  'Big Bad Wolf','BELIEVE DIGITAL','Creators Company','Tamada Media',
  'Silly Monks Entertainment','Infitumnetwork','Other'
];

const YT_STATUS_TO_NUM = {
  'Unconfirmed':1,'Auto Mail':2,'Manual Mail':3,'Responded':4,
  'Confirmed':5,'Managed':6,'Suspended':7,'BMI':9,'Confirmed PPC':10
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;

function stripCommentDisplay(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/^\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s*Admin:\s*/gi, '').trim() || str;
}

// ── Platform logos ────────────────────────────────────────────────────────────
const YT_LOGO = (
  <svg width="22" height="15" viewBox="0 0 22 15" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <rect width="22" height="15" rx="3" fill="#FF0000"/>
    <path d="M8.5 11V5L15 8Z" fill="white"/>
  </svg>
);
const IG_LOGO = (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle', borderRadius: 4 }}>
    <rect x="1" y="1" width="22" height="22" rx="6" fill="#E1306C"/>
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="17.2" cy="6.8" r="1.2" fill="white"/>
  </svg>
);

// ── Default empty form states ─────────────────────────────────────────────────
const YT_DEFAULTS = {
  name:'', channel_name:'', channel_url:'', gender:'', email:'',
  contact_number:'', currency:'', video_price:'', pitching_price:'',
  barter:'no', language:'', city:'', country:'', status:'',
  conversation_email:'', managed_by:'', free_promotion: false,
  note:'', admin_note:''
};
const IG_DEFAULTS = {
  name:'', instagram_url:'', gender:'', category:'', website:'',
  email:'', contact_number:'', currency:'', reel_price:'',
  post_price:'', story_price:'', barter:'no', language:'',
  country:'', bio:'', status:'', conversation_email:'',
  managed_by:'', free_promotion: false, note:''
};

// ── Main Component ────────────────────────────────────────────────────────────
function InfluencerFormModal({ influencer, onClose, onSave, onDelete }) {
  const isEdit = !!influencer;

  // In edit mode, platform is always YouTube (existing influencer is YT)
  const [platform,    setPlatform]    = useState('youtube');
  const [deleting,    setDeleting]    = useState(false);
  const [languages,   setLanguages]   = useState([]);
  const [countries,   setCountries]   = useState([]);
  const [errors,      setErrors]      = useState({});
  const [ytForm,      setYtForm]      = useState(YT_DEFAULTS);
  const [igForm,      setIgForm]      = useState(IG_DEFAULTS);

  // Active form data based on platform
  const formData    = platform === 'youtube' ? ytForm    : igForm;
  const setFormData = platform === 'youtube' ? setYtForm : setIgForm;

  useEffect(() => {
    api.get('/filters/add-languages').then(r => setLanguages(r.data || [])).catch(() => {});
    api.get('/filters/countries').then(r => setCountries(r.data || [])).catch(() => {});
  }, []);

  // Populate edit form
  useEffect(() => {
    if (influencer) {
      setPlatform('youtube');
      const statusLabel = influencer.status || (influencer.confirmedValue != null && {
        1:'Unconfirmed',2:'Auto Mail',3:'Manual Mail',4:'Responded',
        5:'Confirmed',6:'Managed',7:'Suspended',9:'BMI',10:'Confirmed PPC'
      }[influencer.confirmedValue]) || '';
      setYtForm({
        name:               influencer.name || '',
        channel_name:       influencer.channel_name || '',
        channel_url:        influencer.channel_url || (influencer.channel ? `https://www.youtube.com/channel/${influencer.channel}` : ''),
        gender:             influencer.approach || influencer.gender || '',
        email:              influencer.yt_email || influencer.email || '',
        contact_number:     influencer.cont_number || '',
        currency:           influencer.currency || '',
        video_price:        influencer.yt_price ?? '',
        pitching_price:     influencer.est_price ?? '',
        barter:             (influencer.barter===1||influencer.barter==='1'||influencer.barter===true) ? 'yes' : 'no',
        language:           influencer.language || '',
        city:               influencer.city || '',
        country:            influencer.country || '',
        status:             statusLabel,
        conversation_email: influencer.conemail || '',
        managed_by:         influencer.managedby || '',
        free_promotion:     !!(influencer.freepromotion ?? influencer.free_promotion),
        note:               stripCommentDisplay(influencer.note),
        admin_note:         stripCommentDisplay(influencer.admin_note),
      });
    } else {
      setYtForm(YT_DEFAULTS);
      setIgForm(IG_DEFAULTS);
      setPlatform('youtube');
    }
    setErrors({});
  }, [influencer]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (platform === 'youtube') {
      if (!(formData.channel_name||'').trim()) e.channel_name = 'Channel name is required';
      if (!(formData.channel_url||'').trim())  e.channel_url  = 'Channel URL is required';
      if (!(formData.gender||'').trim())        e.gender       = 'Gender is required';
      if (!(formData.email||'').trim())         e.email        = 'Email is required';
      else if (!emailRegex.test(formData.email.trim())) e.email = 'Enter a valid email';
      if ((formData.contact_number||'').trim() && !phoneRegex.test(formData.contact_number.trim()))
        e.contact_number = 'Enter a valid phone number';
      if (!(formData.language||'').trim()) e.language = 'Language is required';
      if (!(formData.country||'').trim())  e.country  = 'Country is required';
      if (formData.status === 'Confirmed') {
        if (!(formData.currency||'').trim()) e.currency = 'Currency required when Confirmed';
        const vp = Number(formData.video_price);
        if (!formData.video_price || isNaN(vp) || vp <= 0) e.video_price = 'Video price > 0 required when Confirmed';
        if (!(formData.pitching_price||'').toString().trim()) e.pitching_price = 'Pitching price required when Confirmed';
        if (!(formData.conversation_email||'').trim()) e.conversation_email = 'Conversation email required when Confirmed';
      }
      // managed_by is optional — no validation
    } else {
      // Instagram
      if (!(formData.instagram_url||'').trim()) e.instagram_url = 'Instagram URL is required';
      if (!(formData.email||'').trim()) e.email = 'Email is required';
      else if (!emailRegex.test(formData.email.trim())) e.email = 'Enter a valid email';
      if (formData.status === '1') { // Confirmed
        if (!(formData.conversation_email||'').trim()) e.conversation_email = 'Conversation email required when Confirmed';
        if (formData.currency && (!formData.reel_price || Number(formData.reel_price) <= 0))
          e.reel_price = 'Reel price required when currency is set';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (platform === 'youtube') {
      const payload = {
        name:               formData.name.trim(),
        channel_name:       formData.channel_name.trim(),
        channel_url:        formData.channel_url.trim(),
        gender:             formData.gender,
        email:              formData.email.trim(),
        phone:              formData.contact_number.trim() || undefined,
        currency:           formData.currency || undefined,
        video_price:        formData.video_price,
        pitching_price:     formData.pitching_price,
        barter:             formData.barter,
        language:           formData.language,
        city:               formData.city.trim() || undefined,
        country:            formData.country,
        status:             formData.status,
        conversation_email: formData.conversation_email.trim() || undefined,
        managed_by:         formData.managed_by || undefined,
        free_promotion:     formData.free_promotion,
        note:               formData.note.trim() || undefined,
        admin_note:         formData.admin_note.trim() || undefined,
      };
      if (isEdit) {
        onSave({
          name:          payload.name,
          channel_name:  payload.channel_name,
          channel_url:   payload.channel_url,
          approach:      formData.gender,
          gender:        formData.gender,
          yt_email:      payload.email,
          cont_number:   payload.phone || '',
          currency:      payload.currency,
          yt_price:      payload.video_price !== '' && payload.video_price != null ? Number(payload.video_price) : '',
          est_price:     payload.pitching_price !== '' && payload.pitching_price != null ? Number(payload.pitching_price) : '',
          barter:        payload.barter === 'yes' ? 1 : 0,
          language:      payload.language,
          city:          payload.city,
          country:       payload.country,
          conemail:      payload.conversation_email || '',
          managedby:     payload.managed_by,
          free_promotion: payload.free_promotion ? 1 : 0,
          note:          payload.note || '',
          admin_note:    payload.admin_note || '',
          confirmed:     formData.status ? (YT_STATUS_TO_NUM[formData.status] ?? formData.status) : '',
        });
      } else {
        onSave(payload);
      }
    } else {
      // Instagram — always add (no edit from Add Influencer button)
      onSave({
        _platform:          'instagram',
        name:               formData.name.trim(),
        instagram_url:      formData.instagram_url.trim(),
        gender:             formData.gender,
        category:           formData.category.trim() || undefined,
        website:            formData.website.trim() || undefined,
        email:              formData.email.trim(),
        phone:              formData.contact_number.trim() || undefined,
        currency:           formData.currency || undefined,
        reel_price:         formData.reel_price || undefined,
        post_price:         formData.post_price || undefined,
        story_price:        formData.story_price || undefined,
        barter:             formData.barter,
        language:           formData.language || undefined,
        country:            formData.country || undefined,
        bio:                formData.bio.trim() || undefined,
        status:             formData.status,
        conversation_email: formData.conversation_email.trim() || undefined,
        managed_by:         formData.managed_by || undefined,
        free_promotion:     formData.free_promotion,
        note:               formData.note.trim() || undefined,
      });
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400';
  const lbl = 'block font-medium mb-0.5 text-sm';
  const err = 'text-red-500 text-xs mt-0.5';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">

          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {isEdit ? 'Edit Influencer' : 'Add Influencer'}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Platform selector — only show when adding (not editing) */}
          {!isEdit && (
            <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-2">Select Platform</p>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
                  platform === 'youtube'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="platform" value="youtube"
                    checked={platform === 'youtube'}
                    onChange={() => { setPlatform('youtube'); setErrors({}); }}
                    className="hidden"/>
                  {YT_LOGO}
                  <span className="text-sm font-medium ml-1">YouTube</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
                  platform === 'instagram'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="platform" value="instagram"
                    checked={platform === 'instagram'}
                    onChange={() => { setPlatform('instagram'); setErrors({}); }}
                    className="hidden"/>
                  {IG_LOGO}
                  <span className="text-sm font-medium ml-1">Instagram</span>
                </label>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">

            {/* ── COMMON: Name ── */}
            <div>
              <label className={lbl}>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={inp}/>
            </div>

            {/* ── YOUTUBE ONLY ── */}
            {platform === 'youtube' && (
              <>
                <div>
                  <label className={lbl}>Channel Name <span className="text-red-500">*</span></label>
                  <input type="text" name="channel_name" value={formData.channel_name} onChange={handleChange} className={inp}/>
                  {errors.channel_name && <p className={err}>{errors.channel_name}</p>}
                </div>
                <div>
                  <label className={lbl}>Channel URL <span className="text-red-500">*</span></label>
                  <input type="text" name="channel_url" value={formData.channel_url} onChange={handleChange}
                    placeholder="https://www.youtube.com/channel/..." className={inp}/>
                  {errors.channel_url && <p className={err}>{errors.channel_url}</p>}
                </div>
              </>
            )}

            {/* ── INSTAGRAM ONLY ── */}
            {platform === 'instagram' && (
              <>
                <div>
                  <label className={lbl}>Instagram URL <span className="text-red-500">*</span></label>
                  <input type="text" name="instagram_url" value={formData.instagram_url} onChange={handleChange}
                    placeholder="https://instagram.com/username" className={inp}/>
                  {errors.instagram_url && <p className={err}>{errors.instagram_url}</p>}
                </div>
                <div>
                  <label className={lbl}>Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleChange}
                    placeholder="e.g. Actor, Blogger" className={inp}/>
                </div>
                <div>
                  <label className={lbl}>Website</label>
                  <input type="text" name="website" value={formData.website} onChange={handleChange}
                    placeholder="https://..." className={inp}/>
                </div>
              </>
            )}

            {/* ── COMMON: Gender ── */}
            <div>
              <label className={lbl}>Gender {platform === 'youtube' && <span className="text-red-500">*</span>}</label>
              <div className="flex gap-4">
                {['male','female','neutral'].map(g => (
                  <label key={g} className="flex items-center gap-1">
                    <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange}/>
                    <span className="capitalize">{g}</span>
                  </label>
                ))}
              </div>
              {errors.gender && <p className={err}>{errors.gender}</p>}
            </div>

            {/* ── COMMON: Email ── */}
            <div>
              <label className={lbl}>Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={inp}/>
              {errors.email && <p className={err}>{errors.email}</p>}
            </div>

            {/* ── COMMON: Contact ── */}
            <div>
              <label className={lbl}>Contact Number</label>
              <input type="text" name="contact_number" value={formData.contact_number} onChange={handleChange} className={inp}/>
              {errors.contact_number && <p className={err}>{errors.contact_number}</p>}
            </div>

            {/* ── PRICE ── YT: Currency + Video + Pitching | IG: Currency + Reel + Post + Story ── */}
            {platform === 'youtube' ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={lbl}>Currency</label>
                  <select name="currency" value={formData.currency} onChange={handleChange} className={inp}>
                    <option value="">Select</option>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.currency && <p className={err}>{errors.currency}</p>}
                </div>
                <div>
                  <label className={lbl}>Video Price</label>
                  <input type="number" min="0" step="any" name="video_price" value={formData.video_price} onChange={handleChange} className={inp}/>
                  {errors.video_price && <p className={err}>{errors.video_price}</p>}
                </div>
                <div>
                  <label className={lbl}>Pitching Price</label>
                  <input type="number" min="0" step="any" name="pitching_price" value={formData.pitching_price} onChange={handleChange} className={inp}/>
                  {errors.pitching_price && <p className={err}>{errors.pitching_price}</p>}
                </div>
              </div>
            ) : (
              <div>
                <label className={lbl}>Price</label>
                <div className="grid grid-cols-4 gap-2">
                  <select name="currency" value={formData.currency} onChange={handleChange} className={inp}>
                    <option value="">Currency</option>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min="0" name="reel_price" value={formData.reel_price}
                    onChange={handleChange} className={inp} placeholder="Reel price"/>
                  <input type="number" min="0" name="post_price" value={formData.post_price}
                    onChange={handleChange} className={inp} placeholder="Post price"/>
                  <input type="number" min="0" name="story_price" value={formData.story_price}
                    onChange={handleChange} className={inp} placeholder="Story price"/>
                </div>
                {errors.reel_price && <p className={err}>{errors.reel_price}</p>}
              </div>
            )}

            {/* ── COMMON: Barter ── */}
            <div>
              <label className={lbl}>Barter</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <input type="radio" name="barter" value="yes" checked={formData.barter === 'yes'} onChange={handleChange}/> Yes
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name="barter" value="no" checked={formData.barter === 'no'} onChange={handleChange}/> No
                </label>
              </div>
            </div>

            {/* ── COMMON: Language ── */}
            <div>
              <label className={lbl}>Language {platform === 'youtube' && <span className="text-red-500">*</span>}</label>
              <select name="language" value={formData.language} onChange={handleChange} className={inp}>
                <option value="">Select</option>
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.language && <p className={err}>{errors.language}</p>}
            </div>

            {/* ── YT ONLY: City ── */}
            {platform === 'youtube' && (
              <div>
                <label className={lbl}>City</label>
                <input type="text" name="city" value={formData.city} onChange={handleChange} className={inp}/>
              </div>
            )}

            {/* ── COMMON: Country ── */}
            <div>
              <label className={lbl}>Country {platform === 'youtube' && <span className="text-red-500">*</span>}</label>
              <select name="country" value={formData.country} onChange={handleChange} className={inp}>
                <option value="">Select</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className={err}>{errors.country}</p>}
            </div>

            {/* ── IG ONLY: Bio ── */}
            {platform === 'instagram' && (
              <div>
                <label className={lbl}>Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className={inp}/>
              </div>
            )}

            {/* ── COMMON: Status ── */}
            <div>
              <label className={lbl}>Status</label>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {(platform === 'youtube' ? YT_STATUS_OPTIONS : IG_STATUS_OPTIONS).map(o => (
                  <label key={o.value} className="flex items-center gap-1">
                    <input type="radio" name="status" value={o.value}
                      checked={formData.status === o.value} onChange={handleChange}/>
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {/* ── COMMON: Conversation Email ── */}
            <div>
              <label className={lbl}>Conversation Email</label>
              <input type="email" name="conversation_email" value={formData.conversation_email} onChange={handleChange} className={inp}/>
              {errors.conversation_email && <p className={err}>{errors.conversation_email}</p>}
            </div>

            {/* ── COMMON: Managed By (optional) ── */}
            <div>
              <label className={lbl}>Managed By</label>
              <select name="managed_by" value={formData.managed_by} onChange={handleChange} className={inp}>
                <option value="">Select (optional)</option>
                {MANAGED_BY_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* ── COMMON: Free Promotion ── */}
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="free_promotion" checked={formData.free_promotion}
                  onChange={handleChange} className="w-4 h-4 rounded border-gray-300"/>
                <span className="font-medium text-sm">Free Promotion</span>
              </label>
            </div>

            {/* ── COMMON: Note ── */}
            <div>
              <label className={lbl}>Note</label>
              <textarea name="note" value={formData.note} onChange={handleChange} rows={3} className={inp}/>
            </div>

            {/* ── YT ONLY: Admin Note ── */}
            {platform === 'youtube' && (
              <div>
                <label className={lbl}>Admin Note</label>
                <textarea name="admin_note" value={formData.admin_note} onChange={handleChange} rows={3} className={inp}/>
              </div>
            )}

            {/* ── Footer buttons ── */}
            <div className="flex justify-between pt-4">
              <div>
                {isEdit && onDelete && (
                  <button type="button"
                    onClick={() => {
                      if (window.confirm('Delete this influencer?')) {
                        setDeleting(true);
                        onDelete(influencer.id).finally(() => setDeleting(false));
                      }
                    }}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm">
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                  Close
                </button>
                <button type="submit"
                  className={`px-4 py-2 text-white rounded text-sm ${
                    platform === 'instagram'
                      ? 'bg-pink-600 hover:bg-pink-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                  {isEdit ? 'Update' : (platform === 'instagram' ? 'Add Instagram' : 'Add')}
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
