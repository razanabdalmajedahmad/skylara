'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Home,
  MapPin,
  DollarSign,
  Users,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';

interface ListingForm {
  title: string;
  description: string;
  listingType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  pricePerNightCents: string;
  cleaningFeeCents: string;
  maxGuests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  amenities: string[];
  skydiverAmenities: string[];
  petPolicy: string;
  cancellationPolicy: string;
  bookingMode: string;
  photoUrls: string;
}

const LISTING_TYPES = [
  { value: 'HOUSE', label: 'House' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'ROOM', label: 'Private Room' },
  { value: 'CAMPSITE', label: 'Campsite' },
  { value: 'BUNKHOUSE', label: 'Bunkhouse' },
  { value: 'RV_SPOT', label: 'RV Spot' },
];

const GENERAL_AMENITIES = [
  'WiFi', 'Kitchen', 'Air Conditioning', 'Heating', 'Washer', 'Dryer',
  'Free Parking', 'Pool', 'Hot Tub', 'BBQ Grill', 'Fire Pit', 'Patio',
];

const SKYDIVER_AMENITIES = [
  'Gear Storage', 'Packing Area', 'DZ Shuttle', 'Walking Distance to DZ',
  'Rigger Space', 'Tunnel Nearby', 'Early Check-in', 'Late Checkout',
];

const PET_OPTIONS = [
  { value: 'NO_PETS', label: 'No Pets' },
  { value: 'DOGS_ONLY', label: 'Dogs Only' },
  { value: 'ALL_PETS', label: 'All Pets Welcome' },
];

const CANCELLATION_OPTIONS = [
  { value: 'FLEXIBLE', label: 'Flexible - Full refund up to 24h before' },
  { value: 'MODERATE', label: 'Moderate - Full refund up to 5 days before' },
  { value: 'STRICT', label: 'Strict - 50% refund up to 7 days before' },
];

const BOOKING_MODES = [
  { value: 'INSTANT', label: 'Instant Book' },
  { value: 'REQUEST', label: 'Request to Book (manual approval)' },
];

const initialForm: ListingForm = {
  title: '',
  description: '',
  listingType: 'HOUSE',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  pricePerNightCents: '',
  cleaningFeeCents: '',
  maxGuests: '2',
  bedrooms: '1',
  beds: '1',
  bathrooms: '1',
  amenities: [],
  skydiverAmenities: [],
  petPolicy: 'NO_PETS',
  cancellationPolicy: 'MODERATE',
  bookingMode: 'REQUEST',
  photoUrls: '',
};

export default function NewRentalListingPage() {
  const router = useRouter();
  const [form, setForm] = useState<ListingForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ListingForm, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const toggleArrayItem = (field: 'amenities' | 'skydiverAmenities', item: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter((a) => a !== item)
        : [...prev[field], item],
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (!form.address.trim()) errors.address = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.pricePerNightCents || Number(form.pricePerNightCents) <= 0) errors.pricePerNightCents = 'Price must be greater than 0';
    if (!form.maxGuests || Number(form.maxGuests) < 1) errors.maxGuests = 'Must accommodate at least 1 guest';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const photos = form.photoUrls
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ url }));

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        listingType: form.listingType,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim() || 'US',
        postalCode: form.postalCode.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        pricePerNightCents: Math.round(parseFloat(form.pricePerNightCents) * 100),
        cleaningFeeCents: form.cleaningFeeCents ? Math.round(parseFloat(form.cleaningFeeCents) * 100) : 0,
        maxGuests: parseInt(form.maxGuests, 10),
        bedrooms: parseInt(form.bedrooms, 10),
        beds: parseInt(form.beds, 10),
        bathrooms: parseInt(form.bathrooms, 10),
        amenities: form.amenities,
        skydiverAmenities: form.skydiverAmenities,
        petPolicy: form.petPolicy,
        cancellationPolicy: form.cancellationPolicy,
        bookingMode: form.bookingMode,
        photos,
      };

      const res = await apiPost<{ success: boolean; data: any }>('/rentals/listings', payload);
      if (res.success && res.data) {
        router.push('/dashboard/rentals/listings');
      } else {
        setError('Failed to create listing. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3 py-2 rounded-lg border ${
      validationErrors[field] ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500'
    } bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:outline-none`;

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Listing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Add a rental property near a dropzone</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Home className="w-4 h-4 text-blue-600" /> Basic Information
          </h2>
          <div>
            <label className={labelClass}>Title *</label>
            <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Cozy house near Skydive City" className={inputClass('title')} />
            {validationErrors.title && <p className="text-xs text-red-500 mt-1">{validationErrors.title}</p>}
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Describe your property, what makes it great for skydivers..." className={inputClass('description')} />
            {validationErrors.description && <p className="text-xs text-red-500 mt-1">{validationErrors.description}</p>}
          </div>
          <div>
            <label className={labelClass}>Listing Type</label>
            <select value={form.listingType} onChange={(e) => updateField('listingType', e.target.value)} className={inputClass('listingType')}>
              {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Location
          </h2>
          <div>
            <label className={labelClass}>Address *</label>
            <input value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="123 Skydive Lane" className={inputClass('address')} />
            {validationErrors.address && <p className="text-xs text-red-500 mt-1">{validationErrors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City *</label>
              <input value={form.city} onChange={(e) => updateField('city', e.target.value)} className={inputClass('city')} />
              {validationErrors.city && <p className="text-xs text-red-500 mt-1">{validationErrors.city}</p>}
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input value={form.state} onChange={(e) => updateField('state', e.target.value)} className={inputClass('state')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Country</label>
              <input value={form.country} onChange={(e) => updateField('country', e.target.value)} placeholder="US" className={inputClass('country')} />
            </div>
            <div>
              <label className={labelClass}>Postal Code</label>
              <input value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} className={inputClass('postalCode')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Latitude</label>
              <input value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} type="number" step="any" placeholder="28.0339" className={inputClass('latitude')} />
            </div>
            <div>
              <label className={labelClass}>Longitude</label>
              <input value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} type="number" step="any" placeholder="-81.9498" className={inputClass('longitude')} />
            </div>
          </div>
        </div>

        {/* Pricing & Capacity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" /> Pricing & Capacity
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Price Per Night ($) *</label>
              <input value={form.pricePerNightCents} onChange={(e) => updateField('pricePerNightCents', e.target.value)} type="number" step="0.01" min="0" placeholder="75.00" className={inputClass('pricePerNightCents')} />
              {validationErrors.pricePerNightCents && <p className="text-xs text-red-500 mt-1">{validationErrors.pricePerNightCents}</p>}
            </div>
            <div>
              <label className={labelClass}>Cleaning Fee ($)</label>
              <input value={form.cleaningFeeCents} onChange={(e) => updateField('cleaningFeeCents', e.target.value)} type="number" step="0.01" min="0" placeholder="50.00" className={inputClass('cleaningFeeCents')} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Max Guests *</label>
              <input value={form.maxGuests} onChange={(e) => updateField('maxGuests', e.target.value)} type="number" min="1" className={inputClass('maxGuests')} />
              {validationErrors.maxGuests && <p className="text-xs text-red-500 mt-1">{validationErrors.maxGuests}</p>}
            </div>
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input value={form.bedrooms} onChange={(e) => updateField('bedrooms', e.target.value)} type="number" min="0" className={inputClass('bedrooms')} />
            </div>
            <div>
              <label className={labelClass}>Beds</label>
              <input value={form.beds} onChange={(e) => updateField('beds', e.target.value)} type="number" min="0" className={inputClass('beds')} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input value={form.bathrooms} onChange={(e) => updateField('bathrooms', e.target.value)} type="number" min="0" className={inputClass('bathrooms')} />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Amenities
          </h2>
          <div>
            <label className={labelClass}>General Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GENERAL_AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArrayItem('amenities', a)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                  }`}
                >
                  {form.amenities.includes(a) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Skydiver-Specific Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SKYDIVER_AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArrayItem('skydiverAmenities', a)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    form.skydiverAmenities.includes(a)
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                  }`}
                >
                  {form.skydiverAmenities.includes(a) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Policies & Booking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Pet Policy</label>
              <select value={form.petPolicy} onChange={(e) => updateField('petPolicy', e.target.value)} className={inputClass('petPolicy')}>
                {PET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cancellation Policy</label>
              <select value={form.cancellationPolicy} onChange={(e) => updateField('cancellationPolicy', e.target.value)} className={inputClass('cancellationPolicy')}>
                {CANCELLATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Booking Mode</label>
              <select value={form.bookingMode} onChange={(e) => updateField('bookingMode', e.target.value)} className={inputClass('bookingMode')}>
                {BOOKING_MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-600" aria-hidden /> Photos
          </h2>
          <div>
            <label className={labelClass}>Photo URLs (one per line)</label>
            <textarea
              value={form.photoUrls}
              onChange={(e) => updateField('photoUrls', e.target.value)}
              rows={3}
              placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
              className={inputClass('photoUrls')}
            />
            <p className="text-xs text-gray-400 mt-1">Enter direct image URLs, one per line</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Create Listing
          </button>
        </div>
      </form>
    </div>
  );
}
