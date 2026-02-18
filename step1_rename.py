import os
import re
from datetime import datetime
from PIL import Image


# 视频格式不参与转 JPG
VIDEO_EXTENSIONS = (".mp4", ".mov", ".webm", ".avi", ".mkv")


# 将任意格式图片转为 JPG（保持原始文件名不含扩展名）
def convert_to_jpg(file_path):
    image = Image.open(file_path)
    rgb_image = image.convert("RGB")
    new_path = os.path.splitext(file_path)[0] + ".jpg"
    rgb_image.save(new_path, "JPEG")
    os.remove(file_path)
    return new_path


# 从文件名中解析出 (标准日期字符串, 序号整数)
# 期望文件名形如：2025-01-02_1 或 2025-1-2_3 等
def get_date_and_id_from_filename(filename):
    """
    支持示例：
    - 2025-01-02_1.jpg
    - 2025-1-2_3.png
    - 2025.01.02-10.jpeg  （分隔符可以是 - . _，日期后面跟 _ 或 - + id）
    """
    name, _ = os.path.splitext(filename)

    # 匹配：YYYY-M-D_xxx 或 YYYY.M.D-xxx 等
    # 分隔符：- . _
    # 日期和 id 之间：_ 或 -
    m = re.match(r'^(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})[_-](\d+)$', name)
    if not m:
        return None, None

    year, month, day, id_str = m.groups()
    try:
        year_i = int(year)
        month_i = int(month)
        day_i = int(day)
        id_i = int(id_str)
        dt = datetime(year_i, month_i, day_i)
    except ValueError:
        return None, None

    # 统一日期格式为 YYYY-MM-DD
    date_str = dt.strftime("%Y-%m-%d")
    return date_str, id_i


def rename_images(order_asc=True):
    """
    逻辑：
    1. 只依赖文件名中的日期+id，不再读 EXIF 或修改时间；
    2. 期望原始命名形如：2025-01-02_1.xxx（你手动改好即可）；
    3. 统一输出为：2025-01-02_001.jpg 这种形式。
    order_asc=True  : 时间从早到晚（日期小的在前）；
    order_asc=False : 从晚到早。
    """
    folder_path = "images"
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    file_list = os.listdir(folder_path)

    # 1. 先把非 jpg 统一转成 jpg（保持原有“日期+id”的基本名字）
    for filename in file_list:
        low = filename.lower()
        if low.endswith(".jpg") or low.endswith(VIDEO_EXTENSIONS):
            continue
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            try:
                new_path = convert_to_jpg(file_path)
                print(f"Converted {filename} -> {os.path.basename(new_path)}")
            except Exception as e:
                print(f"Failed to convert {filename} to JPG: {e}")

    # 2. 收集所有 jpg，并从文件名中解析日期和 id
    file_list = os.listdir(folder_path)
    media_extensions = (".jpg", ".jpeg") + VIDEO_EXTENSIONS
    media_files = [
        f for f in file_list
        if os.path.isfile(os.path.join(folder_path, f))
        and f.lower().endswith(media_extensions)
    ]

    media_info = []   # (原文件名, 日期字符串, id整数, 扩展名)
    skipped_files = []  # 无法解析的文件名

    for filename in media_files:
        date_str, idx = get_date_and_id_from_filename(filename)
        if date_str is None or idx is None:
            skipped_files.append(filename)
            continue
        ext = os.path.splitext(filename)[1].lower()
        media_info.append((filename, date_str, idx, ext))

    if skipped_files:
        print("Warning: 以下文件名未能解析为 '日期+id'，不会被重命名：")
        for f in skipped_files:
            print("  -", f)

    if not media_info:
        print("没有符合“日期+id”命名规则的图片，无需重命名。")
        return

    # 3. 按 (日期, id) 排序
    # order_asc=True 时：日期从早到晚，id 从小到大
    media_info.sort(
        key=lambda x: (x[1], x[2]),
        reverse=not order_asc
    )

    # 4. 先全部改成临时名，避免冲突
    temp_records = []  # (临时名, 最终日期字符串, 最终序号id)

    for i, (original_name, date_str, idx, ext) in enumerate(media_info):
        src = os.path.join(folder_path, original_name)
        temp_name = f"__tmp__{i}{ext}"
        temp_dst = os.path.join(folder_path, temp_name)

        os.rename(src, temp_dst)
        temp_records.append((temp_name, date_str, idx, ext))
        print(f"Stage 1: {original_name} -> {temp_name} (date={date_str}, id={idx})")

    # 5. 再从临时名改成最终名：YYYY-MM-DD_XXX.jpg 或 YYYY-MM-DD_XXX.mp4
    used_final_names = set()

    for temp_name, date_str, idx, ext in temp_records:
        temp_src = os.path.join(folder_path, temp_name)

        # 标准形式：YYYY-MM-DD_001.jpg 或 YYYY-MM-DD_001.mp4
        base_final_name = f"{date_str}_{idx:03d}{ext}"
        final_name = base_final_name
        attempt = 1

        # 如果碰巧已经存在同名文件（极少数情况），加后缀避免覆盖
        while final_name in used_final_names or os.path.exists(os.path.join(folder_path, final_name)):
            attempt += 1
            name_part = f"{date_str}_{idx:03d}_{attempt}{ext}"
            final_name = name_part

        used_final_names.add(final_name)
        final_dst = os.path.join(folder_path, final_name)

        os.rename(temp_src, final_dst)
        print(f"Stage 2: {temp_name} -> {final_name}")

    print("Renaming completed! (YYYY-MM-DD_XXX.jpg / .mp4)")


if __name__ == "__main__":
    # True: 按日期从早到晚；False: 从晚到早
    order_asc = True
    rename_images(order_asc)