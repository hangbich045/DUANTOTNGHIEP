-- =========================================================================
-- MIGRATION SCRIPT: DUTY PERIODS, SHIFT REGISTRATIONS & NOTIFICATIONS
-- Hệ thống: LHU Media Studio (Đại học Lạc Hồng)
-- Giai đoạn 3 mở rộng: Quy trình đăng ký - sắp xếp ca trực 3 giai đoạn
-- =========================================================================

-- 1. Bảng DutyPeriods (Đợt đăng ký ca trực theo tháng)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DutyPeriods')
BEGIN
    CREATE TABLE DutyPeriods (
        id CHAR(36) PRIMARY KEY,
        [month] INT NOT NULL,
        [year] INT NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED, ARRANGING, CONFIRMED
        registration_deadline DATETIMEOFFSET NULL,
        note NVARCHAR(MAX) NULL,
        created_by_user_id CHAR(36) NOT NULL,
        confirmed_by_user_id CHAR(36) NULL,
        confirmed_at DATETIMEOFFSET NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_DutyPeriods_Creator FOREIGN KEY (created_by_user_id) REFERENCES Users(id),
        CONSTRAINT FK_DutyPeriods_Confirmer FOREIGN KEY (confirmed_by_user_id) REFERENCES Users(id),
        CONSTRAINT UQ_DutyPeriods_MonthYear UNIQUE ([month], [year])
    );
    PRINT 'Created table DutyPeriods';
END
ELSE
BEGIN
    PRINT 'Table DutyPeriods already exists';
END
GO

-- 2. Bảng ShiftRegistrations (Đăng ký thời gian có thể trực của CTV)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ShiftRegistrations')
BEGIN
    CREATE TABLE ShiftRegistrations (
        id CHAR(36) PRIMARY KEY,
        period_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        [date] DATE NOT NULL,
        [session] NVARCHAR(10) NOT NULL, -- 'S', 'C', 'T'
        note NVARCHAR(500) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_ShiftRegistrations_Period FOREIGN KEY (period_id) REFERENCES DutyPeriods(id) ON DELETE CASCADE,
        CONSTRAINT FK_ShiftRegistrations_User FOREIGN KEY (user_id) REFERENCES Users(id),
        CONSTRAINT UQ_ShiftRegistrations_Slot UNIQUE (period_id, user_id, [date], [session])
    );
    PRINT 'Created table ShiftRegistrations';
END
ELSE
BEGIN
    PRINT 'Table ShiftRegistrations already exists';
END
GO

-- 3. Bảng Notifications (Hệ thống thông báo in-app)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        [type] NVARCHAR(50) NOT NULL DEFAULT 'SYSTEM', -- 'DUTY_PERIOD_OPEN', 'DUTY_REGISTRATION_SUBMITTED', 'DUTY_SCHEDULE_CONFIRMED', 'SYSTEM'
        link NVARCHAR(255) NULL,
        is_read BIT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    );
    PRINT 'Created table Notifications';
END
ELSE
BEGIN
    PRINT 'Table Notifications already exists';
END
GO

-- 4. Bổ sung cột period_id vào bảng StudioShifts nếu chưa có
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('StudioShifts') AND name = 'period_id'
)
BEGIN
    ALTER TABLE StudioShifts ADD period_id CHAR(36) NULL;
    ALTER TABLE StudioShifts ADD CONSTRAINT FK_StudioShifts_Period FOREIGN KEY (period_id) REFERENCES DutyPeriods(id);
    PRINT 'Added column period_id to StudioShifts';
END
ELSE
BEGIN
    PRINT 'Column period_id already exists in StudioShifts';
END
GO

