-- Supabase Database Schema for Atlantis Clan Management
-- Execute this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    clan_rank VARCHAR(100),
    clan_name VARCHAR(100),
    total_level INTEGER DEFAULT 0,
    total_experience BIGINT DEFAULT 0,
    combat_level INTEGER DEFAULT 3,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player skills table
CREATE TABLE IF NOT EXISTS player_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    skill_name VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    experience BIGINT DEFAULT 0,
    rank INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, skill_name)
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    item_name VARCHAR(255),
    description TEXT,
    donation_type VARCHAR(50) DEFAULT 'gp', -- 'gp', 'item', 'service'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(100), -- 'pvm', 'skilling', 'social', 'competition'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'active', 'completed', 'cancelled'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event participants table
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'attended', 'no_show'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, player_id)
);

-- Clan statistics table
CREATE TABLE IF NOT EXISTS clan_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    clan_name VARCHAR(100) NOT NULL,
    total_members INTEGER DEFAULT 0,
    total_donations BIGINT DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    avg_level DECIMAL(5,2) DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'level_up', 'donation', 'event_join', 'clan_join'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table (for admin/officer permissions)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'admin', 'officer', 'member'
    clan_name VARCHAR(100),
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, clan_name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_clan ON players(clan_name);
CREATE INDEX IF NOT EXISTS idx_player_skills_player_id ON player_skills(player_id);
CREATE INDEX IF NOT EXISTS idx_donations_player_id ON donations(player_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_activity_logs_player_id ON activity_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_skills_updated_at BEFORE UPDATE ON player_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read for authenticated users" ON players
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON player_skills
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON donations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON event_participants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON clan_statistics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read for authenticated users" ON activity_logs
    FOR SELECT TO authenticated USING (true);

-- Allow admins and officers to manage data
CREATE POLICY "Allow admin/officer write access" ON players
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'officer')
        )
    );

CREATE POLICY "Allow admin/officer write access" ON donations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'officer')
        )
    );

CREATE POLICY "Allow admin/officer write access" ON events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'officer')
        )
    );

-- Insert initial clan statistics
INSERT INTO clan_statistics (clan_name, total_members, total_donations, total_events)
VALUES 
    ('Atlantis', 0, 0, 0),
    ('Atlantis Argus', 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Insert initial admin role (replace with your user ID)
-- INSERT INTO user_roles (user_id, role, clan_name)
-- VALUES ('your-user-uuid-here', 'admin', 'Atlantis');