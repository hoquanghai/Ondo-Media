import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711000000000 implements MigrationInterface {
  name = 'InitialSchema1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // permissions
    // ========================================
    await queryRunner.query(`
      CREATE TABLE permissions (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        name                NVARCHAR(100)       NOT NULL,
        description         NVARCHAR(500)       NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_permissions PRIMARY KEY (id),
        CONSTRAINT UQ_permissions_name UNIQUE (name)
      )
    `);

    // ========================================
    // user_permissions
    // ========================================
    await queryRunner.query(`
      CREATE TABLE user_permissions (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        permission_id       UNIQUEIDENTIFIER    NOT NULL,
        granted_by          INT                 NOT NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_user_permissions PRIMARY KEY (id),
        CONSTRAINT FK_user_permissions_permissions FOREIGN KEY (permission_id) REFERENCES permissions(id),
        CONSTRAINT UQ_user_permissions_user_permission UNIQUE (user_id, permission_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_user_permissions_user_id ON user_permissions (user_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_user_permissions_permission_id ON user_permissions (permission_id) WHERE is_deleted = 0`);

    // ========================================
    // posts
    // ========================================
    await queryRunner.query(`
      CREATE TABLE posts (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        title               NVARCHAR(200)       NULL,
        content             NVARCHAR(MAX)       NOT NULL,
        post_date           DATE                NOT NULL,
        like_count          INT                 NOT NULL DEFAULT 0,
        comment_count       INT                 NOT NULL DEFAULT 0,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_posts PRIMARY KEY (id),
        CONSTRAINT CK_posts_like_count CHECK (like_count >= 0),
        CONSTRAINT CK_posts_comment_count CHECK (comment_count >= 0)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_posts_user_id ON posts (user_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_posts_post_date ON posts (post_date DESC) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_posts_user_id_post_date ON posts (user_id, post_date) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_posts_created_at ON posts (created_at DESC) WHERE is_deleted = 0`);

    // ========================================
    // post_files
    // ========================================
    await queryRunner.query(`
      CREATE TABLE post_files (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        post_id             UNIQUEIDENTIFIER    NOT NULL,
        file_name           NVARCHAR(255)       NOT NULL,
        storage_key         NVARCHAR(500)       NOT NULL,
        file_size           BIGINT              NOT NULL,
        mime_type           NVARCHAR(100)       NOT NULL,
        file_type           NVARCHAR(20)        NOT NULL,
        sort_order          INT                 NOT NULL DEFAULT 0,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_post_files PRIMARY KEY (id),
        CONSTRAINT FK_post_files_posts FOREIGN KEY (post_id) REFERENCES posts(id),
        CONSTRAINT CK_post_files_file_type CHECK (file_type IN (N'image', N'video', N'document')),
        CONSTRAINT CK_post_files_file_size CHECK (file_size > 0)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_post_files_post_id ON post_files (post_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_post_files_file_type ON post_files (file_type) WHERE is_deleted = 0`);

    // ========================================
    // likes
    // ========================================
    await queryRunner.query(`
      CREATE TABLE likes (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        post_id             UNIQUEIDENTIFIER    NOT NULL,
        user_id             INT                 NOT NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_likes PRIMARY KEY (id),
        CONSTRAINT FK_likes_posts FOREIGN KEY (post_id) REFERENCES posts(id),
        CONSTRAINT UQ_likes_post_user UNIQUE (post_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_likes_post_id ON likes (post_id)`);
    await queryRunner.query(`CREATE INDEX IX_likes_user_id ON likes (user_id)`);

    // ========================================
    // comments
    // ========================================
    await queryRunner.query(`
      CREATE TABLE comments (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        post_id             UNIQUEIDENTIFIER    NOT NULL,
        user_id             INT                 NOT NULL,
        content             NVARCHAR(MAX)       NOT NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_comments PRIMARY KEY (id),
        CONSTRAINT FK_comments_posts FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_comments_post_id ON comments (post_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_comments_user_id ON comments (user_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_comments_created_at ON comments (created_at DESC) WHERE is_deleted = 0`);

    // ========================================
    // announcements
    // ========================================
    await queryRunner.query(`
      CREATE TABLE announcements (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        title               NVARCHAR(200)       NOT NULL,
        content             NVARCHAR(MAX)       NOT NULL,
        is_pinned           BIT                 NOT NULL DEFAULT 0,
        publish_at          DATETIME2(7)        NULL,
        expires_at          DATETIME2(7)        NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_announcements PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_announcements_publish_at ON announcements (publish_at DESC) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_announcements_is_pinned ON announcements (is_pinned) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_announcements_user_id ON announcements (user_id) WHERE is_deleted = 0`);

    // ========================================
    // announcement_read_status
    // ========================================
    await queryRunner.query(`
      CREATE TABLE announcement_read_status (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        announcement_id     UNIQUEIDENTIFIER    NOT NULL,
        user_id             INT                 NOT NULL,
        read_at             DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_announcement_read_status PRIMARY KEY (id),
        CONSTRAINT FK_announcement_read_status_announcements FOREIGN KEY (announcement_id) REFERENCES announcements(id),
        CONSTRAINT UQ_announcement_read_status_announcement_user UNIQUE (announcement_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_announcement_read_status_announcement_id ON announcement_read_status (announcement_id)`);
    await queryRunner.query(`CREATE INDEX IX_announcement_read_status_user_id ON announcement_read_status (user_id)`);

    // ========================================
    // surveys
    // ========================================
    await queryRunner.query(`
      CREATE TABLE surveys (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        title               NVARCHAR(200)       NOT NULL,
        description         NVARCHAR(MAX)       NULL,
        is_anonymous        BIT                 NOT NULL DEFAULT 0,
        is_active           BIT                 NOT NULL DEFAULT 1,
        starts_at           DATETIME2(7)        NOT NULL,
        ends_at             DATETIME2(7)        NOT NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_surveys PRIMARY KEY (id),
        CONSTRAINT CK_surveys_dates CHECK (ends_at > starts_at)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_surveys_user_id ON surveys (user_id) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_surveys_is_active ON surveys (is_active) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_surveys_ends_at ON surveys (ends_at) WHERE is_deleted = 0`);

    // ========================================
    // survey_questions
    // ========================================
    await queryRunner.query(`
      CREATE TABLE survey_questions (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        survey_id           UNIQUEIDENTIFIER    NOT NULL,
        question_text       NVARCHAR(500)       NOT NULL,
        question_type       NVARCHAR(20)        NOT NULL,
        options             NVARCHAR(MAX)       NULL,
        is_required         BIT                 NOT NULL DEFAULT 1,
        sort_order          INT                 NOT NULL DEFAULT 0,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_survey_questions PRIMARY KEY (id),
        CONSTRAINT FK_survey_questions_surveys FOREIGN KEY (survey_id) REFERENCES surveys(id),
        CONSTRAINT CK_survey_questions_question_type CHECK (question_type IN (N'multiple_choice', N'text', N'rating'))
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_survey_questions_survey_id ON survey_questions (survey_id) WHERE is_deleted = 0`);

    // ========================================
    // survey_responses
    // ========================================
    await queryRunner.query(`
      CREATE TABLE survey_responses (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        survey_id           UNIQUEIDENTIFIER    NOT NULL,
        question_id         UNIQUEIDENTIFIER    NOT NULL,
        user_id             INT                 NOT NULL,
        answer              NVARCHAR(MAX)       NOT NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_survey_responses PRIMARY KEY (id),
        CONSTRAINT FK_survey_responses_surveys FOREIGN KEY (survey_id) REFERENCES surveys(id),
        CONSTRAINT FK_survey_responses_questions FOREIGN KEY (question_id) REFERENCES survey_questions(id),
        CONSTRAINT UQ_survey_responses_question_user UNIQUE (question_id, user_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_survey_responses_survey_id ON survey_responses (survey_id)`);
    await queryRunner.query(`CREATE INDEX IX_survey_responses_question_id ON survey_responses (question_id)`);
    await queryRunner.query(`CREATE INDEX IX_survey_responses_user_id ON survey_responses (user_id)`);

    // ========================================
    // notifications
    // ========================================
    await queryRunner.query(`
      CREATE TABLE notifications (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        type                NVARCHAR(30)        NOT NULL,
        title               NVARCHAR(200)       NOT NULL,
        message             NVARCHAR(500)       NOT NULL,
        reference_type      NVARCHAR(30)        NULL,
        reference_id        UNIQUEIDENTIFIER    NULL,
        actor_id            INT                 NULL,
        is_read             BIT                 NOT NULL DEFAULT 0,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_notifications PRIMARY KEY (id),
        CONSTRAINT CK_notifications_type CHECK (type IN (
            N'like', N'comment', N'announcement', N'survey', N'survey_reminder', N'system'
        )),
        CONSTRAINT CK_notifications_reference_type CHECK (reference_type IS NULL OR reference_type IN (
            N'post', N'comment', N'announcement', N'survey'
        ))
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_notifications_user_id_is_read ON notifications (user_id, is_read) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_notifications_user_id_created_at ON notifications (user_id, created_at DESC) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_notifications_type ON notifications (type) WHERE is_deleted = 0`);
    await queryRunner.query(`CREATE INDEX IX_notifications_reference ON notifications (reference_type, reference_id) WHERE is_deleted = 0`);

    // ========================================
    // push_subscriptions
    // ========================================
    await queryRunner.query(`
      CREATE TABLE push_subscriptions (
        id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
        user_id             INT                 NOT NULL,
        endpoint            NVARCHAR(500)       NOT NULL,
        p256dh              NVARCHAR(255)       NOT NULL,
        auth                NVARCHAR(255)       NOT NULL,
        user_agent          NVARCHAR(500)       NULL,
        created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
        created_by          INT                 NULL,
        is_deleted          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_push_subscriptions PRIMARY KEY (id),
        CONSTRAINT UQ_push_subscriptions_endpoint UNIQUE (endpoint)
      )
    `);

    await queryRunner.query(`CREATE INDEX IX_push_subscriptions_user_id ON push_subscriptions (user_id) WHERE is_deleted = 0`);

    // ========================================
    // Triggers: updated_at auto-update
    // ========================================
    const tables = [
      'permissions', 'user_permissions', 'posts', 'post_files',
      'likes', 'comments', 'announcements', 'announcement_read_status',
      'surveys', 'survey_questions', 'survey_responses',
      'notifications', 'push_subscriptions',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        CREATE TRIGGER TR_${table}_updated_at
        ON ${table}
        AFTER UPDATE
        AS
        BEGIN
          SET NOCOUNT ON;
          UPDATE ${table}
          SET updated_at = SYSUTCDATETIME()
          FROM ${table} t
          INNER JOIN inserted i ON t.id = i.id;
        END
      `);
    }

    // ========================================
    // Triggers: like_count / comment_count
    // ========================================
    await queryRunner.query(`
      CREATE TRIGGER TR_likes_insert_update_count
      ON likes
      AFTER INSERT
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE posts
        SET like_count = (
          SELECT COUNT(*) FROM likes WHERE post_id = i.post_id
        )
        FROM posts p
        INNER JOIN inserted i ON p.id = i.post_id;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER TR_likes_delete_update_count
      ON likes
      AFTER DELETE
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE posts
        SET like_count = (
          SELECT COUNT(*) FROM likes WHERE post_id = d.post_id
        )
        FROM posts p
        INNER JOIN deleted d ON p.id = d.post_id;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER TR_comments_insert_update_count
      ON comments
      AFTER INSERT
      AS
      BEGIN
        SET NOCOUNT ON;
        UPDATE posts
        SET comment_count = (
          SELECT COUNT(*) FROM comments WHERE post_id = i.post_id AND is_deleted = 0
        )
        FROM posts p
        INNER JOIN inserted i ON p.id = i.post_id;
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER TR_comments_update_update_count
      ON comments
      AFTER UPDATE
      AS
      BEGIN
        SET NOCOUNT ON;
        IF UPDATE(is_deleted)
        BEGIN
          UPDATE posts
          SET comment_count = (
            SELECT COUNT(*) FROM comments WHERE post_id = i.post_id AND is_deleted = 0
          )
          FROM posts p
          INNER JOIN inserted i ON p.id = i.post_id;
        END
      END
    `);

    // ========================================
    // Seed: permissions
    // ========================================
    await queryRunner.query(`
      INSERT INTO permissions (name, description) VALUES
        (N'admin', N'システム管理者（全権限）'),
        (N'manage_users', N'ユーザー管理'),
        (N'manage_announcements', N'お知らせ管理'),
        (N'manage_surveys', N'アンケート管理'),
        (N'view_admin_dashboard', N'管理者ダッシュボード閲覧')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers first
    const tables = [
      'push_subscriptions', 'notifications', 'survey_responses',
      'survey_questions', 'surveys', 'announcement_read_status',
      'announcements', 'comments', 'likes', 'post_files', 'posts',
      'user_permissions', 'permissions',
    ];

    // Drop count triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS TR_comments_update_update_count`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS TR_comments_insert_update_count`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS TR_likes_delete_update_count`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS TR_likes_insert_update_count`);

    // Drop updated_at triggers
    for (const table of tables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS TR_${table}_updated_at`);
    }

    // Drop tables in reverse order
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
