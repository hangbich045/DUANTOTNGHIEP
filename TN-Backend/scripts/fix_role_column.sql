-- =========================================================================
-- MIGRATION SCRIPT: Khắc phục lỗi độ dài cột Users.role (Task 1.1)
-- Mô tả: Tăng độ dài cột role từ NVARCHAR(10) lên NVARCHAR(20) để lưu trữ
--        đầy đủ giá trị 'COLLABORATOR' (12 ký tự) mà không bị cắt chuỗi.
-- Database: TN_Database
-- Bảng: dbo.Users
-- =========================================================================

BEGIN TRANSACTION;

-- 1. Kiểm tra cấu trúc cột trước khi thay đổi
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'role';

-- 2. Thay đổi kiểu dữ liệu cột role lên NVARCHAR(20) NOT NULL
ALTER TABLE [dbo].[Users] 
ALTER COLUMN [role] NVARCHAR(20) NOT NULL;

-- 3. Kiểm tra lại cấu trúc sau khi cập nhật
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'role';

COMMIT TRANSACTION;
GO

