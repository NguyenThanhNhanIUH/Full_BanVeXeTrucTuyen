import { Calendar, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import bannerImage from '../../../assets/banner.png';

type HomeSearchHeroProps = {
  /** URL Cloudinary (ưu tiên) hoặc để trống dùng ảnh tĩnh mặc định */
  bannerUrl?: string | null;
  tripType: 'one-way' | 'round-trip';
  onTripTypeChange: (t: 'one-way' | 'round-trip') => void;
  diemDi: string;
  onDiemDiChange: (v: string) => void;
  goiYDiemDi: string[];
  onSwapPlaces: () => void;
  diemDen: string;
  onDiemDenChange: (v: string) => void;
  goiYDiemDen: string[];
  ngayDi: string;
  onNgayDiChange: (v: string) => void;
  ngayVe: string;
  onNgayVeChange: (v: string) => void;
  soVe: string;
  onSoVeChange: (v: string) => void;
  onSearchTrips: () => void;
  dangTimChuyen: boolean;
};

const HomeSearchHero = ({
  bannerUrl,
  tripType,
  onTripTypeChange,
  diemDi,
  onDiemDiChange,
  goiYDiemDi,
  onSwapPlaces,
  diemDen,
  onDiemDenChange,
  goiYDiemDen,
  ngayDi,
  onNgayDiChange,
  ngayVe,
  onNgayVeChange,
  soVe,
  onSoVeChange,
  onSearchTrips,
  dangTimChuyen,
}: HomeSearchHeroProps) => (
  <>
    <div className="w-full py-4 flex justify-center">
      <img
        src={bannerUrl && bannerUrl.trim() ? bannerUrl : bannerImage}
        alt="Banner"
        className="object-cover rounded-xl shadow-md w-full max-w-6xl max-h-[400px]"
      />
    </div>

    <div className="container mx-auto px-4 -mt-8 relative z-10">
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 max-w-5xl mx-auto">
        <div className="flex space-x-6 mb-4 border-b border-gray-200 pb-2">
          <label className="flex items-center space-x-2 cursor-pointer text-[#ef5222] font-medium">
            <input
              type="radio"
              name="tripType"
              checked={tripType === 'one-way'}
              onChange={() => onTripTypeChange('one-way')}
              className="form-radio text-[#ef5222]"
            />
            <span>Một chiều</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-gray-500">
            <input
              type="radio"
              name="tripType"
              checked={tripType === 'round-trip'}
              onChange={() => onTripTypeChange('round-trip')}
              className="form-radio"
            />
            <span>Khứ hồi</span>
          </label>
          <Link to="/huong-dan-dat-ve" className="ml-auto text-sm text-[#ef5222] hover:underline">
            Hướng dẫn đặt vé
          </Link>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="lg:flex-[1.8]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Điểm đi</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={diemDi}
                onChange={(e) => onDiemDiChange(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222] appearance-none bg-white text-gray-800"
              >
                <option value="">Chọn điểm đi</option>
                {goiYDiemDi.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-center lg:flex-none lg:pb-1">
            <label className="sr-only">Đảo điểm đi và điểm đến</label>
            <button
              type="button"
              onClick={onSwapPlaces}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-500 shadow-sm transition hover:border-[#ef5222]/40 hover:text-[#ef5222]"
              title="Đảo điểm đi và điểm đến"
            >
              ⇌
            </button>
          </div>
          <div className="lg:flex-[1.8]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Điểm đến</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={diemDen}
                onChange={(e) => onDiemDenChange(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222] appearance-none bg-white text-gray-800"
              >
                <option value="">Chọn điểm đến</option>
                {goiYDiemDen.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="lg:flex-[1.15]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày đi</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="date"
                lang="vi-VN"
                value={ngayDi}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => onNgayDiChange(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
              />
            </div>
          </div>
          {tripType === 'round-trip' && (
            <div className="lg:flex-[1.15]">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày về</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  lang="vi-VN"
                  value={ngayVe}
                  min={ngayDi || new Date().toISOString().split('T')[0]}
                  onChange={(e) => onNgayVeChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222]"
                />
              </div>
            </div>
          )}
          <div className="lg:flex-[0.9]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Số vé</label>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={soVe}
                onChange={(e) => onSoVeChange(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:border-[#ef5222] appearance-none bg-white"
              >
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={onSearchTrips}
            disabled={dangTimChuyen}
            className="bg-[#ef5222] hover:bg-[#d84a1e] text-white px-12 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105 flex items-center disabled:opacity-70"
          >
            {dangTimChuyen ? 'Đang tìm...' : 'Tìm chuyến xe'}
          </button>
        </div>
      </div>
    </div>
  </>
);

export default HomeSearchHero;
