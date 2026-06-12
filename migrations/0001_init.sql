CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    display_date TEXT NOT NULL,
    sort_date TEXT NOT NULL,
    is_period INTEGER DEFAULT 0,
    end_date TEXT,
    title TEXT NOT NULL,
    content TEXT,
    region TEXT CHECK(region IN ('DOMESTIC', 'INTERNATIONAL')) NOT NULL,
    tags TEXT,
    related_event_ids TEXT,
    created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

INSERT INTO events (id, display_date, sort_date, is_period, end_date, title, content, region, tags, related_event_ids) 
VALUES 
('seed-1', '1914-07-28', '1914-07-28', 1, '1918-11-11', '제1차 세계 대전', '사라예보 사건을 계기로 발발한 인류 최초의 세계 대전', 'INTERNATIONAL', '["세계사", "전쟁", "20세기"]', '[]'),
('seed-2', '1919-03-01', '1919-03-01', 0, NULL, '3·1 운동', '일제의 무단 통치에 맞서 일어난 한민족 최대 규모의 독립운동', 'DOMESTIC', '["한국사", "일제강점기", "독립운동"]', '[]'),
('seed-3', '1939-09-01', '1939-09-01', 1, '1945-09-02', '제2차 세계 대전', '독일의 폴란드 침공으로 발발한 전 지구적 전쟁', 'INTERNATIONAL', '["세계사", "전쟁", "냉전"]', '[]'),
('seed-4', '1945-08-15', '1945-08-15', 0, NULL, '대한민국 광복', '2차 세계 대전 종전과 함께 일제 강점기로부터 해방', 'DOMESTIC', '["한국사", "현대사", "해방"]', '["seed-3"]'),
('seed-5', '1970-11-13', '1970-11-13', 0, NULL, '전태일 열사 분신 사건', '"근로기준법을 준수하라"며 분신, 한국 노동운동사의 전환점', 'DOMESTIC', '["한국사", "노동운동", "현대사"]', '[]'),
('seed-6', '1987-06-10', '1987-06-10', 1, '1987-06-29', '6월 민주 항쟁', '전국적인 반독재 민주화 운동으로 대통령 직선제 개헌 유도', 'DOMESTIC', '["한국사", "민주화", "현대사"]', '[]');
