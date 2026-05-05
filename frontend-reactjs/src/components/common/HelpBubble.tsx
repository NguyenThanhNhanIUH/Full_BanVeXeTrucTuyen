import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, X } from 'lucide-react';
import axios from 'axios';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

type AssistantChatResponse = {
  answer: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};


const HelpBubble = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'bot',
      text: 'Bạn cần tra cứu chuyến nào? Ví dụ: “tháng 6 có chuyến từ TP. Hồ Chí Minh đến Nha Trang không?”',
    },
  ]);

  const canSend = useMemo(() => Boolean(inputValue.trim()) && !loading, [inputValue, loading]);

  const handleQuestion = async (question: string) => {
    try {
      const { data } = await axios.post<ApiResponse<AssistantChatResponse>>('/api/public/assistant/chat', {
        question,
      });
      const answer = data?.data?.answer?.trim();
      return answer || 'Không thể trả lời lúc này. Bạn thử lại sau nhé.';
    } catch (error) {
      if (axios.isAxiosError<ApiResponse<never>>(error)) {
        const apiMessage = error.response?.data?.message?.trim();
        if (apiMessage) {
          return apiMessage;
        }
      }
      return 'Không thể kết nối trợ lý AI. Bạn thử lại sau nhé.';
    }
  };

  const sendMessage = async () => {
    if (!canSend) return;
    const question = inputValue.trim();
    setInputValue('');
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: question,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    const answer = await handleQuestion(question);
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-bot`,
        role: 'bot',
        text: answer,
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 w-[320px] rounded-2xl border border-[#ef5222]/20 bg-white p-4 shadow-xl shadow-orange-100/70">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#ef5222]">Trợ lý đặt vé</p>
              <p className="text-xs text-gray-500">Bạn hỏi, mình trả lời ngay</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Đóng trợ lý"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-64 space-y-3 overflow-auto rounded-xl bg-[#fffaf8] p-3 text-sm text-gray-700">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`w-full ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#ef5222] text-white'
                      : 'bg-white text-gray-700 border border-gray-100'
                  }`}
                >
                  {msg.text.split('\n').map((line, index) => (
                    <p key={`${msg.id}-${index}`}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <div className="inline-block rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs text-gray-500">
                  Đang trả lời...
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Nhập câu hỏi..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#ef5222] focus:ring-2 focus:ring-[#ef5222]/15"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSend}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ef5222] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Gửi câu hỏi"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ef5222] text-white shadow-lg shadow-orange-200 transition hover:scale-105"
        aria-label="Mở trợ lý đặt vé"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
};

export default HelpBubble;
