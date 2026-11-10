-- ==============================================================
-- MIGRATION SCRIPT: PHASE 3 - DUTY SHIFTS, ATTENDANCE & PAYROLL
-- Hệ thống Quản lý Thiết bị và Đặt phòng Studio - LHU Media Studio
-- ==============================================================

USE [TN_Database];
GO

-- 1. Bổ sung các cột phục vụ thống kê công việc và chấm công vào bảng Tasks
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'execution_date')
BEGIN
    ALTER TABLE [Tasks] ADD [execution_date] DATE NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'actual_hours')
BEGIN
    ALTER TABLE [Tasks] ADD [actual_hours] DECIMAL(5, 2) NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'shift_session')
BEGIN
    ALTER TABLE [Tasks] ADD [shift_session] NVARCHAR(10) NULL; -- 'S', 'C', 'T'
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'note')
BEGIN
    ALTER TABLE [Tasks] ADD [note] NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'is_overtime')
BEGIN
    ALTER TABLE [Tasks] ADD [is_overtime] BIT NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'overtime_hours')
BEGIN
    ALTER TABLE [Tasks] ADD [overtime_hours] DECIMAL(4, 2) NOT NULL DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Tasks]') AND name = 'is_sunday')
BEGIN
    ALTER TABLE [Tasks] ADD [is_sunday] BIT NOT NULL DEFAULT 0;
END
GO

-- 2. Tạo bảng StudioShifts (Lịch trực Studio CTV)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StudioShifts')
BEGIN
    CREATE TABLE [StudioShifts] (
        [id] CHAR(36) NOT NULL PRIMARY KEY,
        [user_id] CHAR(36) NOT NULL,
        [date] DATE NOT NULL,
        [shift_type] NVARCHAR(20) NOT NULL, -- 'MORNING', 'AFTERNOON', 'EVENING'
        [start_time] NVARCHAR(10) NULL,     -- '07:30', '13:30', '17:30'
        [end_time] NVARCHAR(10) NULL,       -- '11:30', '17:30', '21:30'
        [hours] DECIMAL(4, 2) NOT NULL DEFAULT 4.00,
        [status] NVARCHAR(30) NOT NULL DEFAULT 'REGISTERED', -- 'REGISTERED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'
        [attendance_symbol] NVARCHAR(10) NOT NULL DEFAULT 'LV', -- 'LV', 'NL'
        [note] NVARCHAR(MAX) NULL,
        [confirmed_by_user_id] CHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_StudioShifts_User] FOREIGN KEY ([user_id]) REFERENCES [Users]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_StudioShifts_ConfirmedBy] FOREIGN KEY ([confirmed_by_user_id]) REFERENCES [Users]([id]) ON DELETE NO ACTION
    );

    CREATE INDEX [IX_StudioShifts_user_id] ON [StudioShifts] ([user_id]);
    CREATE INDEX [IX_StudioShifts_date] ON [StudioShifts] ([date]);
    CREATE INDEX [IX_StudioShifts_status] ON [StudioShifts] ([status]);
END
GO

-- 3. Tạo bảng AttendanceRecords (Bảng chấm công ma trận ngày x buổi)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceRecords')
BEGIN
    CREATE TABLE [AttendanceRecords] (
        [id] CHAR(36) NOT NULL PRIMARY KEY,
        [user_id] CHAR(36) NOT NULL,
        [date] DATE NOT NULL,
        [session] NVARCHAR(5) NOT NULL, -- 'S', 'C', 'T'
        [symbol] NVARCHAR(10) NOT NULL DEFAULT '', -- 'LV', 'SV', 'NL', ''
        [hours] DECIMAL(5, 2) NOT NULL DEFAULT 0,
        [source_type] NVARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'STUDIO_SHIFT', 'TASK', 'HOLIDAY', 'MANUAL'
        [source_id] CHAR(36) NULL,
        [month] INT NOT NULL,
        [year] INT NOT NULL,
        [note] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_AttendanceRecords_User] FOREIGN KEY ([user_id]) REFERENCES [Users]([id]) ON DELETE NO ACTION
    );

    CREATE INDEX [IX_AttendanceRecords_user_month_year] ON [AttendanceRecords] ([user_id], [month], [year]);
    CREATE INDEX [IX_AttendanceRecords_date] ON [AttendanceRecords] ([date]);
    CREATE INDEX [IX_AttendanceRecords_symbol] ON [AttendanceRecords] ([symbol]);
END
GO

-- 4. Tạo bảng MonthlyPayrolls (Bảng tổng hợp tiền công / thù lao CTV)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MonthlyPayrolls')
BEGIN
    CREATE TABLE [MonthlyPayrolls] (
        [id] CHAR(36) NOT NULL PRIMARY KEY,
        [user_id] CHAR(36) NOT NULL,
        [month] INT NOT NULL,
        [year] INT NOT NULL,
        [total_shift_count] INT NOT NULL DEFAULT 0,
        [shift_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [task_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [overtime_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [sunday_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [total_standard_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [total_calculated_hours] DECIMAL(6, 2) NOT NULL DEFAULT 0,
        [hourly_rate] DECIMAL(10, 2) NOT NULL DEFAULT 20000.00,
        [total_amount] DECIMAL(14, 2) NOT NULL DEFAULT 0,
        [status] NVARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'CONFIRMED', 'PAID'
        [note] NVARCHAR(MAX) NULL,
        [calculated_at] DATETIME2 NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_MonthlyPayrolls_User] FOREIGN KEY ([user_id]) REFERENCES [Users]([id]) ON DELETE NO ACTION
    );

    CREATE UNIQUE INDEX [IX_MonthlyPayrolls_user_month_year] ON [MonthlyPayrolls] ([user_id], [month], [year]);
    CREATE INDEX [IX_MonthlyPayrolls_month_year] ON [MonthlyPayrolls] ([month], [year]);
END
GO
