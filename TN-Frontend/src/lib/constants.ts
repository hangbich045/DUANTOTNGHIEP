export const TASK_TYPES = [
  'Viết content',
  'Chụp & xử lý hình sự kiện',
  'Quay highlight',
  'Dựng clip highlight',
  'Quay clip TikTok',
  'Dựng clip TikTok',
  'Viết kịch bản',
  'MC bản tin',
  'Thư ký trường quay',
  'Quay phim',
  'Dựng phim',
  'Diễn viên',
  'Thiết kế',
  'Khác',
];

/**
 * Danh sách Cơ sở thuộc Trường Đại học Lạc Hồng:
 * Cơ sở 1, Cơ sở 2, Cơ sở 3, Cơ sở 5, Cơ sở 6 và Cơ sở Dược
 */
export const CAMPUSES = [
  'Cơ sở 1',
  'Cơ sở 2',
  'Cơ sở 3',
  'Cơ sở 5',
  'Cơ sở 6',
  'Cơ sở Dược',
];

/**
 * Kiểm tra loại công việc có thuộc các nhóm hiển thị trường Địa điểm thực hiện:
 * 1. Chụp ảnh (Chụp & xử lý hình sự kiện, ...)
 * 2. Quay phim, quay video (Quay phim, Quay highlight, Quay clip TikTok, ...)
 * 3. Diễn viên
 * 4. Khác
 */
export const requiresLocation = (taskType?: string | null): boolean => {
  if (!taskType) return false;
  const t = taskType.trim().toLowerCase();
  if (t.startsWith('chụp') || t.includes('chụp ảnh')) return true;
  if (t.startsWith('quay') || t.includes('quay phim') || t.includes('quay video')) return true;
  if (t === 'diễn viên' || t.includes('diễn viên')) return true;
  if (t === 'khác' || t.includes('khác')) return true;
  return false;
};
