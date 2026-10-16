-- =====================================================================
-- CREZIA — Script de creacion de base de datos v2 (PostgreSQL / Supabase)
-- Convencion: ingles, snake_case. Reemplaza completamente crezia_schema.sql.
-- Autenticacion: Supabase Auth (auth.users). El agente de IA (assistant_*)
-- NO vive en esta base de datos relacional (va en una BD vectorial aparte).
-- Ejecutar en el SQL Editor de Supabase en un solo lote.
-- =====================================================================

-- =====================================================================
-- 0. EXTENSIONES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 1. TIPOS ENUM
-- =====================================================================
CREATE TYPE user_role AS ENUM ('User', 'Admin');
CREATE TYPE gender_type AS ENUM ('Female', 'Male', 'Other');
CREATE TYPE movement_type AS ENUM ('Income', 'Expense');
CREATE TYPE payment_method AS ENUM ('Cash', 'Transfer', 'CreditCard', 'DebitCard', 'Other');
CREATE TYPE movement_source AS ENUM ('Manual', 'EmailParsed');
CREATE TYPE account_type AS ENUM ('Savings', 'Checking', 'Credit', 'Other');
CREATE TYPE goal_status AS ENUM ('Active', 'Completed', 'Cancelled', 'Overdue');
CREATE TYPE goal_reason AS ENUM ('Travel', 'Vehicle', 'Education', 'EmergencyFund', 'HomePurchase', 'Technology', 'DebtPayment', 'Other');
CREATE TYPE email_provider AS ENUM ('Gmail', 'Outlook');
CREATE TYPE parse_status AS ENUM ('Pending', 'Parsed', 'Failed', 'Ignored');
CREATE TYPE content_type AS ENUM ('Article', 'Video', 'Tip', 'Infographic');
CREATE TYPE content_status AS ENUM ('Draft', 'Published', 'Archived');
CREATE TYPE notification_type AS ENUM ('AntExpenseAlert', 'GoalDeadlineReminder', 'BudgetExceeded', 'System');

-- =====================================================================
-- 2. FUNCION REUTILIZABLE PARA updated_at AUTOMATICO
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3. TABLAS (en orden de dependencias)
-- =====================================================================

-- --- currency: catalogo de sistema, sin auditoria ---
CREATE TABLE currency (
    code            CHAR(3) PRIMARY KEY,
    name            VARCHAR(50) NOT NULL,
    symbol          VARCHAR(5) NOT NULL,
    decimal_places  SMALLINT NOT NULL DEFAULT 2 CHECK (decimal_places >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT true
);

-- --- users: identidad, referencia a Supabase Auth ---
CREATE TABLE users (
    id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id               VARCHAR(20) NOT NULL,
    name                      VARCHAR(150) NOT NULL,
    address                   VARCHAR(255),
    email                     VARCHAR(255) NOT NULL,
    phone                     VARCHAR(20),
    birth_date                DATE NOT NULL,
    gender                    gender_type,
    gender_other              VARCHAR(100),
    role                      user_role NOT NULL DEFAULT 'User',
    preferred_currency_code   CHAR(3) NOT NULL REFERENCES currency(code),
    two_factor_enabled        BOOLEAN NOT NULL DEFAULT false,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                UUID REFERENCES users(id),
    updated_by                UUID REFERENCES users(id),
    deleted_at                TIMESTAMPTZ,
    deleted_by                UUID REFERENCES users(id),
    CONSTRAINT chk_users_adult CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
);
CREATE UNIQUE INDEX uq_users_document_id ON users (document_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- categories: compartida entre ingresos y egresos ---
CREATE TABLE categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id),
    name          VARCHAR(100) NOT NULL,
    description   VARCHAR(255),
    is_default    BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID REFERENCES users(id),
    updated_by    UUID REFERENCES users(id),
    deleted_at    TIMESTAMPTZ,
    deleted_by    UUID REFERENCES users(id),
    CONSTRAINT chk_categories_default_no_owner CHECK (is_default = false OR user_id IS NULL)
);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- bank_accounts: sin saldo almacenado, se calcula desde movements ---
CREATE TABLE bank_accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id),
    bank_name        VARCHAR(100) NOT NULL,
    account_alias    VARCHAR(100),
    account_type     account_type NOT NULL,
    currency_code    CHAR(3) NOT NULL REFERENCES currency(code),
    last_synced_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id),
    deleted_at       TIMESTAMPTZ,
    deleted_by       UUID REFERENCES users(id)
);
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- movements: una sola tabla, columna type distingue ingreso/egreso ---
CREATE TABLE movements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    bank_account_id   UUID REFERENCES bank_accounts(id),
    category_id       UUID NOT NULL REFERENCES categories(id),
    type              movement_type NOT NULL,
    amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency_code     CHAR(3) NOT NULL REFERENCES currency(code),
    date              DATE NOT NULL,
    payment_method    payment_method NOT NULL,
    source            movement_source NOT NULL,
    description       VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    updated_by        UUID REFERENCES users(id),
    deleted_at        TIMESTAMPTZ,
    deleted_by        UUID REFERENCES users(id)
);
CREATE TRIGGER trg_movements_updated_at BEFORE UPDATE ON movements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- goals: objetivo de ahorro; progreso y cuota se CALCULAN, no se guardan ---
CREATE TABLE goals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id),
    category_id    UUID NOT NULL REFERENCES categories(id),
    name           VARCHAR(100) NOT NULL,
    reason         goal_reason NOT NULL,
    reason_other   VARCHAR(255),
    target_amount  NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
    currency_code  CHAR(3) NOT NULL REFERENCES currency(code),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    status         goal_status NOT NULL DEFAULT 'Active',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID REFERENCES users(id),
    updated_by     UUID REFERENCES users(id),
    deleted_at     TIMESTAMPTZ,
    deleted_by     UUID REFERENCES users(id),
    CONSTRAINT chk_goals_dates CHECK (end_date >= start_date)
);
CREATE UNIQUE INDEX uq_goals_active_category ON goals (user_id, category_id)
    WHERE deleted_at IS NULL AND status IN ('Active', 'Overdue');
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- email_connections: conexion OAuth de solo lectura al correo ---
CREATE TABLE email_connections (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(id),
    provider                 email_provider NOT NULL,
    email_address            VARCHAR(255) NOT NULL,
    access_token_encrypted   TEXT NOT NULL,
    refresh_token_encrypted  TEXT NOT NULL,
    scope                    VARCHAR(255) NOT NULL,
    is_active                BOOLEAN NOT NULL DEFAULT true,
    last_synced_at           TIMESTAMPTZ,
    connected_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by               UUID REFERENCES users(id),
    updated_by               UUID REFERENCES users(id),
    deleted_at               TIMESTAMPTZ,
    deleted_by               UUID REFERENCES users(id)
);
CREATE UNIQUE INDEX uq_email_connections_user_email ON email_connections (user_id, email_address)
    WHERE deleted_at IS NULL;
CREATE TRIGGER trg_email_connections_updated_at BEFORE UPDATE ON email_connections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- parsed_emails: registro inmutable, deduplicacion ---
CREATE TABLE parsed_emails (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_connection_id    UUID NOT NULL REFERENCES email_connections(id),
    external_message_id    VARCHAR(255) NOT NULL,
    sender_address         VARCHAR(255) NOT NULL,
    subject                VARCHAR(500),
    received_at            TIMESTAMPTZ NOT NULL,
    parse_status           parse_status NOT NULL DEFAULT 'Pending',
    movement_id            UUID REFERENCES movements(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_parsed_emails_connection_message UNIQUE (email_connection_id, external_message_id)
);

-- --- financial_profile: una fila por usuario, se sobreescribe ---
CREATE TABLE financial_profile (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                      UUID NOT NULL UNIQUE REFERENCES users(id),
    monthly_income               NUMERIC(14,2),
    fixed_expenses               NUMERIC(14,2),
    ant_expense_percentage       NUMERIC(5,2),
    makes_unnecessary_purchases  BOOLEAN,
    has_debts                    BOOLEAN,
    debt_amount                  NUMERIC(14,2),
    app_usefulness_rating        SMALLINT CHECK (app_usefulness_rating BETWEEN 1 AND 10),
    currently_saves              BOOLEAN,
    proposed_savings_amount      NUMERIC(14,2),
    has_financial_knowledge      BOOLEAN,
    can_detect_ant_expenses      BOOLEAN,
    primary_payment_method       payment_method,
    additional_answers           JSONB DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_financial_profile_updated_at BEFORE UPDATE ON financial_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- content_categories: temas del contenido educativo ---
CREATE TABLE content_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    description   VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID REFERENCES users(id),
    updated_by    UUID REFERENCES users(id),
    deleted_at    TIMESTAMPTZ,
    deleted_by    UUID REFERENCES users(id)
);
CREATE TRIGGER trg_content_categories_updated_at BEFORE UPDATE ON content_categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- educational_content ---
CREATE TABLE educational_content (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_category_id   UUID NOT NULL REFERENCES content_categories(id),
    title                 VARCHAR(150) NOT NULL,
    type                  content_type NOT NULL,
    body                  TEXT,
    media_url             VARCHAR(500),
    duration_minutes      SMALLINT,
    status                content_status NOT NULL DEFAULT 'Draft',
    published_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            UUID REFERENCES users(id),
    updated_by            UUID REFERENCES users(id),
    deleted_at            TIMESTAMPTZ,
    deleted_by            UUID REFERENCES users(id),
    CONSTRAINT chk_content_published CHECK (status <> 'Published' OR published_at IS NOT NULL)
);
CREATE TRIGGER trg_educational_content_updated_at BEFORE UPDATE ON educational_content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- user_content_interactions: favoritos, leidos, rechazados ---
CREATE TABLE user_content_interactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id),
    content_id     UUID NOT NULL REFERENCES educational_content(id),
    is_favorite    BOOLEAN NOT NULL DEFAULT false,
    is_read        BOOLEAN NOT NULL DEFAULT false,
    read_at        TIMESTAMPTZ,
    is_rejected    BOOLEAN NOT NULL DEFAULT false,
    rejected_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID REFERENCES users(id),
    updated_by     UUID REFERENCES users(id),
    deleted_at     TIMESTAMPTZ,
    deleted_by     UUID REFERENCES users(id)
);
CREATE UNIQUE INDEX uq_user_content_interactions ON user_content_interactions (user_id, content_id)
    WHERE deleted_at IS NULL;
CREATE TRIGGER trg_user_content_interactions_updated_at BEFORE UPDATE ON user_content_interactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- --- notifications: FK especifica segun el tipo ---
CREATE TABLE notifications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id),
    type           notification_type NOT NULL,
    title          VARCHAR(150) NOT NULL,
    message        TEXT NOT NULL,
    is_read        BOOLEAN NOT NULL DEFAULT false,
    goal_id        UUID REFERENCES goals(id),
    movement_id    UUID REFERENCES movements(id),
    category_id    UUID REFERENCES categories(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID REFERENCES users(id),
    updated_by     UUID REFERENCES users(id),
    deleted_at     TIMESTAMPTZ,
    deleted_by     UUID REFERENCES users(id),
    CONSTRAINT chk_notification_entity CHECK (
        (type = 'AntExpenseAlert'      AND movement_id IS NOT NULL AND goal_id IS NULL AND category_id IS NULL) OR
        (type = 'GoalDeadlineReminder' AND goal_id IS NOT NULL AND movement_id IS NULL AND category_id IS NULL) OR
        (type = 'BudgetExceeded'       AND category_id IS NOT NULL AND movement_id IS NULL AND goal_id IS NULL) OR
        (type = 'System'               AND movement_id IS NULL AND goal_id IS NULL AND category_id IS NULL)
    )
);
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 4. INDICES SOBRE LLAVES FORANEAS
-- =====================================================================
CREATE INDEX idx_users_currency ON users (preferred_currency_code);

CREATE INDEX idx_categories_user ON categories (user_id);

CREATE INDEX idx_bank_accounts_user ON bank_accounts (user_id);
CREATE INDEX idx_bank_accounts_currency ON bank_accounts (currency_code);

CREATE INDEX idx_movements_user ON movements (user_id);
CREATE INDEX idx_movements_bank_account_active ON movements (bank_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_movements_category ON movements (category_id);
CREATE INDEX idx_movements_currency ON movements (currency_code);
CREATE INDEX idx_movements_date ON movements (date);

CREATE INDEX idx_goals_user ON goals (user_id);
CREATE INDEX idx_goals_category ON goals (category_id);
CREATE INDEX idx_goals_currency ON goals (currency_code);

CREATE INDEX idx_email_connections_user ON email_connections (user_id);

CREATE INDEX idx_parsed_emails_connection ON parsed_emails (email_connection_id);
CREATE INDEX idx_parsed_emails_movement ON parsed_emails (movement_id);

CREATE INDEX idx_educational_content_category ON educational_content (content_category_id);

CREATE INDEX idx_user_content_interactions_user ON user_content_interactions (user_id);
CREATE INDEX idx_user_content_interactions_content ON user_content_interactions (content_id);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_goal ON notifications (goal_id);
CREATE INDEX idx_notifications_movement ON notifications (movement_id);
CREATE INDEX idx_notifications_category ON notifications (category_id);

-- =====================================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================================

-- --- users: acceso propio (sin poder auto-eliminarse) + Admin lista y desactiva ---
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_self_insert ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_self_update ON users FOR UPDATE USING (auth.uid() = id);

-- Funcion SECURITY DEFINER: evalua el rol del usuario actual SALTANDOSE RLS.
-- Necesaria porque una politica de "users" que consulta "users" directamente
-- entra en recursion infinita (Postgres vuelve a aplicar la politica sobre
-- la subconsulta). Este es el patron recomendado por Supabase para este caso.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Admin' AND deleted_at IS NULL
    );
$$;

CREATE POLICY users_admin_select ON users FOR SELECT USING (is_admin());
CREATE POLICY users_admin_update ON users FOR UPDATE USING (is_admin());
-- Nota: no hay politica de DELETE para nadie (ni self ni Admin). El borrado real
-- de un usuario queda como proceso aparte, sin definir aun (ver conversacion de diseno).
-- "Admin elimina usuario" = soft delete = UPDATE users SET deleted_at = ... (cubierto por users_admin_update).

-- --- categories: propias + del sistema en lectura; solo propias en escritura ---
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_select ON categories FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY categories_insert ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY categories_update ON categories FOR UPDATE USING (user_id = auth.uid());

-- --- tablas de propiedad directa (user_id), control total del dueno ---
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_accounts_owner ON bank_accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY movements_owner ON movements FOR ALL USING (auth.uid() = user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_owner ON goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_connections_owner ON email_connections FOR ALL USING (auth.uid() = user_id);

ALTER TABLE financial_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_profile_owner ON financial_profile FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_content_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_content_interactions_owner ON user_content_interactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_owner ON notifications FOR ALL USING (auth.uid() = user_id);

-- --- parsed_emails: propiedad indirecta via email_connections ---
ALTER TABLE parsed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY parsed_emails_owner ON parsed_emails FOR ALL USING (
    EXISTS (SELECT 1 FROM email_connections ec WHERE ec.id = parsed_emails.email_connection_id AND ec.user_id = auth.uid())
);

-- --- catalogos globales: lectura para cualquier usuario autenticado, escritura solo con service_role ---
ALTER TABLE currency ENABLE ROW LEVEL SECURITY;
CREATE POLICY currency_read_all ON currency FOR SELECT USING (true);

ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_categories_read_all ON content_categories FOR SELECT USING (true);

ALTER TABLE educational_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY educational_content_read_all ON educational_content FOR SELECT USING (true);

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
