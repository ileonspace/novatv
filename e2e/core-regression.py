#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NovaTV 核心链路回归测试（Playwright E2E）
覆盖：登录 → 搜索 → 播放页初始化 → 收藏 → 收藏夹点击 → 播放
运行：python3 e2e/core-regression.py [base_url] [password]
环境：需系统安装 python playwright + Chrome（channel='chrome'）
"""
import asyncio
import sys

from playwright.async_api import async_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else 'test123'

PASS = 0
FAIL = 0


def check(name, condition, detail=''):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f'  ✅ {name}')
    else:
        FAIL += 1
        print(f'  ❌ {name} {detail}')


async def login(page):
    await page.goto(f'{BASE_URL}/', wait_until='domcontentloaded', timeout=30000)
    await page.wait_for_timeout(1500)
    if '/login' in page.url:
        pw = page.locator('#password')
        await pw.click(timeout=3000)
        await pw.press_sequentially(PASSWORD, delay=20)
        await page.wait_for_timeout(300)
        btn = page.locator('button[type=submit]')
        if await btn.count() and not await btn.first.is_disabled():
            await btn.first.click(timeout=5000)
        # 等待登录跳转（轮询最长 10 秒）
        for _ in range(20):
            await page.wait_for_timeout(500)
            if '/login' not in page.url:
                break
    return page.url


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome')
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await ctx.new_page()

        print('=== NovaTV 核心链路回归测试 ===')
        print(f'目标: {BASE_URL}')

        # 1. 登录
        url = await login(page)
        check('登录成功（返回首页）', '/' in url and '/login' not in url, f'URL={url}')

        # 2. 注入本地配置（无配置时搜索无结果）
        await page.evaluate("localStorage.setItem('novatv_config', '')")
        await page.goto(f'{BASE_URL}/search?q=%E6%88%98%E7%8B%BC', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(6000)
        content = await page.content()
        check('搜索页可访问', '搜索' in content or '合并显示' in content)

        # 3. 直接进入播放页（detail 路径，验证 detail 修复）
        await page.goto(f'{BASE_URL}/play?source=dyttzyapi.com&id=4873&title=%E6%88%98%E7%8B%BC&year=2015',
                        wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(8000)
        content = await page.content()
        has_art = 'artplayer' in content.lower()
        is_err = any(e in content for e in ['未找到匹配结果', '该片源暂无可用播放地址'])
        check('播放页播放器初始化', has_art, '')
        check('播放页无报错', not is_err, '')

        # 4. 收藏
        try:
            await page.locator('.lucide-heart').first.click(timeout=3000)
            await page.wait_for_timeout(1000)
            fav_count = await page.evaluate(
                "() => { const raw = localStorage.getItem('novatv_favorites'); return raw ? Object.keys(JSON.parse(raw)).length : 0; }"
            )
            check('收藏成功', fav_count >= 1, f'count={fav_count}')
        except Exception as e:
            check('收藏成功', False, str(e)[:60])

        # 5. 首页收藏夹 → 点击 → 播放
        await page.goto(f'{BASE_URL}/', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(2000)
        try:
            nb = page.locator('button', has_text='我知道了')
            if await nb.count() > 0:
                await nb.first.click(timeout=3000)
                await page.wait_for_timeout(500)
        except Exception:
            pass
        try:
            tab = page.locator('button', has_text='收藏夹')
            if await tab.count() > 0:
                await tab.first.click(timeout=5000)
                await page.wait_for_timeout(2500)
            cards = page.locator('span', has_text='战狼')
            print(f'  [诊断] 收藏夹战狼卡片数: {await cards.count()}')
            if await cards.count() > 0:
                await cards.first.click(timeout=8000)
                await page.wait_for_timeout(8000)
                content = await page.content()
                has_art = 'artplayer' in content.lower()
                is_err = any(e in content for e in ['未找到匹配结果', '该片源暂无可用播放地址'])
                check('收藏夹点击→播放器初始化', has_art, '')
                check('收藏夹点击→无报错', not is_err, '')
            else:
                check('收藏夹→播放链路', False, '收藏夹无战狼卡片')
        except Exception as e:
            check('收藏夹→播放链路', False, str(e)[:60])

        await browser.close()

    print(f'\n=== 结果: {PASS} 通过, {FAIL} 失败 ===')
    sys.exit(1 if FAIL > 0 else 0)


if __name__ == '__main__':
    asyncio.run(main())
