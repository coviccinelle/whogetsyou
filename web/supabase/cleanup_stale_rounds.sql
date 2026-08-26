-- ============================================================
-- Dọn sạch dữ liệu vòng chơi tồn đọng (nguyên nhân bug "câu trả lời cũ chen vào").
-- Chạy trong Supabase → SQL Editor. An toàn khi không có ai đang chơi dở.
-- ============================================================

-- 1. Xoá toàn bộ rounds → tự động cascade xoá submissions & guesses.
delete from rounds;

-- 2. Đưa mọi phòng đang ở trạng thái "đang chơi" về lobby cho sạch.
update rooms
set started        = false,
    phase          = null,
    round          = 0,
    turn_index     = 0,
    selected_theme = null,
    selected_level = null,
    question       = null,
    winners        = '[]'::jsonb,
    end_reason     = null
where started = true;
