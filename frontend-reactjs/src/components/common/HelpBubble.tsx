import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Maximize2, MessageCircle, Minimize2, Send, Sparkles, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { api } from '../../api/client';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type AssistantTripCard = {
  id: number;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  ngayDi?: string;
  gioDi?: string;
  gioDenDuKien?: string;
  thoiGianDuKienPhut?: number;
  giaVe?: number;
  loaiXe?: string;
  bienSo?: string;
  soGheTrong?: number;
  subtitle?: string;
  availableSeats?: string[];
};

type AssistantAction = {
  type: string;
  label: string;
  path?: string;
  diemDi?: string;
  diemDen?: string;
  ngayDi?: string;
};

type AssistantChatResponse = {
  answer: string;
  suggestions?: string[];
  trips?: AssistantTripCard[];
  actions?: AssistantAction[];
};

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  suggestions?: string[];
  trips?: AssistantTripCard[];
  actions?: AssistantAction[];
};

const QUICK_PROMPTS = [
  'Bữa nay TP.HCM đi Cà Mau có chuyến không?',
  'Cách đặt trước thanh toán sau?',
  'Làm sao tra cứu và hủy vé?',
  'Theo dõi xe trên bản đồ thế nào?',
];

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const addMinutesToTime = (time?: string, minutes?: number) => {
  if (!time || !minutes) return time?.slice(0, 5);
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
};

const HelpBubble = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'bot',
      text:
        'Xin chào! Mình là trợ lý VinaGo.\n' +
        '• Tìm chuyến và bấm chọn để đặt vé ngay\n' +
        '• Gợi ý đặt trước, tra cứu, theo dõi xe\n\n' +
        'Hỏi tự nhiên hoặc chọn gợi ý bên dưới nhé.',
      suggestions: QUICK_PROMPTS,
      actions: [
        { type: 'NAVIGATE', label: 'Mở trang chủ', path: '/' },
        { type: 'NAVIGATE', label: 'Tra cứu vé', path: '/tra-cuu-ve' },
      ],
    },
  ]);

  const canSend = useMemo(() => Boolean(inputValue.trim()) && !loading, [inputValue, loading]);

  const panelClass = isExpanded
    ? 'mb-3 flex w-[min(720px,calc(100vw-2rem))] flex-col rounded-2xl border border-[#ef5222]/20 bg-white shadow-2xl shadow-orange-100/70'
    : 'mb-3 flex w-[min(440px,calc(100vw-2rem))] flex-col rounded-2xl border border-[#ef5222]/20 bg-white shadow-xl shadow-orange-100/70';

  const chatHeightClass = isExpanded ? 'min-h-[420px] max-h-[min(560px,62vh)]' : 'min-h-[300px] max-h-[min(420px,52vh)]';

  const handleQuestion = async (question: string): Promise<AssistantChatResponse> => {
    try {
      const { data } = await api.post<ApiResponse<AssistantChatResponse>>('/api/public/assistant/chat', {
        question,
      });
      const payload = data?.data;
      return {
        answer: payload?.answer?.trim() || 'Không thể trả lời lúc này. Bạn thử lại sau nhé.',
        suggestions: payload?.suggestions ?? [],
        trips: payload?.trips ?? [],
        actions: payload?.actions ?? [],
      };
    } catch (error) {
      if (isAxiosError<ApiResponse<never>>(error)) {
        const apiMessage = error.response?.data?.message?.trim();
        if (apiMessage) {
          return { answer: apiMessage, suggestions: [], trips: [], actions: [] };
        }
      }
      return { answer: 'Không thể kết nối trợ lý AI. Bạn thử lại sau nhé.', suggestions: [], trips: [], actions: [] };
    }
  };

  const onTripClick = (trip: AssistantTripCard) => {
    navigate('/dat-ve', {
      state: {
        tripType: 'one-way',
        trip: {
          id: trip.id,
          tenTuyen: trip.tenTuyen,
          diemDi: trip.diemDi,
          diemDen: trip.diemDen,
          ngayDi: trip.ngayDi || '',
          gioDi: trip.gioDi || '',
          gioDenDuKien: trip.gioDenDuKien || addMinutesToTime(trip.gioDi, trip.thoiGianDuKienPhut),
          thoiGianDuKienPhut: trip.thoiGianDuKienPhut,
          giaVe: Number(trip.giaVe || 0),
          loaiXe: trip.loaiXe || '',
          bienSo: trip.bienSo || '',
        },
        selectedSeats: [],
      },
    });
    setIsOpen(false);
  };

  const onActionClick = (action: AssistantAction) => {
    if (action.type === 'SEARCH' && action.diemDi && action.diemDen) {
      navigate('/', {
        state: {
          assistantSearch: {
            diemDi: action.diemDi,
            diemDen: action.diemDen,
            ngayDi: action.ngayDi,
          },
        },
      });
    } else if (action.path) {
      navigate(action.path);
    }
    setIsOpen(false);
  };

  const sendMessage = async (raw?: string) => {
    const question = (raw ?? inputValue).trim();
    if (!question || loading) return;
    setInputValue('');
    setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: 'user', text: question }]);
    setLoading(true);
    const res = await handleQuestion(question);
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-bot`,
        role: 'bot',
        text: res.answer,
        suggestions: res.suggestions,
        trips: res.trips,
        actions: res.actions,
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    setIsOpen(false);
    setIsExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen, isExpanded]);

  const renderBotExtras = (msg: ChatMessage) => {
    if (msg.role !== 'bot') return null;
    return (
      <>
        {msg.trips && msg.trips.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.trips.map((trip) => (
              <button
                key={`trip-${trip.id}-${trip.ngayDi}-${trip.gioDi}`}
                type="button"
                onClick={() => onTripClick(trip)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#ef5222]/20 bg-white px-3 py-2.5 text-left transition hover:border-[#ef5222]/50 hover:bg-[#fff7f4]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{trip.tenTuyen}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{trip.subtitle || formatCurrency(Number(trip.giaVe))}</p>
                  {trip.availableSeats && trip.availableSeats.length > 0 && (
                    <p className="mt-1 text-[11px] font-medium text-[#00613d]">
                      Ghế trống: {trip.availableSeats.join(', ')}
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#ef5222]">
                  Đặt vé <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        )}
        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.actions.map((action, idx) => (
              <button
                key={`${action.type}-${action.label}-${idx}`}
                type="button"
                onClick={() => onActionClick(action)}
                className="rounded-full border border-[#00613d]/30 bg-[#f0faf5] px-3 py-1 text-xs font-semibold text-[#00613d] hover:bg-[#dff5eb]"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(s)}
                className="rounded-full border border-[#ef5222]/25 bg-[#fff7f4] px-2.5 py-1 text-[11px] font-medium text-[#c2410c] hover:bg-[#ffe8df] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {isOpen && (
        <div className={panelClass}>
          <div className="flex items-start justify-between border-b border-orange-50 px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0ea] text-[#ef5222]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-base font-semibold text-[#ef5222]">Trợ lý đặt vé VinaGo</p>
                <p className="text-xs text-gray-500">Tìm chuyến · Bấm đặt vé · Gợi ý thông minh</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                aria-label={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={`flex-1 space-y-3 overflow-y-auto bg-[#fffaf8] px-4 py-3 text-sm text-gray-700 ${chatHeightClass}`}>
            {messages.map((msg) => (
              <div key={msg.id} className={`w-full ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div
                  className={`inline-block max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-[#ef5222] text-white' : 'border border-gray-100 bg-white text-gray-700'
                  }`}
                >
                  {msg.text.split('\n').map((line, index) => (
                    <p key={`${msg.id}-${index}`} className={index > 0 ? 'mt-1.5' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
                {renderBotExtras(msg)}
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <div className="inline-block rounded-2xl border border-gray-100 bg-white px-3.5 py-2.5 text-sm text-gray-500">
                  Đang tìm và chuẩn bị gợi ý...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-orange-50 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-[#ef5222]/25 bg-[#fff7f4] px-2.5 py-1 text-[11px] font-medium text-[#c2410c] transition hover:bg-[#ffe8df] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={inputValue}
                rows={isExpanded ? 3 : 2}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ví dụ: Tìm xe TP.HCM đi Cà Mau tháng 7..."
                className="min-w-0 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ef5222] focus:ring-2 focus:ring-[#ef5222]/15"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!canSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ef5222] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Gửi"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ef5222] text-white shadow-lg shadow-orange-200 transition hover:scale-105"
        aria-label="Mở trợ lý đặt vé"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
};

export default HelpBubble;
