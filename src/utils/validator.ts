/**
 * 表单校验工具
 */

/** 校验手机号 */
export const isMobile = (phone: string | undefined | null): boolean => {
  return /^1[3-9]\d{9}$/.test(String(phone || ''))
}

/** 校验邮箱 */
export const isEmail = (email: string | undefined | null): boolean => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email || ''))
}

/** 校验短信验证码（6 位数字） */
export const isSmsCode = (code: string | undefined | null): boolean => {
  return /^\d{6}$/.test(String(code || ''))
}

/** 校验非空 */
export const isNotEmpty = (value: string | undefined | null): boolean => {
  return String(value || '').trim().length > 0
}

/** 校验金额（正数，最多两位小数） */
export const isAmount = (value: string | number | undefined | null): boolean => {
  return /^\d+(\.\d{1,2})?$/.test(String(value || '')) && Number(value) > 0
}

/** 校验 UUID 格式 */
export const isUUID = (value: string | undefined | null): boolean => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(value || ''))
}
