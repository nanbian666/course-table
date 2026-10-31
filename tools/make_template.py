#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成一张空的课程表 Excel 模板（带下拉选项和填写说明）。

用法：
    python tools/make_template.py
    python tools/make_template.py --out 我的课表.xlsx
"""

from __future__ import annotations

import argparse
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[1]

HEADERS = [
    ("课程名称", 22),
    ("教师", 12),
    ("地点", 16),
    ("星期", 8),
    ("开始节", 9),
    ("结束节", 9),
    ("上课周次", 20),
    ("单双周", 10),
]

# 【上课周次】列演示三种写法：连续、断开、单周
SAMPLES = [
    ["高等数学 A", "张老师", "教三-201", 1, 1, 2, "1-16", "全部"],
    ["大学英语", "李老师", "外语楼-305", 1, 3, 4, "1-16", "全部"],
    ["程序设计实验", "王老师", "机房 A-402", 4, 1, 2, "3-16", "单"],
    ["形势与政策", "周老师", "教一-203", 5, 9, 10, "2-3,5-9,11-17", "全部"],
]

HEAD_FILL = PatternFill("solid", fgColor="1F2A44")
HEAD_FONT = Font(color="FFFFFF", bold=True, size=11)
THIN = Side(style="thin", color="D6DCE8")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def build_sheet(wb: Workbook) -> None:
    ws = wb.active
    ws.title = "课程表"

    for col, (title, width) in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=col, value=title)
        cell.fill = HEAD_FILL
        cell.font = HEAD_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = BORDER
        ws.column_dimensions[get_column_letter(col)].width = width

    ws.row_dimensions[1].height = 24

    for r, row in enumerate(SAMPLES, start=2):
        for c, value in enumerate(row, start=1):
            cell = ws.cell(row=r, column=c, value=value)
            cell.border = BORDER
            cell.alignment = Alignment(
                horizontal="center" if c >= 4 else "left", vertical="center"
            )

    for r in range(len(SAMPLES) + 2, 40):
        for c in range(1, len(HEADERS) + 1):
            ws.cell(row=r, column=c).border = BORDER

    # 下拉选项，防止手抖填错
    day_dv = DataValidation(type="whole", operator="between", formula1=1, formula2=7,
                            allow_blank=True, showErrorMessage=True,
                            error="星期请填 1~7（1=周一，7=周日）")
    parity_dv = DataValidation(type="list", formula1='"全部,单,双"',
                               allow_blank=True, showErrorMessage=True,
                               error="单双周只能填：全部 / 单 / 双")
    ws.add_data_validation(day_dv)
    ws.add_data_validation(parity_dv)
    day_dv.add(f"D2:D{len(SAMPLES) + 40}")
    parity_dv.add(f"H2:H{len(SAMPLES) + 40}")

    ws.freeze_panes = "A2"


def build_help(wb: Workbook) -> None:
    ws = wb.create_sheet("填写说明")
    ws.column_dimensions["A"].width = 96

    lines = [
        ("课程表模板 · 填写说明", 16, True),
        ("", 11, False),
        ("1. 只改【课程表】这个 sheet，一行一门课。", 11, False),
        ("2. 星期：1=周一，2=周二 … 7=周日。", 11, False),
        ("3. 开始节 / 结束节：连上两节就写 1 和 2；一节课就写 3 和 3。", 11, False),
        ("4. 上课周次：", 11, True),
        ("      连着的：1-16        表示第 1 到 16 周都上", 11, False),
        ("      断开的：2-3,5-9,11-17   表示第 2-3 周、5-9 周、11-17 周", 11, False),
        ("      单周的：3            只上第 3 周", 11, False),
        ("      零散的：1,3,5,7      只上第 1、3、5、7 周", 11, False),
        ("      也认：第2-3周 / 2～3 / 2至3，中英文逗号都可以", 11, False),
        ("5. 单双周：每周都上填【全部】；隔周上填【单】或【双】。", 11, False),
        ("6. 同一门课一周上两次（比如周一和周四），就写两行。", 11, False),
        ("", 11, False),
        ("填完后运行：", 12, True),
        ("    python tools/excel_to_js.py --input 课程表模板.xlsx", 11, False),
        ("它会检查错误并生成 data/courses.js，刷新网页即可看到。", 11, False),
        ("", 11, False),
        ("提示：模板里的 4 行是示例，填之前先删掉或直接覆盖。", 11, False),
    ]

    for i, (text, size, bold) in enumerate(lines, start=1):
        cell = ws.cell(row=i, column=1, value=text)
        cell.font = Font(size=size, bold=bold)
        cell.alignment = Alignment(vertical="center", wrap_text=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="生成课程表 Excel 模板")
    parser.add_argument("--out", default=str(ROOT / "课程表模板.xlsx"),
                        help="输出文件路径（默认：项目根目录/课程表模板.xlsx）")
    args = parser.parse_args()

    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out

    wb = Workbook()
    build_sheet(wb)
    build_help(wb)
    wb.save(out)

    print(f"OK  模板已生成：{out}")
    print("    填好后运行： python tools/excel_to_js.py --input " + str(out.name))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())