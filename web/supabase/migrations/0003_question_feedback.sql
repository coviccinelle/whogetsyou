-- Bảng feedback câu hỏi (người chơi đánh giá hay / báo lỗi câu hỏi).
-- Chạy trong Supabase → SQL Editor. Không mất dữ liệu.
create table if not exists question_feedback (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references rooms(id) on delete set null,
  round_id    uuid,
  player_id   uuid,
  question    text,
  question_en text,
  theme       text,
  level       text,
  kind        text not null,               -- like | report
  created_at  timestamptz not null default now()
);
create index if not exists question_feedback_kind_idx on question_feedback (kind, created_at desc);
alter table question_feedback enable row level security;
