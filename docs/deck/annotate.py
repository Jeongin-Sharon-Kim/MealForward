"""Annotate real MealForward screenshots with reference-style callout boxes."""
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = os.path.dirname(os.path.abspath(__file__)) + "/assets"
FONT_PATH = ASSETS + "/NanumGothic.ttc"

RED = (225, 29, 72)
RED_BG = (255, 241, 243)
GREEN = (4, 120, 87)
GREEN_BG = (220, 245, 234)
BLUE = (29, 78, 216)
BLUE_BG = (239, 246, 255)
TEXT = (26, 24, 21)
WHITE = (255, 255, 255)

COLOR_MAP = {
    "red": (RED, RED_BG),
    "green": (GREEN, GREEN_BG),
    "blue": (BLUE, BLUE_BG),
}


def font(size, bold=False):
    return ImageFont.truetype(FONT_PATH, size, index=1 if bold else 0)


def wrap_text(draw, text, f, max_w):
    words = list(text)
    lines = []
    cur = ""
    for ch in text:
        test = cur + ch
        if draw.textlength(test, font=f) > max_w and cur:
            lines.append(cur)
            cur = ch
        else:
            cur = test
    if cur:
        lines.append(cur)
    return lines


def draw_callout(draw, box, color_name, header, body, header_size=15, body_size=13):
    x, y, w, h = box
    color, bg = COLOR_MAP[color_name]
    draw.rounded_rectangle([x, y, x + w, y + h], radius=10, fill=bg, outline=color, width=2)
    hf = font(header_size, bold=True)
    bf = font(body_size, bold=False)
    pad = 14
    ty = y + pad
    for line in header.split("\n"):
        draw.text((x + pad, ty), line, font=hf, fill=color)
        ty += header_size + 6
    ty += 2
    for para in body.split("\n"):
        for line in wrap_text(draw, para, bf, w - pad * 2):
            draw.text((x + pad, ty), line, font=bf, fill=TEXT)
            ty += body_size + 7


def draw_arrow(draw, p_from, p_to, color_name, width=3, dashed=False):
    color = COLOR_MAP[color_name][0]
    x1, y1 = p_from
    x2, y2 = p_to
    if dashed:
        import math
        dist = math.hypot(x2 - x1, y2 - y1)
        n = max(int(dist / 12), 1)
        for i in range(n):
            if i % 2 == 0:
                sx = x1 + (x2 - x1) * i / n
                sy = y1 + (y2 - y1) * i / n
                ex = x1 + (x2 - x1) * (i + 1) / n
                ey = y1 + (y2 - y1) * (i + 1) / n
                draw.line([sx, sy, ex, ey], fill=color, width=width)
    else:
        draw.line([x1, y1, x2, y2], fill=color, width=width)
    # arrowhead
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    ah = 10
    for da in (0.5, -0.5):
        hx = x2 - ah * math.cos(ang - da)
        hy = y2 - ah * math.sin(ang - da)
        draw.line([x2, y2, hx, hy], fill=color, width=width)


def build(src_name, out_name, pad, callouts, arrows, canvas_bg=(247, 248, 246)):
    src = Image.open(f"{ASSETS}/{src_name}.png").convert("RGB")
    sw, sh = src.size
    pl, pt, pr, pb = pad
    cw, ch = sw + pl + pr, sh + pt + pb
    canvas = Image.new("RGB", (cw, ch), canvas_bg)
    # subtle shadow behind screenshot
    shadow = Image.new("RGB", (sw + 16, sh + 16), (225, 224, 219))
    canvas.paste(shadow, (pl - 8, pt - 4))
    canvas.paste(src, (pl, pt))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([pl, pt, pl + sw, pt + sh], outline=(216, 212, 205), width=1)

    for a in arrows:
        draw_arrow(draw, (a[0] + pl, a[1] + pt) if a[4] else a[0], (a[2] + pl, a[3] + pt) if a[4] else a[2], a[5] if len(a) > 5 else "red", dashed=a[6] if len(a) > 6 else False)
    for c in callouts:
        draw_callout(draw, c["box"], c["color"], c["header"], c["body"], c.get("hs", 15), c.get("bs", 13))

    canvas.save(f"{ASSETS}/{out_name}.png")
    print("saved", out_name, canvas.size)


# ---------- 1. Login ----------
build(
    "login", "anno_login",
    pad=(40, 40, 420, 40),
    callouts=[
        {"box": (476 + 40, 300, 380, 120), "color": "red",
         "header": "POST /auth/login",
         "body": "{email, password, role} 전송 성공 시 세션 저장"},
        {"box": (476 + 40, 40, 380, 130), "color": "green",
         "header": "로그인 성공 -> 역할별 이동",
         "body": "role=user -> /dashboard.html\nrole=admin -> /admin.html"},
    ],
    arrows=[
        (188, 328, 476 + 40, 360, True, "red"),
        (218, 15, 476 + 40, 105, True, "green"),
    ],
)

# ---------- 2. Dashboard ----------
build(
    "dashboard", "anno_dashboard",
    pad=(40, 40, 430, 40),
    callouts=[
        {"box": (960 + 90, 40, 380, 110), "color": "red",
         "header": "GET /user/points",
         "body": "일반+이월 포인트 합계, 연간 소멸 예정일 반환"},
        {"box": (960 + 90, 180, 380, 110), "color": "red",
         "header": "GET /user/meal-balance",
         "body": "당월 잔액 · 이월여부 · 당월 소멸 예정일 반환"},
        {"box": (960 + 90, 320, 380, 150), "color": "green",
         "header": "1-Click 이월 신청 클릭",
         "body": "POST /user/rollover/apply 호출 후 위 두 카드 잔액이 같은 화면에서 즉시 갱신(화면 전환 없음). 이미 이월했으면 버튼 비활성화."},
    ],
    arrows=[
        (490, 150, 960 + 90, 95, True, "red"),
        (490, 340, 960 + 90, 235, True, "red"),
        (700, 480, 960 + 90, 395, True, "green"),
    ],
)

# ---------- 3. Store grid ----------
build(
    "store_grid", "anno_store_grid",
    pad=(40, 40, 420, 40),
    callouts=[
        {"box": (988 + 60, 40, 380, 150), "color": "green",
         "header": "GET /store/products?category=",
         "body": "isCashLike=true 상품에만 \"이월 포인트 결제 불가\" 배지 표시 · 카테고리 탭 클릭 시 그리드만 새로고침(화면 전환 없음)"},
    ],
    arrows=[
        (218, 385, 988 + 60, 100, True, "green"),
        (528, 385, 988 + 60, 150, True, "green"),
    ],
)

# ---------- 4. Store split checkout success ----------
build(
    "store_split", "anno_store_split",
    pad=(40, 40, 400, 40),
    callouts=[
        {"box": (410 + 40, 40, 360, 130), "color": "blue",
         "header": "결제 모달 (나눠서 결제)",
         "body": "현금성 자산(isCashLike)이면 이 탭 자체가 숨겨지고 일반 포인트로만 결제 가능하도록 제한됨"},
        {"box": (410 + 40, 190, 360, 140), "color": "red",
         "header": "POST /payments/checkout",
         "body": "{userId, itemName, generalAmount, flexiAmount} · flexiAmount>0일 때만 Guardrail AX 검증"},
    ],
    arrows=[
        (280, 105, 410 + 40, 105, True, "blue"),
        (200, 224, 410 + 40, 260, True, "red"),
    ],
)

# ---------- 5. Blocked / cash-like note ----------
build(
    "blocked1", "anno_blocked",
    pad=(40, 40, 380, 40),
    callouts=[
        {"box": (409 + 40, 60, 340, 170), "color": "blue",
         "header": "현금성 자산 결제 제한 안내",
         "body": "isCashLike=true 상품은 \"나눠서 결제\" 탭이 숨겨지고, 이 안내 문구와 함께 일반 복지 포인트 탭만 활성화됨"},
    ],
    arrows=[
        (200, 213, 409 + 40, 145, True, "blue"),
    ],
)

# ---------- 6. Admin KPI ----------
build(
    "admin_kpi", "anno_admin_kpi",
    pad=(40, 40, 40, 260),
    callouts=[
        {"box": (40, 687 + 40, 460, 130), "color": "red",
         "header": "GET /admin/settlements/summary",
         "body": "(userId, itemName) 조합당 최초 차단 1건만 집계해 AI 차단 건수 중복 카운팅 방지"},
        {"box": (520, 687 + 40, 460, 100), "color": "red",
         "header": "GET /admin/settlements/list",
         "body": "부서별/직원별 이월 포인트 현황 테이블"},
    ],
    arrows=[
        (175, 137, 260, 687 + 40, True, "red"),
        (480, 300, 700, 687 + 40, True, "red"),
    ],
)

# ---------- 7. Admin products table ----------
build(
    "admin_products", "anno_admin_products",
    pad=(40, 40, 40, 240),
    callouts=[
        {"box": (40, 589 + 40, 420, 100), "color": "red",
         "header": "GET /admin/products", "body": "복지 상품 전체 목록 조회"},
        {"box": (490, 589 + 40, 420, 130), "color": "green",
         "header": "수정 / 삭제 버튼",
         "body": "수정 -> 프리필된 모달 오픈 -> PUT /admin/products/{id}\n삭제 -> 확인 후 즉시 DELETE /admin/products/{id}"},
    ],
    arrows=[
        (300, 103, 250, 589 + 40, True, "red"),
        (771, 147, 700, 589 + 40, True, "green"),
    ],
)

# ---------- 8. Admin add form ----------
build(
    "admin_addform", "anno_addform",
    pad=(40, 40, 380, 40),
    callouts=[
        {"box": (975 + 40, 60, 340, 160), "color": "red",
         "header": "POST /admin/products",
         "body": "{name, category, price, isCashLike} · 카테고리 \"직접 입력...\" 선택 시 같은 폼에서 텍스트 입력창 노출(화면 전환 없음)"},
    ],
    arrows=[
        (93, 318, 975 + 40, 140, True, "red"),
    ],
)

# ---------- 9. Purchases refund modal ----------
build(
    "purchases_refund", "anno_purchases",
    pad=(40, 40, 40, 250),
    callouts=[
        {"box": (40, 489 + 40, 460, 100), "color": "green",
         "header": "GET /user/purchases",
         "body": "approval_status=APPROVED 건만 반환 (BLOCKED 시도는 목록 제외)"},
        {"box": (520, 489 + 40, 420, 140), "color": "blue",
         "header": "환불 확인 모달",
         "body": "\"환불을 원하십니까?\" + 결제에 사용한 포인트로만 환불되며 교차 환불 불가 안내를 고정 노출"},
    ],
    arrows=[
        (200, 160, 260, 489 + 40, True, "green"),
        (623, 396, 730, 489 + 40, True, "blue"),
    ],
)

print("ALL DONE")
