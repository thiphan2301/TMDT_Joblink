-- =====================================================
-- JobLink - V1: Khoi tao schema database
-- Nguon thiet ke: DBML v3 (dbdiagram.io)
-- DB: MySQL 8.0+ (can ho tro CHECK constraint)
-- Charset: utf8mb4 (ho tro tieng Viet co dau)
--
-- Quy uoc trong file nay:
--  - Enum trong DBML  -> kieu ENUM cua MySQL
--  - now()           -> DEFAULT CURRENT_TIMESTAMP
--  - FK dang composition (bang con thuoc so huu cua bang cha)
--    dung ON DELETE CASCADE; FK toi entity doc lap giu
--    RESTRICT mac dinh de tranh xoa nham du lieu quan trong
--  - updated_at dung ON UPDATE CURRENT_TIMESTAMP
-- =====================================================

CREATE DATABASE IF NOT EXISTS joblink CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE joblink;

-- ================= 1. TAI KHOAN & HO SO =================

CREATE TABLE users (
                       id INT NOT NULL AUTO_INCREMENT,
                       email VARCHAR(255) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       role ENUM('candidate','employer','admin') NOT NULL,
                       status ENUM('active','locked') NOT NULL DEFAULT 'active',
                       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       PRIMARY KEY (id),
                       UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_profiles (
                                    user_id INT NOT NULL,
                                    full_name VARCHAR(255) NOT NULL,
                                    phone VARCHAR(20),
                                    dob DATE,
                                    address VARCHAR(500),
                                    avatar VARCHAR(500),
                                    summary TEXT,
                                    is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
                                    PRIMARY KEY (user_id),
                                    CONSTRAINT fk_candidate_profiles_user FOREIGN KEY (user_id)
                                        REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skills (
                        id INT NOT NULL AUTO_INCREMENT,
                        name VARCHAR(100) NOT NULL,
                        PRIMARY KEY (id),
                        UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cvs (
                     id INT NOT NULL AUTO_INCREMENT,
                     candidate_id INT NOT NULL,
                     file_url VARCHAR(500) NOT NULL,
                     file_name VARCHAR(255),
                     is_default BOOLEAN NOT NULL DEFAULT FALSE,
                     uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- MySQL khong ho tro partial unique index (UNIQUE ... WHERE ...),
    -- nen dung generated column de dam bao moi ung vien toi da 1 CV mac dinh:
    -- khi is_default = true  -> default_slot = candidate_id (bi unique chan trung)
    -- khi is_default = false -> default_slot = NULL (NULL khong bi unique chan)
    -- LUU Y: phai dung VIRTUAL, khong dung STORED - cot STORED di kem FOREIGN KEY
    -- se gay loi MySQL 1215 "Cannot add foreign key constraint".
                     default_slot INT GENERATED ALWAYS AS (CASE WHEN is_default THEN candidate_id END) VIRTUAL,
                     PRIMARY KEY (id),
                     UNIQUE KEY uq_cvs_id_candidate (id, candidate_id),
                     UNIQUE KEY uq_cvs_single_default (default_slot),
                     CONSTRAINT fk_cvs_candidate FOREIGN KEY (candidate_id)
                         REFERENCES candidate_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_skills (
                                  candidate_id INT NOT NULL,
                                  skill_id INT NOT NULL,
                                  level VARCHAR(50),
                                  years_exp DECIMAL(4,1),
                                  PRIMARY KEY (candidate_id, skill_id),
                                  CONSTRAINT fk_candidate_skills_candidate FOREIGN KEY (candidate_id)
                                      REFERENCES candidate_profiles (user_id) ON DELETE CASCADE,
                                  CONSTRAINT fk_candidate_skills_skill FOREIGN KEY (skill_id)
                                      REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE companies (
                           id INT NOT NULL AUTO_INCREMENT,
                           owner_id INT NOT NULL,
                           name VARCHAR(255) NOT NULL,
                           legal_name VARCHAR(255),
                           tax_code VARCHAR(14),
                           description TEXT,
                           logo VARCHAR(500),
                           website VARCHAR(255),
                           address VARCHAR(500),
                           latitude DECIMAL(10,7),
                           longitude DECIMAL(10,7),
                           industry VARCHAR(100),
                           size VARCHAR(50),
                           business_license_url VARCHAR(500),
                           verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
                           verified_at TIMESTAMP NULL DEFAULT NULL,
                           verified_by INT,
                           PRIMARY KEY (id),
                           UNIQUE KEY uq_companies_tax_code (tax_code),
                           CONSTRAINT fk_companies_owner FOREIGN KEY (owner_id)
                               REFERENCES users (id),
                           CONSTRAINT fk_companies_verified_by FOREIGN KEY (verified_by)
                               REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================= 2. TUYEN DUNG =================

CREATE TABLE jobs (
                      id INT NOT NULL AUTO_INCREMENT,
                      company_id INT NOT NULL,
                      title VARCHAR(255) NOT NULL,
                      description TEXT,
                      requirements TEXT,
                      salary_min DECIMAL(15,2),
                      salary_max DECIMAL(15,2),
                      salary_unit ENUM('hour','month','project') NOT NULL DEFAULT 'month',
                      location VARCHAR(255),
                      job_type VARCHAR(50),
                      level VARCHAR(50),
                      vacancies INT NOT NULL DEFAULT 1,
                      working_schedule VARCHAR(255),
                      deadline DATE,
                      status ENUM('draft','pending_review','open','closed','rejected','expired') NOT NULL DEFAULT 'draft',
                      is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
                      is_prioritized BOOLEAN NOT NULL DEFAULT FALSE,
                      reviewed_by INT,
                      reviewed_at TIMESTAMP NULL DEFAULT NULL,
                      rejection_reason TEXT,
                      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (id),
                      KEY idx_jobs_title (title),
                      KEY idx_jobs_location (location),
                      KEY idx_jobs_status (status),
                      CONSTRAINT fk_jobs_company FOREIGN KEY (company_id)
                          REFERENCES companies (id) ON DELETE CASCADE,
                      CONSTRAINT fk_jobs_reviewed_by FOREIGN KEY (reviewed_by)
                          REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_skills (
                            job_id INT NOT NULL,
                            skill_id INT NOT NULL,
                            PRIMARY KEY (job_id, skill_id),
                            CONSTRAINT fk_job_skills_job FOREIGN KEY (job_id)
                                REFERENCES jobs (id) ON DELETE CASCADE,
                            CONSTRAINT fk_job_skills_skill FOREIGN KEY (skill_id)
                                REFERENCES skills (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlists (
                           candidate_id INT NOT NULL,
                           job_id INT NOT NULL,
                           created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           PRIMARY KEY (candidate_id, job_id),
                           CONSTRAINT fk_wishlists_candidate FOREIGN KEY (candidate_id)
                               REFERENCES candidate_profiles (user_id) ON DELETE CASCADE,
                           CONSTRAINT fk_wishlists_job FOREIGN KEY (job_id)
                               REFERENCES jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
                              id INT NOT NULL AUTO_INCREMENT,
                              job_id INT NOT NULL,
                              candidate_id INT NOT NULL,
                              cv_id INT NOT NULL,
                              cover_letter TEXT,
                              status ENUM('pending','viewed','invited','rejected','hired') NOT NULL DEFAULT 'pending',
                              applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              PRIMARY KEY (id),
                              UNIQUE KEY uq_applications_job_candidate (job_id, candidate_id),
                              KEY idx_applications_candidate (candidate_id),
                              CONSTRAINT fk_applications_job FOREIGN KEY (job_id)
                                  REFERENCES jobs (id) ON DELETE CASCADE,
                              CONSTRAINT fk_applications_candidate FOREIGN KEY (candidate_id)
                                  REFERENCES candidate_profiles (user_id) ON DELETE CASCADE,
    -- FK ghep dam bao CV nop thuoc dung ung vien
                              CONSTRAINT fk_applications_cv FOREIGN KEY (cv_id, candidate_id)
                                  REFERENCES cvs (id, candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE application_status_history (
                                            id INT NOT NULL AUTO_INCREMENT,
                                            application_id INT NOT NULL,
                                            from_status ENUM('pending','viewed','invited','rejected','hired'),
                                            to_status ENUM('pending','viewed','invited','rejected','hired') NOT NULL,
                                            changed_by INT NOT NULL,
                                            changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                            note TEXT,
                                            PRIMARY KEY (id),
                                            KEY idx_app_history_application (application_id),
                                            CONSTRAINT fk_app_history_application FOREIGN KEY (application_id)
                                                REFERENCES applications (id) ON DELETE CASCADE,
                                            CONSTRAINT fk_app_history_changed_by FOREIGN KEY (changed_by)
                                                REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE interview_invitations (
                                       id INT NOT NULL AUTO_INCREMENT,
                                       application_id INT NOT NULL,
                                       scheduled_at TIMESTAMP NULL DEFAULT NULL,
                                       location VARCHAR(500),
                                       notes TEXT,
                                       status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
                                       PRIMARY KEY (id),
                                       KEY idx_interview_application (application_id),
                                       CONSTRAINT fk_interview_application FOREIGN KEY (application_id)
                                           REFERENCES applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================= 3. DANH GIA DOANH NGHIEP =================

CREATE TABLE company_reviews (
                                 id INT NOT NULL AUTO_INCREMENT,
                                 company_id INT NOT NULL,
                                 candidate_id INT NOT NULL,
                                 rating SMALLINT NOT NULL,
                                 content TEXT,
                                 status ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 PRIMARY KEY (id),
                                 KEY idx_reviews_company (company_id),
                                 CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
                                 CONSTRAINT fk_reviews_company FOREIGN KEY (company_id)
                                     REFERENCES companies (id) ON DELETE CASCADE,
                                 CONSTRAINT fk_reviews_candidate FOREIGN KEY (candidate_id)
                                     REFERENCES candidate_profiles (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE review_replies (
                                id INT NOT NULL AUTO_INCREMENT,
                                review_id INT NOT NULL,
                                employer_id INT NOT NULL,
                                content TEXT NOT NULL,
                                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (id),
                                UNIQUE KEY uq_review_replies_review (review_id),
                                CONSTRAINT fk_review_replies_review FOREIGN KEY (review_id)
                                    REFERENCES company_reviews (id) ON DELETE CASCADE,
                                CONSTRAINT fk_review_replies_employer FOREIGN KEY (employer_id)
                                    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================= 4. CHAT =================

CREATE TABLE conversations (
                               id INT NOT NULL AUTO_INCREMENT,
                               candidate_id INT NOT NULL,
                               employer_id INT NOT NULL,
                               job_id INT,
                               created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               PRIMARY KEY (id),
                               UNIQUE KEY uq_conversations_pair (candidate_id, employer_id),
                               CONSTRAINT fk_conversations_candidate FOREIGN KEY (candidate_id)
                                   REFERENCES candidate_profiles (user_id) ON DELETE CASCADE,
                               CONSTRAINT fk_conversations_employer FOREIGN KEY (employer_id)
                                   REFERENCES users (id) ON DELETE CASCADE,
                               CONSTRAINT fk_conversations_job FOREIGN KEY (job_id)
                                   REFERENCES jobs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
                          id INT NOT NULL AUTO_INCREMENT,
                          conversation_id INT NOT NULL,
                          sender_id INT NOT NULL,
                          content TEXT NOT NULL,
                          is_read BOOLEAN NOT NULL DEFAULT FALSE,
                          sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          PRIMARY KEY (id),
                          KEY idx_messages_conversation_sent (conversation_id, sent_at),
                          CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
                              REFERENCES conversations (id) ON DELETE CASCADE,
                          CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id)
                              REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chatbot_sessions (
                                  id INT NOT NULL AUTO_INCREMENT,
                                  user_id INT NOT NULL,
                                  title VARCHAR(255),
                                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  PRIMARY KEY (id),
                                  KEY idx_chatbot_sessions_user (user_id),
                                  CONSTRAINT fk_chatbot_sessions_user FOREIGN KEY (user_id)
                                      REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chatbot_messages (
                                  id INT NOT NULL AUTO_INCREMENT,
                                  session_id INT NOT NULL,
                                  role ENUM('user','bot') NOT NULL,
                                  content TEXT NOT NULL,
                                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  PRIMARY KEY (id),
                                  KEY idx_chatbot_messages_session (session_id),
                                  CONSTRAINT fk_chatbot_messages_session FOREIGN KEY (session_id)
                                      REFERENCES chatbot_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================= 5. GOI, KHUYEN MAI, DON HANG, THANH TOAN =================

CREATE TABLE packages (
                          id INT NOT NULL AUTO_INCREMENT,
                          name VARCHAR(100) NOT NULL,
                          price DECIMAL(15,2) NOT NULL,
                          duration_days INT NOT NULL,
                          job_post_limit INT,
                          cv_view_limit INT,
                          included_tokens INT NOT NULL DEFAULT 0,
                          can_highlight_jobs BOOLEAN NOT NULL DEFAULT FALSE,
                          can_prioritize_jobs BOOLEAN NOT NULL DEFAULT FALSE,
                          can_search_candidates BOOLEAN NOT NULL DEFAULT FALSE,
                          can_direct_contact BOOLEAN NOT NULL DEFAULT FALSE,
                          is_active BOOLEAN NOT NULL DEFAULT TRUE,
                          PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE token_packages (
                                id INT NOT NULL AUTO_INCREMENT,
                                tokens INT NOT NULL,
                                price DECIMAL(15,2) NOT NULL,
                                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promotions (
                            id INT NOT NULL AUTO_INCREMENT,
                            code VARCHAR(50) NOT NULL,
                            discount_type ENUM('percent','fixed_amount') NOT NULL,
                            discount_value DECIMAL(15,2) NOT NULL,
                            min_order_amount DECIMAL(15,2),
                            max_discount_amount DECIMAL(15,2),
                            start_at TIMESTAMP NULL DEFAULT NULL,
                            end_at TIMESTAMP NULL DEFAULT NULL,
                            usage_limit INT,
                            per_user_limit INT,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            PRIMARY KEY (id),
                            UNIQUE KEY uq_promotions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
                        id INT NOT NULL AUTO_INCREMENT,
                        order_code VARCHAR(50) NOT NULL,
                        user_id INT NOT NULL,
                        order_type ENUM('subscription','token') NOT NULL,
                        package_id INT,
                        token_package_id INT,
                        subtotal DECIMAL(15,2) NOT NULL,
                        discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                        total_amount DECIMAL(15,2) NOT NULL,
                        promotion_id INT,
                        product_snapshot JSON NOT NULL,
                        status ENUM('pending','paid','fulfilled','cancelled','failed','refunded') NOT NULL DEFAULT 'pending',
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        paid_at TIMESTAMP NULL DEFAULT NULL,
                        fulfilled_at TIMESTAMP NULL DEFAULT NULL,
                        PRIMARY KEY (id),
                        UNIQUE KEY uq_orders_code (order_code),
                        KEY idx_orders_user (user_id),
                        CONSTRAINT chk_order_product_type CHECK (
                            (order_type = 'subscription' AND package_id IS NOT NULL AND token_package_id IS NULL)
                                OR
                            (order_type = 'token' AND token_package_id IS NOT NULL AND package_id IS NULL)
                            ),
                        CONSTRAINT chk_order_amounts CHECK (
                            subtotal >= 0 AND discount_amount >= 0 AND discount_amount <= subtotal
                            ),
                        CONSTRAINT chk_order_total CHECK (total_amount = subtotal - discount_amount),
                        CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
                            REFERENCES users (id),
                        CONSTRAINT fk_orders_package FOREIGN KEY (package_id)
                            REFERENCES packages (id),
                        CONSTRAINT fk_orders_token_package FOREIGN KEY (token_package_id)
                            REFERENCES token_packages (id),
                        CONSTRAINT fk_orders_promotion FOREIGN KEY (promotion_id)
                            REFERENCES promotions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promotion_usages (
                                  id INT NOT NULL AUTO_INCREMENT,
                                  promotion_id INT NOT NULL,
                                  user_id INT NOT NULL,
                                  order_id INT NOT NULL,
                                  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  PRIMARY KEY (id),
                                  UNIQUE KEY uq_promotion_usages_order (order_id),
                                  KEY idx_promotion_usages_promotion (promotion_id),
                                  CONSTRAINT fk_promotion_usages_promotion FOREIGN KEY (promotion_id)
                                      REFERENCES promotions (id) ON DELETE CASCADE,
                                  CONSTRAINT fk_promotion_usages_user FOREIGN KEY (user_id)
                                      REFERENCES users (id),
                                  CONSTRAINT fk_promotion_usages_order FOREIGN KEY (order_id)
                                      REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
                          id INT NOT NULL AUTO_INCREMENT,
                          order_id INT NOT NULL,
                          amount DECIMAL(15,2) NOT NULL,
                          gateway VARCHAR(50),
                          transaction_code VARCHAR(100),
                          status ENUM('pending','success','failed','refunded') NOT NULL DEFAULT 'pending',
                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          paid_at TIMESTAMP NULL DEFAULT NULL,
                          PRIMARY KEY (id),
                          UNIQUE KEY uq_payments_gateway_txn (gateway, transaction_code),
                          KEY idx_payments_order (order_id),
                          CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
                              REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscriptions (
                               id INT NOT NULL AUTO_INCREMENT,
                               employer_id INT NOT NULL,
                               package_id INT NOT NULL,
                               order_id INT NOT NULL,
                               start_at TIMESTAMP NOT NULL,
                               end_at TIMESTAMP NOT NULL,
                               status ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
                               cancelled_at TIMESTAMP NULL DEFAULT NULL,
                               PRIMARY KEY (id),
                               UNIQUE KEY uq_subscriptions_order (order_id),
                               KEY idx_subscriptions_employer (employer_id),
                               CONSTRAINT fk_subscriptions_employer FOREIGN KEY (employer_id)
                                   REFERENCES users (id),
                               CONSTRAINT fk_subscriptions_package FOREIGN KEY (package_id)
                                   REFERENCES packages (id),
                               CONSTRAINT fk_subscriptions_order FOREIGN KEY (order_id)
                                   REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_profile_views (
                                         id INT NOT NULL AUTO_INCREMENT,
                                         subscription_id INT NOT NULL,
                                         candidate_id INT NOT NULL,
                                         viewed_by INT NOT NULL,
                                         viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         PRIMARY KEY (id),
                                         UNIQUE KEY uq_profile_views_sub_candidate (subscription_id, candidate_id),
                                         CONSTRAINT fk_profile_views_subscription FOREIGN KEY (subscription_id)
                                             REFERENCES subscriptions (id) ON DELETE CASCADE,
                                         CONSTRAINT fk_profile_views_candidate FOREIGN KEY (candidate_id)
                                             REFERENCES candidate_profiles (user_id) ON DELETE CASCADE,
                                         CONSTRAINT fk_profile_views_viewed_by FOREIGN KEY (viewed_by)
                                             REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================= 6. TOKEN =================

CREATE TABLE token_wallets (
                               user_id INT NOT NULL,
                               balance INT NOT NULL DEFAULT 0,
                               PRIMARY KEY (user_id),
                               CONSTRAINT chk_wallet_balance CHECK (balance >= 0),
                               CONSTRAINT fk_token_wallets_user FOREIGN KEY (user_id)
                                   REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE token_transactions (
                                    id INT NOT NULL AUTO_INCREMENT,
                                    wallet_id INT NOT NULL,
                                    type ENUM('welcome','purchase','spend','refund','adjustment') NOT NULL,
                                    amount INT NOT NULL,
                                    balance_after INT NOT NULL,
                                    idempotency_key VARCHAR(100) NOT NULL,
                                    order_id INT,
                                    ref_type VARCHAR(50),
                                    ref_id INT,
                                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    PRIMARY KEY (id),
                                    UNIQUE KEY uq_token_txn_idempotency (idempotency_key),
                                    KEY idx_token_txn_wallet (wallet_id),
                                    CONSTRAINT fk_token_txn_wallet FOREIGN KEY (wallet_id)
                                        REFERENCES token_wallets (user_id) ON DELETE CASCADE,
                                    CONSTRAINT fk_token_txn_order FOREIGN KEY (order_id)
                                        REFERENCES orders (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
