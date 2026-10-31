#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Excel 课程表转换成网页用的 data/courses.js。

用法：
    python tools/excel_to_js.py --input 课程表模板.xlsx
    python tools/excel_to_js.py --input 我的课表.xlsx --sheet Sheet1
    python tools/excel_to_js.py --input 课程表模板.xlsx --out data/courses.js

【上课周次】列怎么写：
    1-16              第 1 到 16 周，每周都上
    2-3,5-9,11-17     第 2-3 周、5-9 周、11-17 周（跳开第 4 周、10 周）
    3                 只上第 3 周
    1,3,5,7           只上第 1、3、5、7 周
    也认：第2-3周 / 2～3 / 2—3 / 2至3，中英文逗号都行

脚本会做三件事：
    1. 逐行校验（星期、节次、周次写错会指出是第几行）
    2. 检查同一时间是否撞课
    3. 生成 JS 文件
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "courses.js"

# 必须有的列
BASE_COLUMNS = ["课程名称", "教师", "地点", "星期", "开始节", "结束节", "单双周"]
# 周次的两种写法：新的单列【上课周次】，或旧的【起始周】+【结束周】
WEEKS_COLUMN = "上课周次"
LEGACY_COLUMNS = ["起始周", "结束周"]

PARITY_MAP = {
    "": "all", "全部": "all", "全": "all", "每周": "all", "all": "all", "无": "all",
    "单": "odd", "单周": "odd", "odd": "odd",
    "双": "even", "双周": "even", "even": "even",
}

SEPARATORS = re.compile(r"[,，、;；\s]+")
DASHES = ["-", "－", "—", "–", "~", "～", "至", "到"]


def to_number(value: Any) -> float | None:
    """把单元格的值转成数字，转不了返回 None。"""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def to_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value).strip()


def show(value: float | None) -> str:
    """打印用：3.0 显示成 3，None 显示成空。"""
    if value is None:
        return "空"
    return str(int(value)) if float(value).is_integer() else str(value)


def parse_weeks(text: str) -> list[list[int]] | None:
    """'2-3,5-9,11-17' → [[2,3],[5,9],[11,17]]；看不懂返回 None。"""
    cleaned = text.replace("第", "").replace("周", "").replace(" ", "").strip()
    if not cleaned:
        return None

    ranges: list[list[int]] = []
    for chunk in SEPARATORS.split(cleaned):
        if not chunk:
            continue

        left, right = chunk, chunk
        for dash in DASHES:
            if dash in chunk:
                left, right = chunk.split(dash, 1)
                break

        start, end = to_number(left), to_number(right)
        if start is None or end is None:
            return None

        start, end = int(start), int(end)
        if start < 1 or end < start or end > 60:
            return None

        ranges.append([start, end])

    return ranges or None


def ranges_overlap(a: list[list[int]], b: list[list[int]]) -> bool:
    return any(x[0] <= y[1] and y[0] <= x[1] for x in a for y in b)


def weeks_text(ranges: list[list[int]]) -> str:
    parts = [f"{a}" if a == b else f"{a}-{b}" for a, b in ranges]
    return "、".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description="Excel 课程表 → data/courses.js")
    parser.add_argument("--input", required=True, help="Excel 文件路径")
    parser.add_argument("--sheet", default="课程表", help="工作表名（默认：课程表）")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="输出的 js 文件路径")
    args = parser.parse_args()

    src = Path(args.input)
    if not src.is_absolute():
        src = ROOT / src
    if not src.exists():
        print(f"错误：找不到文件 {src}")
        return 1

    try:
        df = pd.read_excel(src, sheet_name=args.sheet, dtype=object)
    except ValueError:
        sheets = pd.ExcelFile(src).sheet_names
        print(f"错误：工作表【{args.sheet}】不存在，文件里有：{', '.join(sheets)}")
        return 1

    df.columns = [str(c).strip() for c in df.columns]

    if WEEKS_COLUMN in df.columns:
        use_weeks_column = True
    elif all(c in df.columns for c in LEGACY_COLUMNS):
        use_weeks_column = False
        print("提示：没找到【上课周次】列，改用【起始周】+【结束周】，这种写法只能表示连续周次。")
    else:
        print(f"错误：缺少【{WEEKS_COLUMN}】列（或者旧版的【起始周】【结束周】两列）。")
        print("   当前表头：" + "、".join(df.columns))
        return 1

    required = BASE_COLUMNS + ([WEEKS_COLUMN] if use_weeks_column else LEGACY_COLUMNS)
    missing = [c for c in required if c not in df.columns]
    if missing:
        print("错误：表头缺少这些列 " + "、".join(missing))
        print("   当前表头：" + "、".join(df.columns))
        return 1

    courses: list[dict[str, Any]] = []
    problems: list[str] = []

    for index, row in df.iterrows():
        excel_row = index + 2  # 表头占第 1 行
        name = to_text(row["课程名称"])
        if not name:
            continue

        day = to_number(row["星期"])
        start = to_number(row["开始节"])
        end = to_number(row["结束节"])
        parity_raw = to_text(row["单双周"])

        if day is None or int(day) not in range(1, 8):
            problems.append(f"第 {excel_row} 行：星期要填 1~7（当前：{to_text(row['星期']) or '空'}）")
            continue
        if start is None or end is None or start < 1 or end < start:
            problems.append(f"第 {excel_row} 行：开始节/结束节不对（当前：{show(start)} ~ {show(end)}）")
            continue
        if parity_raw not in PARITY_MAP:
            problems.append(f"第 {excel_row} 行：单双周只能填 全部/单/双（当前：{parity_raw}）")
            continue

        if use_weeks_column:
            raw_weeks = to_text(row[WEEKS_COLUMN])
            weeks = parse_weeks(raw_weeks)
            if weeks is None:
                problems.append(
                    f"第 {excel_row} 行：上课周次看不懂（当前：{raw_weeks or '空'}），"
                    "写成 1-16 或 2-3,5-9,11-17"
                )
                continue
        else:
            week_from = to_number(row[LEGACY_COLUMNS[0]])
            week_to = to_number(row[LEGACY_COLUMNS[1]])
            if week_from is None or week_to is None or week_from < 1 or week_to < week_from:
                problems.append(
                    f"第 {excel_row} 行：起始周/结束周不对"
                    f"（当前：{show(week_from)} ~ {show(week_to)}）"
                )
                continue
            weeks = [[int(week_from), int(week_to)]]

        courses.append({
            "name": name,
            "teacher": to_text(row["教师"]),
            "location": to_text(row["地点"]),
            "day": int(day),
            "startSection": int(start),
            "endSection": int(end),
            "weeks": weeks,
            "parity": PARITY_MAP[parity_raw],
        })

    if problems:
        print(f"错误：发现 {len(problems)} 处问题，先改好再生成：\n")
        for item in problems:
            print("   " + item)
        return 1

    if not courses:
        print("错误：一行课程都没读到，检查一下【课程名称】列是不是空的。")
        return 1

    # 撞课检查：同一天、节次重叠、周次也重叠
    warnings: list[str] = []
    for i in range(len(courses)):
        for j in range(i + 1, len(courses)):
            a, b = courses[i], courses[j]
            if a["day"] != b["day"]:
                continue
            if a["startSection"] > b["endSection"] or b["startSection"] > a["endSection"]:
                continue
            if not ranges_overlap(a["weeks"], b["weeks"]):
                continue
            warnings.append(
                f"{a['name']}（{weeks_text(a['weeks'])}）与 "
                f"{b['name']}（{weeks_text(b['weeks'])}）"
                f"在第 {a['day']} 天第 {max(a['startSection'], b['startSection'])} 节撞课"
            )

    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    body = json.dumps(courses, ensure_ascii=False, indent=2)
    out.write_text(
        "// 本文件由 tools/excel_to_js.py 自动生成，重新运行会覆盖手工修改。\n"
        f"// 生成时间：{stamp}　来源：{src.name}\n"
        "window.COURSE_LIST = " + body + ";\n",
        encoding="utf-8",
    )

    print(f"OK  已生成：{out}")
    print(f"    共 {len(courses)} 条课程记录，涉及 {len({c['name'] for c in courses})} 门课")

    if warnings:
        print(f"\n注意：有 {len(warnings)} 处撞课，确认一下是不是填错了：")
        for item in warnings:
            print("   " + item)

    print("\n打开 index.html（或刷新浏览器）就能看到新课表。")
    return 0


if __name__ == "__main__":
    sys.exit(main())