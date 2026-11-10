-- =========================================================================
-- MIGRATION SCRIPT: ADD STATUS COLUMN TO USERS TABLE
-- Hệ thống: LHU Media Studio (Đại học Lạc Hồng)
-- =========================================================================

IF COL_LENGTH('Users', 'status') IS NULL
BEGIN
    ALTER TABLE Users ADD [status] NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Status DEFAULT 'Active';
    PRINT 'Added column status to Users table';
END
ELSE
BEGIN
    PRINT 'Column status already exists in Users table';
END
GO

-- Đồng bộ dữ liệu hiện tại: is_active = 1 -> 'Active', is_active = 0 -> 'Locked'
UPDATE Users SET [status] = 'Active' WHERE is_active = 1 AND [status] IS NULL;
UPDATE Users SET [status] = 'Locked' WHERE is_active = 0 AND [status] = 'Active';
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Users_Status')
BEGIN
    ALTER TABLE Users ADD CONSTRAINT CK_Users_Status CHECK ([status] IN ('Active', 'Locked', 'Disabled'));
    PRINT 'Added check constraint CK_Users_Status';
END
GO

