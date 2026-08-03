/**
 * URL 安全校验（防 SSRF）
 * 拒绝：非 http/https 协议、localhost、回环/私网/链路本地/云元数据地址段
 */

function isIpv4(s: string): number[] | null {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isPrivateIpv4(nums: number[]): boolean {
  const [a, b] = nums;
  if (a === 127) return true; // 127.0.0.0/8 回环
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16（云元数据）
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

function isUnsafeIpv6(host: string): boolean {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1') return true; // IPv6 回环
  if (lower.startsWith('fe80')) return true; // 链路本地
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // 唯一本地
  return false;
}

// 常见 DNS 重绑定服务后缀（将 IP 伪装成域名子域，绕过字面 IP 拦截）
const DNS_REBIND_SUFFIXES = [
  'nip.io',
  'sslip.io',
  'xip.io',
  'loca.lt',
  'localtest.me',
  'vcap.me',
];

/**
 * 检测 DNS 重绑定伪装：
 * 1. hostname 中内嵌 IPv4 片段（如 127.0.0.1.nip.io → 段含连续 4 个 0-255 数字）
 * 2. hostname 以已知重绑定服务后缀结尾
 * 返回 true 表示存在重绑定风险
 */
function isDnsRebindingRisk(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\.$/, '');

  // 后缀检测
  if (DNS_REBIND_SUFFIXES.some((s) => lower === s || lower.endsWith('.' + s))) {
    return true;
  }

  // 内嵌 IPv4 检测：任取连续 4 段，若都是 0-255 数字 → 是 IP 伪装成域名
  const parts = lower.split('.');
  for (let i = 0; i <= parts.length - 4; i++) {
    const slice = parts.slice(i, i + 4);
    if (slice.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
      return true;
    }
  }
  return false;
}

export function isSafeUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

    const hostname = u.hostname.toLowerCase().replace(/\.$/, '');
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;

    // DNS 重绑定防护：内嵌 IP 或已知重绑定后缀 → 拒绝
    if (isDnsRebindingRisk(hostname)) return false;

    // IPv4 字面量
    const ipv4 = isIpv4(hostname);
    if (ipv4) return !isPrivateIpv4(ipv4);

    // IPv6
    if (hostname.includes(':')) return !isUnsafeIpv6(hostname);

    return true;
  } catch {
    return false;
  }
}
