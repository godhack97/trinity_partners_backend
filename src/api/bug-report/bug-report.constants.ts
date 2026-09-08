export const BUG_REPORT_RECIPIENT = "B2B_test@trinity.ru";
export const BUG_REPORT_MAX_ATTACHMENTS = 5;
export const BUG_REPORT_MAX_FILE_SIZE = 15 * 1024 * 1024;
export const BUG_REPORT_MAX_TOTAL_SIZE = 15 * 1024 * 1024;

export const BUG_REPORT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
] as const;
