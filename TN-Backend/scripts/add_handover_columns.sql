-- =========================================================================
-- MIGRATION SCRIPT: Bổ sung các cột bàn giao và kiểm tra tình trạng máy (Task 1.4)
-- Database: TN_Database
-- Bảng: dbo.BorrowRequests
-- Các cột:
--   - handed_over_at: Thời điểm bàn giao thiết bị thực tế
--   - handover_condition: Ghi nhận tình trạng thiết bị khi bàn giao
--   - return_condition: Ghi nhận tình trạng thiết bị khi nhận trả
--   - admin_note: Ghi chú của quản trị viên
-- =========================================================================

BEGIN TRANSACTION;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BorrowRequests]') AND name = 'handed_over_at')
BEGIN
    ALTER TABLE [dbo].[BorrowRequests] ADD [handed_over_at] DATETIMEOFFSET NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BorrowRequests]') AND name = 'handover_condition')
BEGIN
    ALTER TABLE [dbo].[BorrowRequests] ADD [handover_condition] NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BorrowRequests]') AND name = 'return_condition')
BEGIN
    ALTER TABLE [dbo].[BorrowRequests] ADD [return_condition] NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[BorrowRequests]') AND name = 'admin_note')
BEGIN
    ALTER TABLE [dbo].[BorrowRequests] ADD [admin_note] NVARCHAR(MAX) NULL;
END

COMMIT TRANSACTION;
GO

